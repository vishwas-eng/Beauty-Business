/**
 * Sheet Master API — AI-powered universal sheet analyzer
 *
 * POST /api/sheet-master/analyze  → AI analyzes sheet structure
 * POST /api/sheet-master/sync     → sync a registered sheet
 * GET  /api/sheet-master/list     → list all connected sheets (from query param registry)
 */

const GOOGLE_KEY   = process.env.GOOGLE_SHEETS_API_KEY;
const GROQ_KEY     = process.env.GROQ_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// ── Fetch raw sheet data ──────────────────────────────────────────────────────
async function fetchSheetData(sheetId, tabName, maxRows = 20) {
  if (!GOOGLE_KEY) throw new Error("GOOGLE_SHEETS_API_KEY not set");
  const tab   = (tabName || "Sheet1").trim();
  const range = encodeURIComponent(`${tab}!A1:Z${maxRows + 1}`);
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${GOOGLE_KEY}`;
  const res   = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets API error ${res.status}: ${JSON.parse(err)?.error?.message || err}`);
  }
  const data = await res.json();
  const rows = data.values || [];
  if (rows.length < 1) throw new Error("Sheet is empty or tab not found");

  const headers = rows[0].map(h => String(h || "").trim());
  const sample  = rows.slice(1, maxRows + 1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = String(row[i] || "").trim(); });
    return obj;
  });

  return { headers, sample, totalRows: rows.length - 1 };
}

// ── AI Brain: analyze sheet and return structured mapping ─────────────────────
async function analyzeWithAI(sheetId, tabName, headers, sample) {
  if (!GROQ_KEY) throw new Error("GROQ_API_KEY not set");

  const prompt = `You are an expert data analyst. Analyze this Google Sheet and return a structured JSON mapping.

SHEET INFO:
- Sheet ID: ${sheetId}
- Tab: ${tabName}
- Headers: ${JSON.stringify(headers)}
- Sample rows (first 5): ${JSON.stringify(sample.slice(0, 5), null, 2)}

YOUR TASK:
1. Identify what type of data this sheet contains
2. Map each column to a semantic field
3. Suggest which Lumara module this data belongs to

LUMARA MODULES:
- "pipeline" → brand deal tracking (brand name, status, market, stage, dates)
- "inventory" → stock management (SKU, product, quantity, cost, days of supply)
- "sales" → revenue data (SKU, sales qty, revenue, channel, date)
- "suppliers" → supplier info (name, contact, lead time, MOQ, payment terms)
- "marketing" → campaign data (campaign, spend, impressions, channel, date)
- "financials" → P&L data (revenue, cost, margin, period, category)
- "contacts" → people/companies (name, email, company, role, status)
- "custom" → other data that doesn't fit above categories

Respond ONLY with valid JSON in this exact format:
{
  "dataType": "pipeline|inventory|sales|suppliers|marketing|financials|contacts|custom",
  "confidence": 0.0-1.0,
  "summary": "One sentence describing what this sheet contains",
  "targetModule": "Dashboard|Inventory|Revenue|Research Lab|Brand 360|Custom",
  "columnMappings": [
    {
      "originalColumn": "exact header name from sheet",
      "semanticField": "what this field means (e.g. brand_name, status, quantity_on_hand)",
      "dataType": "text|number|date|boolean|currency|percentage",
      "importance": "primary|secondary|metadata"
    }
  ],
  "primaryKeyColumns": ["column that uniquely identifies a row"],
  "insights": ["2-3 key observations about this data"],
  "suggestedActions": ["2-3 specific actions Lumara can take with this data"]
}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2000,
      temperature: 0.1,
      messages: [
        { role: "system", content: "You are a data mapping expert. Always respond with valid JSON only. No markdown, no explanation outside the JSON." },
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${err}`);
  }

  const data    = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI returned invalid response");

  return JSON.parse(jsonMatch[0]);
}

// ── Sync sheet data into Supabase based on data type ─────────────────────────
async function syncToSupabase(sheetId, tabName, dataType, columnMappings, allRows) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase not configured");

  const getField = (row, semanticField) => {
    const mapping = columnMappings.find(m => m.semanticField === semanticField);
    if (!mapping) return "";
    return String(row[mapping.originalColumn] || "").trim();
  };

  const workspaceId = "00000000-0000-0000-0000-000000000001";
  let endpoint = "";
  let records  = [];

  if (dataType === "pipeline") {
    endpoint = "analytics_records";
    records  = allRows.filter(r => {
      const brand = getField(r, "brand_name") || getField(r, "brand") || Object.values(r)[0];
      return brand;
    }).map((row, i) => {
      const brand = getField(row, "brand_name") || getField(row, "brand") || Object.values(row)[0];
      const market = getField(row, "launch_market") || getField(row, "market") || "Global";
      return {
        workspace_id:     workspaceId,
        source_row_hash:  `${sheetId}-${tabName}-${brand}-${market}-${i}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        date:             new Date().toISOString().split("T")[0],
        sku:              `${brand}-${market}`.toLowerCase().replace(/\s+/g, "-"),
        product_name:     brand,
        category:         getField(row, "category") || "Uncategorized",
        brand:            brand,
        channel:          market,
        sales_qty:        0,
        sales_amount:     0,
        returns_qty:      0,
        inventory_on_hand:0,
        cost_amount:      0,
        discount_amount:  0,
      };
    });
  } else if (dataType === "inventory") {
    endpoint = "inventory_snapshots";
    records  = allRows.filter(r => getField(r, "sku") || getField(r, "product_name")).map((row, i) => ({
      workspace_id:       workspaceId,
      snapshot_date:      new Date().toISOString().split("T")[0],
      sku:                getField(row, "sku") || `SKU-${i}`,
      product_name:       getField(row, "product_name") || getField(row, "product") || `Product ${i}`,
      category:           getField(row, "category") || "Uncategorized",
      brand:              getField(row, "brand") || "Unknown",
      channel:            getField(row, "channel") || "All",
      quantity_on_hand:   parseInt(getField(row, "quantity_on_hand") || "0") || 0,
      quantity_reserved:  parseInt(getField(row, "quantity_reserved") || "0") || 0,
      quantity_available: parseInt(getField(row, "quantity_available") || "0") || 0,
      unit_cost:          parseFloat(getField(row, "unit_cost") || "0") || 0,
      total_value:        parseFloat(getField(row, "total_value") || "0") || 0,
    }));
  } else if (dataType === "sales") {
    endpoint = "sales_history";
    records  = allRows.filter(r => getField(r, "sku") || getField(r, "product_name")).map((row, i) => ({
      workspace_id:   workspaceId,
      sale_date:      getField(row, "date") || new Date().toISOString().split("T")[0],
      sku:            getField(row, "sku") || `SKU-${i}`,
      product_name:   getField(row, "product_name") || `Product ${i}`,
      category:       getField(row, "category") || "Uncategorized",
      brand:          getField(row, "brand") || "Unknown",
      channel:        getField(row, "channel") || "All",
      quantity_sold:  parseInt(getField(row, "quantity_sold") || getField(row, "sales_qty") || "0") || 0,
      revenue:        parseFloat(getField(row, "revenue") || getField(row, "sales_amount") || "0") || 0,
      unit_price:     parseFloat(getField(row, "unit_price") || "0") || 0,
      promotion_flag: false,
      is_holiday:     false,
    }));
  } else if (dataType === "suppliers") {
    endpoint = "suppliers";
    records  = allRows.filter(r => getField(r, "supplier_name") || getField(r, "name")).map((row) => ({
      workspace_id:      workspaceId,
      name:              getField(row, "supplier_name") || getField(row, "name") || "Unknown",
      contact_email:     getField(row, "email") || getField(row, "contact_email") || null,
      contact_phone:     getField(row, "phone") || getField(row, "contact_phone") || null,
      lead_time_days:    parseInt(getField(row, "lead_time_days") || getField(row, "lead_time") || "0") || null,
      minimum_order_qty: parseInt(getField(row, "minimum_order_qty") || getField(row, "moq") || "0") || null,
      payment_terms:     getField(row, "payment_terms") || null,
      rating:            parseFloat(getField(row, "rating") || "0") || null,
      active:            true,
      metadata:          {},
    }));
  } else {
    // Custom / unknown — store as analytics_records with raw data
    endpoint = "analytics_records";
    records  = allRows.slice(0, 100).map((row, i) => ({
      workspace_id:     workspaceId,
      source_row_hash:  `${sheetId}-${tabName}-custom-${i}`,
      date:             new Date().toISOString().split("T")[0],
      sku:              `${sheetId}-${i}`,
      product_name:     Object.values(row)[0] || `Row ${i}`,
      category:         "Custom",
      brand:            tabName,
      channel:          "Custom",
      sales_qty:        0,
      sales_amount:     0,
      returns_qty:      0,
      inventory_on_hand:0,
      cost_amount:      0,
      discount_amount:  0,
    }));
  }

  if (records.length === 0) return 0;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer":        "resolution=merge-duplicates",
    },
    body: JSON.stringify(records),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Supabase sync error:", err);
    // Don't throw — partial success is ok
    return 0;
  }

  return records.length;
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const body     = req.body || {};
  const action   = body.action || req.query.action || "analyze";
  const sheetId  = (body.sheetId  || "").trim();
  const tabName  = (body.tabName  || "Sheet1").trim();
  const mappings = body.columnMappings || [];
  const dataType = body.dataType || "custom";

  if (!sheetId) return res.status(400).json({ ok: false, error: "sheetId is required" });

  try {
    // ── ANALYZE ──────────────────────────────────────────────────────────────
    if (action === "analyze") {
      const { headers, sample, totalRows } = await fetchSheetData(sheetId, tabName, 20);
      const analysis = await analyzeWithAI(sheetId, tabName, headers, sample);

      return res.status(200).json({
        ok:        true,
        sheetId,
        tabName,
        totalRows,
        headers,
        sampleRows: sample.slice(0, 3),
        analysis,
      });
    }

    // ── SYNC ─────────────────────────────────────────────────────────────────
    if (action === "sync") {
      const { sample } = await fetchSheetData(sheetId, tabName, 2000);
      const synced     = await syncToSupabase(sheetId, tabName, dataType, mappings, sample);

      return res.status(200).json({
        ok:       true,
        message:  `Synced ${synced} rows from "${tabName}" as ${dataType} data`,
        rowCount: synced,
        syncedAt: new Date().toISOString(),
      });
    }

    return res.status(400).json({ ok: false, error: `Unknown action: ${action}` });

  } catch (err) {
    console.error("sheet-master error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

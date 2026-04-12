/**
 * Data Studio API — AI-powered universal data ingestion
 *
 * POST /api/data-studio/analyze  → AI analyzes rows & returns mapping
 * POST /api/data-studio/import   → Import mapped rows (update dashboard data)
 * POST /api/data-studio/fetch-sheet → Fetch Google Sheet rows server-side
 */

const GROQ_KEY   = process.env.GROQ_API_KEY;
const GOOGLE_KEY = process.env.GOOGLE_SHEETS_API_KEY;

// ── Standard schema targets the AI maps to ────────────────────────────────────
const SCHEMA_TARGETS = {
  pipeline: {
    fields: ["brand_name","category","segment","market","status","stage","quadrant","company",
             "source_country","discussion_start_date","next_steps","hold_reason","notes"],
    description: "Brand deal/partnership tracking pipeline"
  },
  sales: {
    fields: ["date","sku","product_name","brand","category","channel","quantity_sold","revenue",
             "unit_price","discount","returns","cost"],
    description: "Sales transactions or revenue records"
  },
  inventory: {
    fields: ["sku","product_name","brand","category","channel","quantity_on_hand","quantity_reserved",
             "unit_cost","total_value","reorder_point","supplier","warehouse"],
    description: "Stock levels and inventory snapshots"
  },
  contacts: {
    fields: ["name","email","company","role","phone","market","status","notes","last_contact_date"],
    description: "People, contacts, or company directory"
  },
  finance: {
    fields: ["period","category","revenue","cost","gross_margin","opex","ebitda","brand","market"],
    description: "Financial P&L or budget data"
  },
  marketing: {
    fields: ["campaign","channel","spend","impressions","clicks","conversions","date","brand","market"],
    description: "Marketing campaign performance"
  },
  suppliers: {
    fields: ["supplier_name","contact_email","contact_phone","lead_time_days","moq",
             "payment_terms","rating","category","brand","country"],
    description: "Supplier or vendor records"
  },
  custom: {
    fields: [],
    description: "Other / custom data that doesn't fit standard categories"
  }
};

// ── AI-powered sheet analysis ─────────────────────────────────────────────────
async function analyzeWithAI(headers, sampleRows, sourceName) {
  if (!GROQ_KEY) {
    // Fallback: rule-based detection
    return ruleBasedAnalysis(headers, sampleRows);
  }

  const prompt = `You are a data analyst. Analyze this spreadsheet and return a JSON mapping.

SOURCE: "${sourceName}"
HEADERS (${headers.length} columns): ${JSON.stringify(headers)}
SAMPLE ROWS (first 3):
${JSON.stringify(sampleRows.slice(0, 3), null, 2)}

TASK:
1. Detect what type of data this is
2. Map EVERY column to a semantic field
3. Detect data quality issues

SCHEMA TYPES available:
${Object.entries(SCHEMA_TARGETS).map(([k,v]) => `- "${k}": ${v.description} → fields: ${v.fields.slice(0,6).join(", ")}...`).join("\n")}

Respond ONLY with valid JSON (no markdown):
{
  "dataType": "pipeline|sales|inventory|contacts|finance|marketing|suppliers|custom",
  "confidence": 0.0-1.0,
  "summary": "One sentence: what is this sheet?",
  "targetModule": "Dashboard|Revenue Suite|Inventory|Research Lab|Custom",
  "columnMappings": [
    {
      "originalColumn": "exact header from sheet",
      "semanticField": "snake_case field name from the schema above",
      "dataType": "text|number|date|boolean|currency|percentage|email|phone",
      "importance": "primary|secondary|metadata",
      "sampleValue": "example value from the data",
      "issue": "optional: describe any quality issue with this column or null"
    }
  ],
  "qualityIssues": [
    { "type": "missing_values|duplicates|bad_format|inconsistent|other", "column": "col name", "detail": "description", "rowCount": 0 }
  ],
  "suggestedActions": ["2-3 specific things Lumara can do with this data"],
  "primaryKeyColumns": ["columns that uniquely identify a row"]
}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 3000,
      temperature: 0.1,
      messages: [
        { role: "system", content: "You are a data mapping expert. Respond with valid JSON only. No markdown." },
        { role: "user",   content: prompt }
      ]
    })
  });

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data    = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  const match   = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned invalid JSON");
  return JSON.parse(match[0]);
}

// ── Rule-based fallback analysis ──────────────────────────────────────────────
function ruleBasedAnalysis(headers, sampleRows) {
  const h = headers.map(x => x.toLowerCase().replace(/[\s\-\/]+/g, "_"));

  let dataType = "custom";
  let confidence = 0.5;

  if (h.some(x => ["brand","brand_name"].includes(x)) && h.some(x => ["status","stage"].includes(x))) {
    dataType = "pipeline"; confidence = 0.85;
  } else if (h.some(x => ["sku","sales","revenue","quantity_sold"].includes(x))) {
    dataType = "sales"; confidence = 0.8;
  } else if (h.some(x => ["quantity_on_hand","inventory","stock"].includes(x))) {
    dataType = "inventory"; confidence = 0.8;
  } else if (h.some(x => ["email","contact","phone"].includes(x))) {
    dataType = "contacts"; confidence = 0.75;
  } else if (h.some(x => ["campaign","spend","impressions"].includes(x))) {
    dataType = "marketing"; confidence = 0.8;
  } else if (h.some(x => ["supplier","vendor","lead_time"].includes(x))) {
    dataType = "suppliers"; confidence = 0.8;
  }

  const schemaFields = SCHEMA_TARGETS[dataType]?.fields || [];

  const columnMappings = headers.map(orig => {
    const normalized = orig.toLowerCase().replace(/[\s\-\/]+/g, "_");
    const match = schemaFields.find(f => f === normalized || f.includes(normalized) || normalized.includes(f.replace(/_/g, "")));
    return {
      originalColumn: orig,
      semanticField: match || normalized,
      dataType: "text",
      importance: match ? "primary" : "metadata",
      sampleValue: sampleRows[0]?.[orig] || "",
      issue: null
    };
  });

  return {
    dataType,
    confidence,
    summary: `Detected as ${dataType} data with ${headers.length} columns and ${sampleRows.length} rows.`,
    targetModule: dataType === "pipeline" ? "Dashboard" : dataType === "sales" ? "Revenue Suite" : "Custom",
    columnMappings,
    qualityIssues: [],
    suggestedActions: [`Import ${sampleRows.length} rows into the ${dataType} pipeline`],
    primaryKeyColumns: [headers[0]]
  };
}

// ── Quality scanner ───────────────────────────────────────────────────────────
function scanQuality(headers, rows) {
  const issues = [];
  const stats  = {};

  for (const col of headers) {
    const vals    = rows.map(r => r[col]);
    const empty   = vals.filter(v => !v || String(v).trim() === "").length;
    const unique  = new Set(vals.map(v => String(v).trim().toLowerCase())).size;

    stats[col] = { total: vals.length, empty, unique, fill: Math.round((1 - empty / vals.length) * 100) };

    if (empty > rows.length * 0.3) {
      issues.push({ type: "missing_values", column: col, detail: `${empty} of ${rows.length} rows are empty (${Math.round(empty/rows.length*100)}%)`, rowCount: empty });
    }
    if (unique === 1 && rows.length > 5) {
      issues.push({ type: "inconsistent", column: col, detail: `All rows have the same value "${vals[0]}" — may not be useful`, rowCount: rows.length });
    }
  }

  // Check for likely duplicates using first 2 columns
  if (headers.length >= 2) {
    const keys = new Set();
    let dupes  = 0;
    for (const row of rows) {
      const k = `${row[headers[0]]}||${row[headers[1]]}`;
      if (keys.has(k)) dupes++;
      keys.add(k);
    }
    if (dupes > 0) {
      issues.push({ type: "duplicates", column: `${headers[0]} + ${headers[1]}`, detail: `${dupes} potentially duplicate rows detected`, rowCount: dupes });
    }
  }

  return { issues, stats };
}

// ── Fetch Google Sheet rows ───────────────────────────────────────────────────
async function fetchSheetRows(sheetId, tabName, maxRows = 500) {
  if (!GOOGLE_KEY) throw new Error("GOOGLE_SHEETS_API_KEY not configured");
  const tab   = (tabName || "Sheet1").trim();
  const range = encodeURIComponent(`${tab}!A1:AZ${maxRows + 1}`);
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${GOOGLE_KEY}`;
  const res   = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    let msg = `Google Sheets error ${res.status}`;
    try { msg = JSON.parse(err)?.error?.message || msg; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  const raw  = data.values || [];
  if (raw.length < 2) throw new Error("Sheet appears empty or tab not found");

  const headers = raw[0].map(h => String(h || "").trim());
  const rows    = raw.slice(1, maxRows + 1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = String(row[i] || "").trim(); });
    return obj;
  }).filter(r => Object.values(r).some(v => v));

  return { headers, rows };
}

// ── Get available tabs for a sheet ───────────────────────────────────────────
async function getSheetTabs(sheetId) {
  if (!GOOGLE_KEY) throw new Error("GOOGLE_SHEETS_API_KEY not configured");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${GOOGLE_KEY}&fields=sheets.properties.title`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Cannot access sheet: ${res.status}`);
  const data = await res.json();
  return (data.sheets || []).map(s => s.properties.title);
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const body   = req.body || {};
  const action = body.action || req.query.action || "analyze";

  try {
    // ── FETCH SHEET (get tabs + rows from Google Sheet) ───────────────────────
    if (action === "fetch-sheet") {
      const { sheetId, tabName } = body;
      if (!sheetId) return res.status(400).json({ ok: false, error: "sheetId required" });

      // If no tabName, return available tabs
      if (!tabName) {
        const tabs = await getSheetTabs(sheetId);
        return res.status(200).json({ ok: true, tabs });
      }

      const { headers, rows } = await fetchSheetRows(sheetId, tabName, 500);
      return res.status(200).json({ ok: true, headers, rows, totalRows: rows.length });
    }

    // ── ANALYZE (AI mapping from any source) ──────────────────────────────────
    if (action === "analyze") {
      const { headers, rows, sourceName } = body;
      if (!headers || !rows) return res.status(400).json({ ok: false, error: "headers and rows required" });

      const [analysis, quality] = await Promise.all([
        analyzeWithAI(headers, rows, sourceName || "Unknown source"),
        Promise.resolve(scanQuality(headers, rows))
      ]);

      // Merge quality issues from AI + scanner
      const allIssues = [...(analysis.qualityIssues || []), ...quality.issues];
      const seen      = new Set();
      const dedupedIssues = allIssues.filter(i => {
        const k = `${i.type}::${i.column}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      return res.status(200).json({
        ok: true,
        analysis: { ...analysis, qualityIssues: dedupedIssues },
        quality:  quality.stats,
        rowCount: rows.length,
        headers,
        sampleRows: rows.slice(0, 5),
      });
    }

    // ── IMPORT (store catalog entry + return success) ─────────────────────────
    if (action === "import") {
      // In production this would write to Supabase.
      // For now we return the import summary so the frontend can store it locally.
      const { dataType, rows, columnMappings, sourceName, sourceType } = body;
      if (!rows || !Array.isArray(rows)) return res.status(400).json({ ok: false, error: "rows required" });

      const importedAt = new Date().toISOString();
      const rowCount   = rows.length;

      return res.status(200).json({
        ok:         true,
        rowCount,
        dataType,
        sourceName,
        sourceType,
        importedAt,
        message:    `Successfully imported ${rowCount} rows as ${dataType} data from "${sourceName}"`,
      });
    }

    return res.status(400).json({ ok: false, error: `Unknown action: ${action}` });

  } catch (err) {
    console.error("data-studio error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

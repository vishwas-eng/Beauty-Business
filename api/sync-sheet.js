/**
 * GET  /api/sync-sheet          → fetch + return sheet data (preview)
 * POST /api/sync-sheet          → fetch sheet + upsert into Supabase
 */

const SHEET_ID   = process.env.GOOGLE_SHEET_ID   || "1J0zCJYMLfTMwaUxECAzd5EVvhgSqQjkOBERNleUJAVg";
const SHEET_TAB  = process.env.GOOGLE_SHEET_TAB  || "Sheet1";
const GOOGLE_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const SUPABASE_URL  = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = process.env.VITE_SUPABASE_ANON_KEY;

// ── Fetch raw rows from Google Sheets ────────────────────────────────────────
async function fetchSheet() {
  if (!GOOGLE_KEY) throw new Error("GOOGLE_SHEETS_API_KEY not set");

  const range   = encodeURIComponent(`${SHEET_TAB}!A1:Z1000`);
  const url     = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${GOOGLE_KEY}`;
  const res     = await fetch(url);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const rows = data.values || [];
  if (rows.length < 2) return { headers: [], rows: [] };

  const headers = rows[0].map(h => String(h).trim().toLowerCase().replace(/\s+/g, "_"));
  const records = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
    return obj;
  });

  return { headers, rows: records };
}

// ── Normalize a sheet row into our pipeline format ───────────────────────────
function normalizeRow(row, idx) {
  // Try common column name variations
  const get = (...keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== "") return String(row[k]).trim();
    }
    return "";
  };

  return {
    id:            idx,
    brand:         get("brand", "brand_name", "name", "company"),
    category:      get("category", "cat", "type", "product_category"),
    segment:       get("segment", "market_segment", "tier"),
    launch_market: get("launch_market", "market", "region", "geography", "country"),
    status:        get("status", "stage", "pipeline_stage", "deal_stage"),
    source_country:get("source_country", "source", "origin", "country_of_origin"),
    working_days:  parseInt(get("working_days", "days", "days_in_pipeline", "age") || "0") || 0,
    next_step:     get("next_step", "next_steps", "action", "next_action"),
    hold_reason:   get("hold_reason", "hold", "reason", "blocked_reason"),
    notes:         get("notes", "note", "comments", "comment"),
    raw:           row,
  };
}

// ── Upsert rows into Supabase ─────────────────────────────────────────────────
async function upsertToSupabase(rows) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase not configured");

  const records = rows.map(r => ({
    workspace_id:   "00000000-0000-0000-0000-000000000001", // default workspace
    source_row_hash: `sheet-row-${r.id}-${r.brand}`.replace(/\s/g, "-").toLowerCase(),
    date:           new Date().toISOString().split("T")[0],
    sku:            r.brand || `ROW-${r.id}`,
    product_name:   r.brand,
    category:       r.category || "Uncategorized",
    brand:          r.brand,
    channel:        r.launch_market || "Global",
    sales_qty:      0,
    sales_amount:   0,
    returns_qty:    0,
    inventory_on_hand: 0,
    cost_amount:    0,
    discount_amount: 0,
  })).filter(r => r.product_name);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/analytics_records`, {
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
    throw new Error(`Supabase upsert error ${res.status}: ${err}`);
  }

  return records.length;
}

// ── Handler ───────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { headers, rows } = await fetchSheet();
    const normalized        = rows.map(normalizeRow);

    // GET → just preview the data
    if (req.method === "GET") {
      return res.status(200).json({
        ok:       true,
        sheetId:  SHEET_ID,
        tab:      SHEET_TAB,
        headers,
        rowCount: rows.length,
        preview:  normalized.slice(0, 5),
      });
    }

    // POST → sync into Supabase
    const synced = await upsertToSupabase(normalized);
    return res.status(200).json({
      ok:       true,
      message:  `Synced ${synced} rows from Google Sheet into Supabase`,
      rowCount: synced,
      syncedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error("sync-sheet error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

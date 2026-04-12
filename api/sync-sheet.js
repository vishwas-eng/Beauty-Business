/**
 * GET  /api/sync-sheet  → preview sheet data
 * POST /api/sync-sheet  → sync sheet into Supabase
 */

const SHEET_ID   = process.env.GOOGLE_SHEET_ID  || "1J0zCJYMLfTMwaUxECAzd5EVvhgSqQjkOBERNleUJAVg";
const SHEET_TAB  = process.env.GOOGLE_SHEET_TAB || "Beauty Tracker P";
const GOOGLE_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function fetchSheet() {
  if (!GOOGLE_KEY) throw new Error("GOOGLE_SHEETS_API_KEY not set");

  const range = encodeURIComponent(`${SHEET_TAB}!A1:Z2000`);
  const url   = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${GOOGLE_KEY}`;
  const res   = await fetch(url);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const rows = data.values || [];
  if (rows.length < 2) return { headers: [], rows: [] };

  // Normalize headers: trim, lowercase, replace spaces with _
  const headers = rows[0].map(h => String(h || "").trim().toLowerCase().replace(/\s+/g, "_"));

  const records = rows.slice(1)
    .filter(row => row.some(cell => cell && String(cell).trim()))
    .map((row, idx) => {
      const obj = { _row: idx + 2 };
      headers.forEach((h, i) => { obj[h] = String(row[i] || "").trim(); });
      return obj;
    });

  return { headers, rows: records };
}

function normalizeRow(row) {
  return {
    brand:          row.brand || row.brand_name || "",
    category:       row.category || "",
    segment:        row.segment || "",
    company:        row.company || "",
    source_country: row.country || row.source_country || "",
    launch_market:  row.country_for_launch || row.launch_market || row.market || "",
    quadrant:       row.quadrant || "",
    start_date:     row.discussion_start_date || row.start_date || "",
    status:         row.status || "",
    // grab any extra columns dynamically
    raw: row,
  };
}

async function upsertToSupabase(rows) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase env vars not set");

  const records = rows
    .filter(r => r.brand)
    .map((r, i) => ({
      workspace_id:     "00000000-0000-0000-0000-000000000001",
      source_row_hash:  `sheet-${r.brand}-${r.launch_market}-${i}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      date:             new Date().toISOString().split("T")[0],
      sku:              `${r.brand}-${r.launch_market}`.toLowerCase().replace(/\s+/g, "-"),
      product_name:     r.brand,
      category:         r.category || "Uncategorized",
      brand:            r.brand,
      channel:          r.launch_market || "Global",
      sales_qty:        0,
      sales_amount:     0,
      returns_qty:      0,
      inventory_on_hand:0,
      cost_amount:      0,
      discount_amount:  0,
    }));

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
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }

  return records.length;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { headers, rows } = await fetchSheet();
    const normalized        = rows.map(normalizeRow);

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

    const synced = await upsertToSupabase(normalized);
    return res.status(200).json({
      ok:       true,
      message:  `Synced ${synced} rows from "${SHEET_TAB}" into Supabase`,
      rowCount: synced,
      syncedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error("sync-sheet error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

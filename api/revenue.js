/**
 * GET /api/revenue — Beauty pipeline revenue data (live Google Sheet)
 */

const GOOGLE_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const BEAUTY_SHEET_ID  = process.env.GOOGLE_SHEET_ID  || "1J0zCJYMLfTMwaUxECAzd5EVvhgSqQjkOBERNleUJAVg";
const BEAUTY_SHEET_TAB = process.env.GOOGLE_SHEET_TAB || "Beauty Tracker P";

async function fetchBeautyStats() {
  if (!GOOGLE_KEY) return { total: 0, byGeo: {}, active: 0, byCategory: {}, byStage: {} };
  try {
    const range = encodeURIComponent(`${BEAUTY_SHEET_TAB}!A1:Z500`);
    const url   = `https://sheets.googleapis.com/v4/spreadsheets/${BEAUTY_SHEET_ID}/values/${range}?key=${GOOGLE_KEY}`;
    const res   = await fetch(url);
    if (!res.ok) return { total: 0, byGeo: {}, active: 0, byCategory: {}, byStage: {} };
    const data    = await res.json();
    const rows    = data.values || [];
    if (rows.length < 2) return { total: 0, byGeo: {}, active: 0, byCategory: {}, byStage: {} };
    const headers = rows[0].map(h => String(h || "").trim().toLowerCase().replace(/\s+/g, "_"));
    const getIdx  = (...keys) => { for (const k of keys) { const i = headers.indexOf(k); if (i !== -1) return i; } return -1; };
    const mktIdx  = getIdx("country_for_launch", "launch_market", "market");
    const stIdx   = getIdx("status", "stage");
    const brIdx   = getIdx("brand", "brand_name", "name");
    const catIdx  = getIdx("category", "product_category");
    const brands  = rows.slice(1).filter(r => r[brIdx]).map(r => ({
      brand:    String(r[brIdx]  || "").trim(),
      geo:      String(r[mktIdx] || "").trim() || "Under Discussion",
      status:   String(r[stIdx]  || "").trim(),
      category: String(r[catIdx] || "").trim() || "Unassigned",
    })).filter(r => r.brand);

    const byGeo = {};
    const byCategory = {};
    const byStage = {};
    const ACTIVE = ["MQL", "SQL", "Commercials", "OD", "Contract", "Onboarding", "Leads"];

    brands.forEach(b => {
      byGeo[b.geo] = (byGeo[b.geo] || 0) + 1;
      byCategory[b.category] = (byCategory[b.category] || 0) + 1;
      byStage[b.status] = (byStage[b.status] || 0) + 1;
    });

    return {
      total: brands.length,
      byGeo,
      byCategory,
      byStage,
      active: brands.filter(b => ACTIVE.includes(b.status)).length
    };
  } catch(e) { return { total: 0, byGeo: {}, active: 0, byCategory: {}, byStage: {} }; }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const beauty = await fetchBeautyStats();

    return res.status(200).json({
      ok: true,
      beauty,
      meta: {
        beautyBrandsTracked: beauty.total,
        activeBrands:        beauty.active,
        lastUpdated:         new Date().toISOString(),
        note: "Beauty pipeline data — live from Google Sheet. Revenue unlocks on deal close.",
      }
    });
  } catch (err) {
    console.error("revenue error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

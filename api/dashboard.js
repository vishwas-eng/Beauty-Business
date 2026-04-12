/**
 * GET /api/dashboard
 * Returns pipeline data from Google Sheet (if configured) or mock data
 */

const SHEET_ID   = process.env.GOOGLE_SHEET_ID   || "1J0zCJYMLfTMwaUxECAzd5EVvhgSqQjkOBERNleUJAVg";
const SHEET_TAB  = process.env.GOOGLE_SHEET_TAB  || "Sheet1";
const GOOGLE_KEY = process.env.GOOGLE_SHEETS_API_KEY;

// Mock fallback data
const MOCK_PIPELINE = [
  { brand: "Nudestix",    category: "Makeup",    segment: "Premium", launchMarket: "UAE",    status: "Due Diligence", workingDays: 12, nextStep: "Call CEO",        holdReason: "" },
  { brand: "MaskerAide",  category: "Skincare",  segment: "Mass",    launchMarket: "India",  status: "Negotiation",   workingDays: 28, nextStep: "Send term sheet", holdReason: "" },
  { brand: "Glow Recipe", category: "Skincare",  segment: "Premium", launchMarket: "India",  status: "Hold",          workingDays: 45, nextStep: "",                holdReason: "Waiting for exclusivity terms" },
  { brand: "Kosas",       category: "Makeup",    segment: "Premium", launchMarket: "SEA",    status: "Outreach",      workingDays: 5,  nextStep: "Send intro deck", holdReason: "" },
  { brand: "Tower 28",    category: "Makeup",    segment: "Clean",   launchMarket: "GCC",    status: "LOI Signed",    workingDays: 18, nextStep: "Legal review",    holdReason: "" },
];

async function fetchSheetRows() {
  if (!GOOGLE_KEY) return null;

  try {
    const range = encodeURIComponent(`${SHEET_TAB}!A1:Z1000`);
    const url   = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${GOOGLE_KEY}`;
    const res   = await fetch(url);
    if (!res.ok) return null;

    const data    = await res.json();
    const raw     = data.values || [];
    if (raw.length < 2) return null;

    const headers = raw[0].map(h => String(h).trim().toLowerCase().replace(/\s+/g, "_"));
    const get = (row, ...keys) => {
      for (const k of keys) {
        const i = headers.indexOf(k);
        if (i !== -1 && row[i]) return String(row[i]).trim();
      }
      return "";
    };

    return raw.slice(1).map(row => ({
      brand:        get(row, "brand", "brand_name", "name", "company"),
      category:     get(row, "category", "cat", "type"),
      segment:      get(row, "segment", "tier", "market_segment"),
      launchMarket: get(row, "launch_market", "market", "region", "country", "geography"),
      status:       get(row, "status", "stage", "deal_stage", "pipeline_stage"),
      workingDays:  parseInt(get(row, "working_days", "days", "age") || "0") || 0,
      nextStep:     get(row, "next_step", "next_steps", "action"),
      holdReason:   get(row, "hold_reason", "hold", "reason"),
      sourceCountry:get(row, "source_country", "source", "origin"),
    })).filter(r => r.brand);
  } catch (e) {
    console.error("Sheet fetch error:", e.message);
    return null;
  }
}

function buildDashboard(rows) {
  const stageCounts = {};
  const categoryMap = {};
  const marketMap   = {};

  rows.forEach(r => {
    stageCounts[r.status]       = (stageCounts[r.status] || 0) + 1;
    categoryMap[r.category]     = (categoryMap[r.category] || 0) + 1;
    marketMap[r.launchMarket]   = (marketMap[r.launchMarket] || 0) + 1;
  });

  const totalBrands    = rows.length;
  const activeDeals    = rows.filter(r => !["Reject", "Hold", "Dead"].includes(r.status)).length;
  const holdCount      = rows.filter(r => r.status === "Hold").length;
  const coldBrands     = rows.filter(r => r.workingDays > 35 && r.status !== "Reject").length;

  return {
    lastSyncedAt: new Date().toISOString(),
    isLiveSheet:  Boolean(GOOGLE_KEY),
    summary: {
      totalBrands,
      activeDeals,
      holdCount,
      coldBrands,
      stageCounts,
      categoryBreakdown: categoryMap,
      marketBreakdown:   marketMap,
    },
    performance: rows,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  try {
    const sheetRows = await fetchSheetRows();
    const rows      = sheetRows || MOCK_PIPELINE;
    const dashboard = buildDashboard(rows);

    return res.status(200).json(dashboard);
  } catch (err) {
    console.error("dashboard error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

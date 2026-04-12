/**
 * GET /api/dashboard — live data from "Beauty Tracker P" tab
 */

const SHEET_ID   = process.env.GOOGLE_SHEET_ID  || "1J0zCJYMLfTMwaUxECAzd5EVvhgSqQjkOBERNleUJAVg";
const SHEET_TAB  = process.env.GOOGLE_SHEET_TAB || "Beauty Tracker P";
const GOOGLE_KEY = process.env.GOOGLE_SHEETS_API_KEY;

async function fetchSheetRows() {
  if (!GOOGLE_KEY) return null;

  try {
    const range = encodeURIComponent(`${SHEET_TAB}!A1:Z2000`);
    const url   = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${GOOGLE_KEY}`;
    const res   = await fetch(url);
    if (!res.ok) return null;

    const data    = await res.json();
    const raw     = data.values || [];
    if (raw.length < 2) return null;

    const headers = raw[0].map(h => String(h || "").trim().toLowerCase().replace(/\s+/g, "_"));

    const get = (row, ...keys) => {
      for (const k of keys) {
        const i = headers.indexOf(k);
        if (i !== -1 && row[i]) return String(row[i]).trim();
      }
      return "";
    };

    return raw.slice(1)
      .filter(row => row.some(c => c && String(c).trim()))
      .map(row => ({
        brand:         get(row, "brand", "brand_name", "name"),
        category:      get(row, "category", "cat"),
        segment:       get(row, "segment", "tier"),
        company:       get(row, "company"),
        sourceCountry: get(row, "country", "source_country"),
        launchMarket:  get(row, "country_for_launch", "launch_market", "market", "country_for_launch"),
        quadrant:      get(row, "quadrant"),
        startDate:     get(row, "discussion_start_date", "start_date"),
        status:        get(row, "status", "stage"),
        workingDays:   calcWorkingDays(get(row, "discussion_start_date", "start_date")),
        nextStep:      get(row, "next_step", "next_steps", "action"),
        holdReason:    get(row, "hold_reason", "hold", "reason"),
      }))
      .filter(r => r.brand);
  } catch (e) {
    console.error("Sheet fetch error:", e.message);
    return null;
  }
}

function calcWorkingDays(dateStr) {
  if (!dateStr) return 0;
  try {
    const start = new Date(dateStr);
    const now   = new Date();
    const diff  = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.round(diff * 5 / 7)); // rough business days
  } catch { return 0; }
}

function buildDashboard(rows, isLive) {
  const count = (arr, key) => arr.reduce((acc, r) => {
    acc[r[key]] = (acc[r[key]] || 0) + 1; return acc;
  }, {});

  return {
    lastSyncedAt:      new Date().toISOString(),
    isLiveSheet:       isLive,
    summary: {
      totalBrands:     rows.length,
      activeDeals:     rows.filter(r => !["Reject","Hold","Dead"].includes(r.status)).length,
      holdCount:       rows.filter(r => r.status === "Hold").length,
      coldBrands:      rows.filter(r => r.workingDays > 35 && r.status !== "Reject").length,
      stageCounts:     count(rows, "status"),
      categoryBreakdown: count(rows, "category"),
      marketBreakdown: count(rows, "launchMarket"),
      segmentBreakdown:count(rows, "segment"),
    },
    performance: rows,
  };
}

// Fallback mock data
const MOCK = [
  { brand:"Nudestix",   category:"Makeup",   segment:"Premium",  launchMarket:"UAE",   status:"Commercials", workingDays:12, nextStep:"Call CEO",        holdReason:"" },
  { brand:"Ajmal",      category:"Perfumes", segment:"Masstige", launchMarket:"India", status:"Hold",        workingDays:45, nextStep:"",                holdReason:"Exclusivity" },
  { brand:"Toni & Guy", category:"Haircare", segment:"Masstige", launchMarket:"India", status:"Hold",        workingDays:60, nextStep:"",                holdReason:"Pricing" },
  { brand:"Elf Beauty", category:"Makeup",   segment:"Mass",     launchMarket:"India", status:"MQL",         workingDays:8,  nextStep:"Send intro deck",  holdReason:"" },
  { brand:"Beardo",     category:"Mens' Grooming", segment:"Masstige", launchMarket:"SEA", status:"MQL",    workingDays:5,  nextStep:"Intro call",       holdReason:"" },
];

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  try {
    const sheetRows = await fetchSheetRows();
    const isLive    = Boolean(sheetRows);
    const rows      = sheetRows || MOCK;
    return res.status(200).json(buildDashboard(rows, isLive));
  } catch (err) {
    console.error("dashboard error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

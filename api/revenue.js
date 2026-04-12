/**
 * GET /api/revenue — Real revenue data from connected pipelines
 * Combines:
 *  • Fashion/Softlines revenue from SL BD Status Master Tracker (static extract)
 *  • Beauty pipeline brand counts by market (live Google Sheet)
 */

const GROQ_KEY   = process.env.GROQ_API_KEY;
const GOOGLE_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const BEAUTY_SHEET_ID  = process.env.GOOGLE_SHEET_ID  || "1J0zCJYMLfTMwaUxECAzd5EVvhgSqQjkOBERNleUJAVg";
const BEAUTY_SHEET_TAB = process.env.GOOGLE_SHEET_TAB || "Beauty Tracker P";

// ── Fashion revenue data (from SL BD Status Master Tracker.xlsx) ─────────────
// rev_dec26 = confirmed revenue forecast $K by Dec 2026 (active/signed deals)
// rev_jun28 = pipeline potential $K by Jun 2028 (named deals)
const FASHION_DEALS = [
  // ── Active / Signed deals (confirmed revenue) ──
  { brand: "US Polo",       geo: "GCC",   lob: "Footwear", stage: "signed",  rev_confirmed: 595 },
  { brand: "Penti",         geo: "GCC",   lob: "Apparel",  stage: "signed",  rev_confirmed: 66  },
  { brand: "Campus",        geo: "GCC",   lob: "Footwear", stage: "active",  rev_confirmed: 139 },
  { brand: "FC",            geo: "GCC",   lob: "Apparel",  stage: "active",  rev_confirmed: 112 },
  { brand: "Puma",          geo: "GCC",   lob: "Footwear", stage: "active",  rev_confirmed: 51  },
  { brand: "Keds",          geo: "GCC",   lob: "Footwear", stage: "active",  rev_confirmed: 100 },
  { brand: "Keds",          geo: "India", lob: "Footwear", stage: "signed",  rev_confirmed: 36  },
  { brand: "Keds",          geo: "SEA",   lob: "Footwear", stage: "signed",  rev_confirmed: 90  },
  { brand: "Cardio Bunny",  geo: "GCC",   lob: "Apparel",  stage: "signed",  rev_confirmed: 51  },
  { brand: "Cardio Bunny",  geo: "India", lob: "Apparel",  stage: "signed",  rev_confirmed: 59  },
  { brand: "Lyle & Scott",  geo: "India", lob: "Apparel",  stage: "signed",  rev_confirmed: 57  },
  { brand: "Lyle & Scott",  geo: "SEA",   lob: "Apparel",  stage: "signed",  rev_confirmed: 57  },
  { brand: "Von Dutch",     geo: "SEA",   lob: "Apparel",  stage: "signed",  rev_confirmed: 57  },
  { brand: "Von Dutch",     geo: "GCC",   lob: "Apparel",  stage: "signed",  rev_confirmed: 57  },
  { brand: "Von Dutch",     geo: "India", lob: "Apparel",  stage: "signed",  rev_confirmed: 57  },
  // ── Named pipeline deals (potential revenue) ──
  { brand: "Jack & Jones",        geo: "India", lob: "Apparel",  stage: "pipeline", rev_pipeline: 567 },
  { brand: "Brand Concept",       geo: "India", lob: "Apparel",  stage: "pipeline", rev_pipeline: 462 },
  { brand: "Next",                geo: "SEA",   lob: "Apparel",  stage: "pipeline", rev_pipeline: 432 },
  { brand: "BHPC",                geo: "GCC",   lob: "Apparel",  stage: "pipeline", rev_pipeline: 432 },
  { brand: "BHPC",                geo: "India", lob: "Apparel",  stage: "pipeline", rev_pipeline: 137 },
  { brand: "Wrangler Lee",        geo: "SEA",   lob: "Apparel",  stage: "pipeline", rev_pipeline: 432 },
  { brand: "Fyor",                geo: "GCC",   lob: "Footwear", stage: "pipeline", rev_pipeline: 137 },
  { brand: "De facto",            geo: "India", lob: "Apparel",  stage: "pipeline", rev_pipeline: 137 },
  { brand: "love bonito",         geo: "SEA",   lob: "Apparel",  stage: "pipeline", rev_pipeline: 137 },
  { brand: "US Polo",             geo: "SEA",   lob: "Footwear", stage: "pipeline", rev_pipeline: 260 },
  { brand: "UCB",                 geo: "SEA",   lob: "Apparel",  stage: "pipeline", rev_pipeline: 260 },
  { brand: "Adidas",              geo: "GCC",   lob: "Footwear", stage: "pipeline", rev_pipeline: 184 },
  { brand: "Campus",              geo: "SEA",   lob: "Footwear", stage: "pipeline", rev_pipeline: 184 },
  { brand: "LCW",                 geo: "SEA",   lob: "Apparel",  stage: "pipeline", rev_pipeline: 159 },
  { brand: "LCW",                 geo: "India", lob: "Apparel",  stage: "pipeline", rev_pipeline: 159 },
  { brand: "Bugatti",             geo: "India", lob: "Footwear", stage: "pipeline", rev_pipeline: 159 },
  { brand: "Ted Bakers",          geo: "GCC",   lob: "Apparel",  stage: "pipeline", rev_pipeline: 159 },
  { brand: "Aeropostale",         geo: "GCC",   lob: "Apparel",  stage: "pipeline", rev_pipeline: 159 },
];

function sum(arr, key) { return arr.reduce((s, x) => s + (x[key] || 0), 0); }

function buildFashionRevenue() {
  const confirmed = FASHION_DEALS.filter(d => d.stage !== "pipeline");
  const pipeline  = FASHION_DEALS.filter(d => d.stage === "pipeline");

  const byGeo = {};
  const byLob = { Apparel: { confirmed: 0, pipeline: 0 }, Footwear: { confirmed: 0, pipeline: 0 } };

  for (const d of confirmed) {
    byGeo[d.geo] = byGeo[d.geo] || { confirmed: 0, pipeline: 0, brands: new Set() };
    byGeo[d.geo].confirmed += d.rev_confirmed || 0;
    byGeo[d.geo].brands.add(d.brand);
    if (byLob[d.lob]) byLob[d.lob].confirmed += d.rev_confirmed || 0;
  }
  for (const d of pipeline) {
    byGeo[d.geo] = byGeo[d.geo] || { confirmed: 0, pipeline: 0, brands: new Set() };
    byGeo[d.geo].pipeline += d.rev_pipeline || 0;
    byGeo[d.geo].brands.add(d.brand);
    if (byLob[d.lob]) byLob[d.lob].pipeline += d.rev_pipeline || 0;
  }

  // Serialize sets → counts
  for (const geo of Object.keys(byGeo)) {
    byGeo[geo].brandCount = byGeo[geo].brands.size;
    delete byGeo[geo].brands;
  }

  const totalConfirmed = sum(confirmed, "rev_confirmed");
  const totalPipeline  = sum(pipeline,  "rev_pipeline");

  // Top brands by confirmed revenue
  const topBrands = Object.entries(
    confirmed.reduce((acc, d) => {
      acc[d.brand] = (acc[d.brand] || 0) + d.rev_confirmed;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([brand, rev]) => ({
    brand,
    rev_confirmed: rev,
    geo: confirmed.find(d => d.brand === brand)?.geo || "",
    lob: confirmed.find(d => d.brand === brand)?.lob || "",
  }));

  return { totalConfirmed, totalPipeline, byGeo, byLob, topBrands };
}

async function fetchBeautyStats() {
  if (!GOOGLE_KEY) return { total: 0, byGeo: {}, active: 0 };
  try {
    const range = encodeURIComponent(`${BEAUTY_SHEET_TAB}!A1:Z500`);
    const url   = `https://sheets.googleapis.com/v4/spreadsheets/${BEAUTY_SHEET_ID}/values/${range}?key=${GOOGLE_KEY}`;
    const res   = await fetch(url);
    if (!res.ok) return { total: 0, byGeo: {}, active: 0 };
    const data    = await res.json();
    const rows    = data.values || [];
    if (rows.length < 2) return { total: 0, byGeo: {}, active: 0 };
    const headers = rows[0].map(h => String(h || "").trim().toLowerCase().replace(/\s+/g, "_"));
    const getIdx  = (...keys) => { for (const k of keys) { const i = headers.indexOf(k); if (i !== -1) return i; } return -1; };
    const mktIdx  = getIdx("country_for_launch", "launch_market", "market");
    const stIdx   = getIdx("status", "stage");
    const brIdx   = getIdx("brand", "brand_name", "name");
    const brands  = rows.slice(1).filter(r => r[brIdx]).map(r => ({
      brand: String(r[brIdx] || "").trim(),
      geo:   String(r[mktIdx] || "").trim() || "Under Discussion",
      status:String(r[stIdx]  || "").trim(),
    })).filter(r => r.brand);
    const byGeo  = {};
    const ACTIVE = ["MQL", "SQL", "Commercials", "OD", "Contract", "Onboarding", "Leads"];
    brands.forEach(b => { byGeo[b.geo] = (byGeo[b.geo] || 0) + 1; });
    return { total: brands.length, byGeo, active: brands.filter(b => ACTIVE.includes(b.status)).length };
  } catch(e) { return { total: 0, byGeo: {}, active: 0 }; }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const [fashion, beauty] = await Promise.all([
      Promise.resolve(buildFashionRevenue()),
      fetchBeautyStats(),
    ]);

    return res.status(200).json({
      ok: true,
      fashion,
      beauty,
      meta: {
        fashionDealsTotal:    FASHION_DEALS.length,
        confirmedDeals:       FASHION_DEALS.filter(d => d.stage !== "pipeline").length,
        pipelineDeals:        FASHION_DEALS.filter(d => d.stage === "pipeline").length,
        beautyBrandsTracked:  beauty.total,
        lastUpdated:          new Date().toISOString(),
        note: "Fashion revenue in $K. Beauty pipeline = pre-revenue (discussion stage).",
      }
    });
  } catch (err) {
    console.error("revenue error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

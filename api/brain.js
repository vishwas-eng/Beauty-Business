/**
 * ONE BRAIN — Unified AI intelligence across all data sources
 * GET  /api/brain          → returns unified dataset (beauty + fashion)
 * POST /api/brain          → AI query across all data
 */

const GROQ_KEY   = process.env.GROQ_API_KEY;
const GOOGLE_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const BEAUTY_SHEET_ID  = process.env.GOOGLE_SHEET_ID  || "1J0zCJYMLfTMwaUxECAzd5EVvhgSqQjkOBERNleUJAVg";
const BEAUTY_SHEET_TAB = process.env.GOOGLE_SHEET_TAB || "Beauty Tracker P";

// ── Fashion data (extracted from SL BD Status Master Tracker.xlsx) ────────────
const FASHION_BRANDS = [{"brand": "US Polo", "geo": "GCC", "stage": "A", "quadrant": "1A", "rev_dec26": 595.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Footwear", "source": "active_signed"}, {"brand": "Penti", "geo": "GCC", "stage": "A", "quadrant": "1A", "rev_dec26": 66.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "active_signed"}, {"brand": "Campus", "geo": "GCC", "stage": "A", "quadrant": "4", "rev_dec26": 139.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Footwear", "source": "active_signed"}, {"brand": "FC", "geo": "GCC", "stage": "A", "quadrant": "2", "rev_dec26": 112.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "active_signed"}, {"brand": "Puma", "geo": "GCC", "stage": "A", "quadrant": "1B", "rev_dec26": 51.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Footwear", "source": "active_signed"}, {"brand": "Vero Moda", "geo": "GCC", "stage": "A", "quadrant": "1B", "rev_dec26": 0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "nan", "source": "active_signed"}, {"brand": "Keds", "geo": "GCC", "stage": "A", "quadrant": "4", "rev_dec26": 100.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Footwear", "source": "active_signed"}, {"brand": "Keds", "geo": "India", "stage": "S", "quadrant": "4", "rev_dec26": 36.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Footwear", "source": "active_signed"}, {"brand": "Keds", "geo": "SEA", "stage": "S", "quadrant": "1B", "rev_dec26": 90.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Footwear", "source": "active_signed"}, {"brand": "Cardio Bunny", "geo": "GCC", "stage": "S", "quadrant": "3", "rev_dec26": 51.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "active_signed"}, {"brand": "Cardio Bunny", "geo": "India", "stage": "S", "quadrant": "3", "rev_dec26": 59.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "active_signed"}, {"brand": "Lyle & Scott", "geo": "India", "stage": "S", "quadrant": "4", "rev_dec26": 57.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "active_signed"}, {"brand": "Lyle & Scott", "geo": "SEA", "stage": "S", "quadrant": "4", "rev_dec26": 57.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "active_signed"}, {"brand": "Von Dutch", "geo": "SEA", "stage": "S", "quadrant": "4", "rev_dec26": 57.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "active_signed"}, {"brand": "Von Dutch", "geo": "GCC", "stage": "S", "quadrant": "4", "rev_dec26": 57.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "active_signed"}, {"brand": "Von Dutch", "geo": "India", "stage": "S", "quadrant": "4", "rev_dec26": 57.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "active_signed"}, {"brand": "Jack & Jones", "geo": "India", "stage": "Opportunity", "quadrant": "1A", "rev_jun28": 567.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "Brand Concept", "geo": "India", "stage": "MQL", "quadrant": "1A", "rev_jun28": 462.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "", "source": "named_deals"}, {"brand": "Next", "geo": "SEA", "stage": "SQL", "quadrant": "1A", "rev_jun28": 432.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "BHPC", "geo": "GCC", "stage": "SQL", "quadrant": "1A", "rev_jun28": 432.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "Wrangler Lee", "geo": "SEA", "stage": "MQL", "quadrant": "1A", "rev_jun28": 432.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "", "source": "named_deals"}, {"brand": "BHPC", "geo": "India", "stage": "SQL", "quadrant": "1A", "rev_jun28": 137.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "Fyor", "geo": "GCC", "stage": "SQL", "quadrant": "1A", "rev_jun28": 137.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Footwear", "source": "named_deals"}, {"brand": "De facto", "geo": "India", "stage": "SQL", "quadrant": "1A", "rev_jun28": 137.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "love bonito", "geo": "SEA", "stage": "SQL", "quadrant": "1A", "rev_jun28": 137.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "US Polo", "geo": "SEA", "stage": "MQL", "quadrant": "1B", "rev_jun28": 260.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Footwear", "source": "named_deals"}, {"brand": "UCB", "geo": "SEA", "stage": "MQL", "quadrant": "1B", "rev_jun28": 260.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "", "source": "named_deals"}, {"brand": "Adidas", "geo": "GCC", "stage": "Opportunity", "quadrant": "1B", "rev_jun28": 184.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Footwear", "source": "named_deals"}, {"brand": "Campus", "geo": "SEA", "stage": "Opportunity", "quadrant": "1B", "rev_jun28": 184.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Footwear", "source": "named_deals"}, {"brand": "LCW", "geo": "SEA", "stage": "SQL", "quadrant": "1B", "rev_jun28": 159.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "LCW", "geo": "India", "stage": "SQL", "quadrant": "1B", "rev_jun28": 159.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "Bugatti", "geo": "India", "stage": "MQL", "quadrant": "1B", "rev_jun28": 159.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "nan", "source": "named_deals"}, {"brand": "Ted Bakers (Innerware)", "geo": "GCC", "stage": "MQL", "quadrant": "1B", "rev_jun28": 159.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "", "source": "named_deals"}, {"brand": "Aeropostale", "geo": "GCC", "stage": "MQL", "quadrant": "1B", "rev_jun28": 159.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "Jack & Jones", "geo": "India", "stage": "Opportunity", "quadrant": "1A", "rev_jun28": 184.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "Brand Concept", "geo": "India", "stage": "MQL", "quadrant": "1A", "rev_jun28": 567.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "", "source": "named_deals"}, {"brand": "Next", "geo": "SEA", "stage": "SQL", "quadrant": "1A", "rev_jun28": 184.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "BHPC", "geo": "GCC", "stage": "SQL", "quadrant": "1A", "rev_jun28": 432.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "Wrangler Lee", "geo": "SEA", "stage": "MQL", "quadrant": "1A", "rev_jun28": 159.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "", "source": "named_deals"}, {"brand": "US Polo", "geo": "SEA", "stage": "MQL", "quadrant": "1B", "rev_jun28": 159.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Footwear", "source": "named_deals"}, {"brand": "UCB", "geo": "SEA", "stage": "MQL", "quadrant": "1B", "rev_jun28": 137.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "", "source": "named_deals"}, {"brand": "Adidas", "geo": "GCC", "stage": "Opportunity", "quadrant": "1B", "rev_jun28": 137.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Footwear", "source": "named_deals"}, {"brand": "Campus", "geo": "SEA", "stage": "Opportunity", "quadrant": "1B", "rev_jun28": 137.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Footwear", "source": "named_deals"}, {"brand": "LCW", "geo": "SEA", "stage": "SQL", "quadrant": "1B", "rev_jun28": 137.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "LCW", "geo": "India", "stage": "SQL", "quadrant": "1B", "rev_jun28": 432.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "Bugatti", "geo": "India", "stage": "MQL", "quadrant": "1B", "rev_jun28": 159.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "nan", "source": "named_deals"}, {"brand": "Ted Bakers (Innerware)", "geo": "GCC", "stage": "MQL", "quadrant": "1B", "rev_jun28": 159.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "", "source": "named_deals"}, {"brand": "Aeropostale", "geo": "GCC", "stage": "MQL", "quadrant": "1B", "rev_jun28": 159.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "BHPC", "geo": "India", "stage": "SQL", "quadrant": "1A", "rev_jun28": 432.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "Fyor", "geo": "GCC", "stage": "SQL", "quadrant": "1A", "rev_jun28": 462.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Footwear", "source": "named_deals"}, {"brand": "De facto", "geo": "India", "stage": "SQL", "quadrant": "1A", "rev_jun28": 260.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}, {"brand": "love bonito", "geo": "SEA", "stage": "SQL", "quadrant": "1A", "rev_jun28": 260.0, "post_risk": 0, "pre_risk": 0, "type": "fashion", "lob": "Apparel", "source": "named_deals"}];

// ── Fetch live beauty pipeline from Google Sheet ──────────────────────────────
async function fetchBeautyData() {
  if (!GOOGLE_KEY) return [];
  try {
    const range = encodeURIComponent(`${BEAUTY_SHEET_TAB}!A1:Z2000`);
    const url   = `https://sheets.googleapis.com/v4/spreadsheets/${BEAUTY_SHEET_ID}/values/${range}?key=${GOOGLE_KEY}`;
    const res   = await fetch(url);
    if (!res.ok) return [];
    const data    = await res.json();
    const rows    = data.values || [];
    if (rows.length < 2) return [];
    const headers = rows[0].map(h => String(h||'').trim().toLowerCase().replace(/\s+/g,'_'));
    const get = (row, ...keys) => { for (const k of keys) { const i=headers.indexOf(k); if(i!==-1&&row[i]) return String(row[i]).trim(); } return ''; };
    return rows.slice(1).filter(r=>r.some(c=>c&&String(c).trim())).map(row=>({
      brand:        get(row,'brand','brand_name','name'),
      geo:          get(row,'country_for_launch','launch_market','market','country'),
      stage:        get(row,'status','stage'),
      segment:      get(row,'segment','tier'),
      category:     get(row,'category'),
      company:      get(row,'company'),
      source_country: get(row,'country','source_country'),
      quadrant:     get(row,'quadrant'),
      working_days: parseInt(get(row,'working_days','days')||'0')||0,
      next_steps:   get(row,'next_steps','next_step','action'),
      hold_reason:  get(row,'reason_if_on_hold','hold_reason','reason'),
      start_date:   get(row,'discussion_start_date','start_date'),
      type:         'beauty',
      lob:          'Beauty',
      source:       'google_sheet',
    })).filter(r=>r.brand);
  } catch(e) { console.error('Beauty fetch error:',e.message); return []; }
}

// ── Build unified summary stats ───────────────────────────────────────────────
function buildSummary(beauty, fashion) {
  const all = [...beauty, ...fashion];
  const byGeo = {}, byStage = {}, byType = {beauty:beauty.length, fashion:fashion.length};
  const byLob = {}, byQuadrant = {};

  all.forEach(b => {
    byGeo[b.geo]           = (byGeo[b.geo]||0)+1;
    byStage[b.stage]       = (byStage[b.stage]||0)+1;
    byLob[b.lob||'Other']  = (byLob[b.lob||'Other']||0)+1;
    byQuadrant[b.quadrant||'?'] = (byQuadrant[b.quadrant||'?']||0)+1;
  });

  const fashionRev = fashion.reduce((s,b)=>s+(b.rev_dec26||0)+(b.rev_jun28||0),0);
  const totalPostRisk = fashion.reduce((s,b)=>s+(b.post_risk||0),0);
  const totalPreRisk  = fashion.reduce((s,b)=>s+(b.pre_risk||0),0);

  return {
    total:         all.length,
    beautyCount:   beauty.length,
    fashionCount:  fashion.length,
    byGeo, byStage, byType, byLob, byQuadrant,
    fashionRevenue:fashionRev,
    postRiskRev:   totalPostRisk,
    preRiskRev:    totalPreRisk,
    activeDeals:   all.filter(b=>['A','Active','Commercials','SQL','MQL'].includes(b.stage)).length,
    signedDeals:   all.filter(b=>['S','Signed','LOI Signed'].includes(b.stage)).length,
    onHold:        all.filter(b=>['Hold','H'].includes(b.stage)).length,
  };
}

// ── AI query across unified dataset ──────────────────────────────────────────
async function queryBrain(question, beauty, fashion) {
  if (!GROQ_KEY) throw new Error('GROQ_API_KEY not set');

  const summary = buildSummary(beauty, fashion);
  const fashionSample = fashion.map(b=>`${b.brand}|${b.geo}|${b.stage}|${b.quadrant}|${b.lob}|Dec26:${b.rev_dec26||0}|PostRisk:${b.post_risk||0}`).join('\n');
  const beautySample  = beauty.slice(0,30).map(b=>`${b.brand}|${b.geo}|${b.stage}|${b.category}|${b.segment}|Days:${b.working_days}`).join('\n');

  const context = `
LUMARA — UNIFIED BRAND INTELLIGENCE BRAIN
Opptra's complete pipeline across Beauty + Fashion/Softlines

=== PORTFOLIO SUMMARY ===
Total brands: ${summary.total} (${summary.beautyCount} beauty + ${summary.fashionCount} fashion/softlines)
Active deals: ${summary.activeDeals} | Signed: ${summary.signedDeals} | On Hold: ${summary.onHold}
By Market: ${JSON.stringify(summary.byGeo)}
By Stage: ${JSON.stringify(summary.byStage)}
By LOB: ${JSON.stringify(summary.byLob)}
Fashion Revenue (Dec'26): $${summary.fashionRevenue.toLocaleString()}K
Post-Risk Q2'28: $${summary.postRiskRev.toFixed(0)}K | Pre-Risk: $${summary.preRiskRev.toFixed(0)}K

=== FASHION/SOFTLINES PIPELINE (52 brands) ===
Brand|Geo|Stage|Quadrant|LOB|Dec26Rev|PostRisk
${fashionSample}

=== BEAUTY PIPELINE (${beauty.length} brands from live Google Sheet) ===
Brand|Geo|Stage|Category|Segment|WorkingDays
${beautySample}
`.trim();

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2000,
      messages: [
        { role: 'system', content: `You are the AI brain for Opptra's Lumara platform with complete visibility across their entire brand portfolio — both Beauty and Fashion/Softlines. You have access to live pipeline data, revenue forecasts, risk assessments, and deal stages. Be specific, cite brand names and numbers, and give actionable insights. Today's date: ${new Date().toISOString().split('T')[0]}.\n\nDATA:\n${context}` },
        { role: 'user', content: question }
      ]
    })
  });

  if (!res.ok) { const e=await res.text(); throw new Error(`Groq error: ${e}`); }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response';
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method==='OPTIONS') return res.status(200).end();

  try {
    const beauty  = await fetchBeautyData();
    const fashion = FASHION_BRANDS;
    const summary = buildSummary(beauty, fashion);

    if (req.method === 'GET') {
      return res.status(200).json({ ok:true, summary, beautyBrands:beauty, fashionBrands:fashion, lastUpdated:new Date().toISOString() });
    }

    if (req.method === 'POST') {
      const body    = req.body || {};
      const question = (body.query||body.prompt||'').trim();
      if (!question) return res.status(400).json({ error:'query required' });
      const answer = await queryBrain(question, beauty, fashion);
      return res.status(200).json({ ok:true, answer, summary });
    }

  } catch(err) {
    console.error('brain error:', err.message);
    return res.status(500).json({ ok:false, error:err.message });
  }
};

/**
 * GET/POST /api/email-intel — brand deal intelligence extracted from email threads
 */

const BRAND_INTEL = [
  {
    brand: "Nudestix",
    category: "Makeup",
    segment: "Premium",
    markets: ["SEA"],
    stage: "Commercials",
    prevStage: "SQL",
    heat: "hot",
    lastActivity: "2026-03-26",
    summary: "Term sheet updated & shared. Christopher Taylor (Regional Brand Director) responded positively. Item master sheet sent to operations team. Deal advancing toward final alignment.",
    nextStep: "Await Sigalit/team alignment on term sheet",
    contacts: [
      { name: "Christopher Taylor", role: "Regional Brand Director", company: "Nudestix" },
      { name: "Pooja Dhawan", role: "VP Beauty", company: "Opptra" }
    ],
    threadId: "19d28adddae66f3e",
    owner: "Richa Gupta"
  },
  {
    brand: "Ajmal",
    category: "Perfumes",
    segment: "Masstige",
    markets: ["SEA"],
    stage: "OD",
    prevStage: "Commercials",
    heat: "hot",
    lastActivity: "2026-04-12",
    summary: "NDA details requested from Biswarup Bhattacharya (Ajmal). Richa sent NDA for priority signing. Deal gaining momentum.",
    nextStep: "Finalize NDA signing, advance to commercials",
    contacts: [
      { name: "Biswarup Bhattacharya", role: "Business Development", company: "Ajmal" },
      { name: "Richa Gupta", role: "Manager", company: "Opptra" }
    ],
    threadId: "19d7f9ac1c508c81",
    owner: "Richa Gupta"
  },
  {
    brand: "D'You",
    category: "Skincare",
    segment: "Premium",
    markets: ["SEA", "GCC", "India"],
    stage: "SQL",
    prevStage: "MQL",
    heat: "hot",
    lastActivity: "2026-04-16",
    summary: "NDA signed Mar 3. Brand details shared Apr 8 via Parmeet Kaur (Intl Growth). Proposal presented Apr 15 at 5PM meeting. Deck sent to Parmeet Apr 16. Awaiting brand's response.",
    nextStep: "Follow up on proposal — awaiting D'You response",
    contacts: [
      { name: "Parmeet Kaur", role: "International Growth & Expansion", company: "D'You" },
      { name: "Vitika Agrawal", role: "Co-founder", company: "D'You" }
    ],
    threadId: "19c99868e18743ed",
    owner: "Richa Gupta"
  },
  {
    brand: "Beardo",
    category: "Mens' Grooming",
    segment: "Masstige",
    markets: ["SEA", "GCC"],
    stage: "SQL",
    prevStage: "MQL",
    heat: "hot",
    lastActivity: "2026-04-17",
    summary: "NDA being finalized. Proposal ready. Apr 17: Marico's Ankit Mittal proposed meeting slots — Apr 23 after 6:30 PM or Apr 24 before 10:30 AM. Ankit Porwal (VP) pushing to expedite.",
    nextStep: "Confirm meeting slot (Apr 23/24) with Marico",
    contacts: [
      { name: "Ankit Mittal", role: "VP - Modern Trade & Exports", company: "Marico/Beardo" },
      { name: "Ankit Porwal", role: "VP", company: "Marico" }
    ],
    threadId: "19d1ebf4aa14324e",
    owner: "Richa Gupta"
  },
  {
    brand: "Just Herbs",
    category: "Skincare (Ayurveda)",
    segment: "Masstige",
    markets: ["SEA", "GCC"],
    stage: "SQL",
    prevStage: "MQL",
    heat: "hot",
    lastActivity: "2026-04-17",
    summary: "Same Marico thread as Beardo — proposal ready, meeting slots proposed for Apr 23/24. Brand deck received via WeTransfer Apr 6.",
    nextStep: "Confirm meeting slot (Apr 23/24) with Marico",
    contacts: [
      { name: "Ankit Mittal", role: "VP - Modern Trade & Exports", company: "Marico" },
      { name: "Siddhartha Roy", role: "Business Head", company: "Marico" }
    ],
    threadId: "19d1ebf4aa14324e",
    owner: "Richa Gupta"
  },
  {
    brand: "Inde Wild",
    category: "Skincare",
    segment: "Premium",
    markets: ["SEA", "GCC", "India"],
    stage: "SQL",
    prevStage: "MQL",
    heat: "warm",
    lastActivity: "2026-04-15",
    summary: "NDA redline version received Apr 15 from Mahesh Panse (inde wild) with legal team comments. Richa asked Vishwas to send to Palak for legal review. Proposal meeting slots shared (Wed-Fri).",
    nextStep: "Review NDA redline with Palak, schedule proposal meeting",
    contacts: [
      { name: "Mahesh Panse", role: "Business Head", company: "inde wild" },
      { name: "Oleg Kossov", role: "Co-founder", company: "inde wild" }
    ],
    threadId: "19d9055ec09368b1",
    owner: "Richa Gupta"
  },
];

const connectedAccounts = [
  { email: "richa@opptra.com", role: "Manager", status: "pending", label: "Beauty BD Manager" },
  { email: "pooja@opptra.com", role: "VP", status: "pending", label: "VP Beauty" }
];

function buildResponse() {
  const hot = BRAND_INTEL.filter(b => b.heat === "hot").length;
  const warm = BRAND_INTEL.filter(b => b.heat === "warm").length;
  const cold = BRAND_INTEL.filter(b => b.heat === "cold").length;

  return {
    brands: BRAND_INTEL,
    accounts: connectedAccounts,
    lastRefreshed: "2026-04-20T10:00:00Z",
    meta: {
      total: BRAND_INTEL.length,
      hot,
      warm,
      cold
    }
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method === "POST") {
    const { action } = req.body || {};
    if (action === "refresh") {
      return res.status(200).json(buildResponse());
    }
    return res.status(400).json({ error: "Unknown action" });
  }

  // GET
  return res.status(200).json(buildResponse());
};

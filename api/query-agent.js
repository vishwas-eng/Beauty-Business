module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ ok: false, answer: "ANTHROPIC_API_KEY not set." });
  }

  const body = req.body || {};
  const query = (body.query || body.prompt || "").trim();
  if (!query) return res.status(400).json({ error: "query is required" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
        max_tokens: 2000,
        system: body.system || "You are an expert AI assistant for Opptra's Lumara beauty brand intelligence platform. Help with market research, brand strategy, pipeline analysis, inventory planning, and revenue insights for beauty brands across India, SEA, and GCC markets. Be specific, actionable, and concise.",
        messages: [{ role: "user", content: query }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(200).json({ ok: false, answer: `Anthropic API error ${response.status}: ${err}` });
    }

    const data = await response.json();
    const answer = data.content?.find((c) => c.type === "text")?.text || "No response";

    return res.status(200).json({ ok: true, query, answer, suggestions: [], rows: [], sqlPreview: "", resultType: "overview" });
  } catch (err) {
    return res.status(500).json({ ok: false, answer: "Internal error: " + err.message });
  }
};

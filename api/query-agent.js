module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const groqKey = process.env.GROQ_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // Use Groq if available, fallback to Anthropic
  const useGroq = Boolean(groqKey);

  if (!groqKey && !anthropicKey) {
    return res.status(200).json({
      ok: false,
      answer: "No AI API key configured. Add GROQ_API_KEY to Vercel environment variables."
    });
  }

  const body = req.body || {};
  const query = (body.query || body.prompt || "").trim();
  if (!query) return res.status(400).json({ error: "query is required" });

  const systemPrompt = body.system ||
    "You are an expert AI assistant for Opptra's Lumara beauty brand intelligence platform. " +
    "Help with market research, brand strategy, pipeline analysis, inventory planning, and revenue insights " +
    "for beauty brands across India, SEA, and GCC markets. Be specific, actionable, and concise.";

  try {
    let answer;

    if (useGroq) {
      // ── Groq API (free) ──────────────────────────────────────────────────
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          max_tokens: 2000,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: query }
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Groq API error:", err);
        return res.status(200).json({ ok: false, answer: `Groq API error ${response.status}: ${err}` });
      }

      const data = await response.json();
      answer = data.choices?.[0]?.message?.content || "No response from Groq";

    } else {
      // ── Anthropic API (fallback) ─────────────────────────────────────────
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: "user", content: query }],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(200).json({ ok: false, answer: `Anthropic API error ${response.status}: ${err}` });
      }

      const data = await response.json();
      answer = data.content?.find((c) => c.type === "text")?.text || "No response";
    }

    return res.status(200).json({
      ok: true,
      query,
      answer,
      model: useGroq ? (process.env.GROQ_MODEL || "llama-3.3-70b-versatile") : "claude-3-5-sonnet",
      suggestions: [],
      rows: [],
      sqlPreview: "",
      resultType: "overview",
    });

  } catch (err) {
    console.error("query-agent error:", err);
    return res.status(500).json({ ok: false, answer: "Internal error: " + err.message });
  }
};

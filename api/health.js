module.exports = function handler(req, res) {
  return res.status(200).json({
    ok: true,
    ts: new Date().toISOString(),
    env: { hasKey: Boolean(process.env.ANTHROPIC_API_KEY) }
  });
};

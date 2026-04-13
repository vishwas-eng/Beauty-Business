import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Sparkles, Trash2 } from "lucide-react";
import { queryAgent } from "../lib/api";

// ── Opptra brand tokens ────────────────────────────────────────────────────────
const C = {
  navy: "#131A48",
  orange: "#FF5800",
  orangeLight: "#FF8C4F",
  white: "#FFFFFF",
};
const F = {
  heading: "'Spectral', Georgia, serif",
  body: "'Raleway', 'Segoe UI', sans-serif",
};

// ── Types ────────────────────────────────────────────────────────────────────
interface SlideData {
  type: "title" | "kpi" | "list" | "comparison" | "action" | "close";
  title: string;
  subtitle?: string;
  kpis?: { value: string; label: string; sub?: string }[];
  bullets?: string[];
  left?: { heading: string; items: string[] };
  right?: { heading: string; items: string[] };
  actions?: { label: string; detail: string; owner?: string }[];
  tagline?: string;
}

interface SavedDeck {
  id: string;
  topic: string;
  slides: SlideData[];
  createdAt: string;
}

const STORAGE_KEY = "lumara_presentations";

function loadDecks(): SavedDeck[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveDecks(decks: SavedDeck[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

// ── Slide Renderers ─────────────────────────────────────────────────────────
function Divider() {
  return <div style={{ width: 48, height: 3, background: C.orange, borderRadius: 2, marginBottom: 20 }} />;
}

function RenderTitleSlide({ slide }: { slide: SlideData }) {
  return (
    <div style={{ width: "100%", height: "100%", background: C.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 20% 80%, ${C.orange}15 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3b82f620 0%, transparent 50%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${C.white}08 1px, transparent 1px), linear-gradient(90deg, ${C.white}08 1px, transparent 1px)`, backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <img src="https://cdn.prod.website-files.com/67a44396c211269f785f9dfe/67a4a8650573be9ae072ae9e_Opptra-logo.svg" alt="Opptra" style={{ height: 40, marginBottom: 48, filter: "brightness(0) invert(1)" }} />
      <div style={{ textAlign: "center", maxWidth: 820, padding: "0 40px" }}>
        <h1 style={{ fontFamily: F.heading, fontSize: 56, fontWeight: 300, color: C.white, margin: "0 0 16px", lineHeight: 1.1, letterSpacing: "-0.04em" }}>
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p style={{ fontFamily: F.body, fontSize: 18, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.6 }}>{slide.subtitle}</p>
        )}
      </div>
      <div style={{ position: "absolute", bottom: 32, fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>CONFIDENTIAL · OPPTRA</div>
    </div>
  );
}

function RenderKpiSlide({ slide }: { slide: SlideData }) {
  const kpis = slide.kpis || [];
  const cols = Math.min(kpis.length, 5);
  return (
    <div style={{ width: "100%", height: "100%", background: C.navy, display: "flex", flexDirection: "column", padding: "48px 60px" }}>
      <div style={{ fontFamily: F.body, fontSize: 12, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{slide.subtitle || "Key Metrics"}</div>
      <h2 style={{ fontFamily: F.heading, fontSize: 42, fontWeight: 300, color: C.white, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
        {slide.title}
      </h2>
      <Divider />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, flex: 1, alignContent: "start" }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: i === 0 ? C.orange : "rgba(255,255,255,0.07)", border: `1px solid ${i === 0 ? C.orange : "rgba(255,255,255,0.15)"}`, borderRadius: 14, padding: "24px 22px", textAlign: "center" }}>
            <div style={{ fontFamily: F.heading, fontSize: 38, fontWeight: 700, color: i === 0 ? C.white : C.orange, lineHeight: 1, marginBottom: 8 }}>{k.value}</div>
            <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.white, opacity: 0.9 }}>{k.label}</div>
            {k.sub && <div style={{ fontFamily: F.body, fontSize: 11, color: C.white, opacity: 0.5, marginTop: 4 }}>{k.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function RenderListSlide({ slide }: { slide: SlideData }) {
  const bullets = slide.bullets || [];
  return (
    <div style={{ width: "100%", height: "100%", background: C.navy, display: "flex", flexDirection: "column", padding: "48px 60px" }}>
      <div style={{ fontFamily: F.body, fontSize: 12, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{slide.subtitle || ""}</div>
      <h2 style={{ fontFamily: F.heading, fontSize: 42, fontWeight: 300, color: C.white, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
        {slide.title}
      </h2>
      <Divider />
      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        {bullets.map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "14px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${C.orange}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: F.heading, fontSize: 14, fontWeight: 700, color: C.orange }}>{String(i + 1).padStart(2, "0")}</span>
            </div>
            <span style={{ fontFamily: F.body, fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.5, paddingTop: 4 }}>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RenderComparisonSlide({ slide }: { slide: SlideData }) {
  const left = slide.left || { heading: "", items: [] };
  const right = slide.right || { heading: "", items: [] };
  return (
    <div style={{ width: "100%", height: "100%", background: C.navy, display: "flex", flexDirection: "column", padding: "48px 60px" }}>
      <div style={{ fontFamily: F.body, fontSize: 12, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{slide.subtitle || ""}</div>
      <h2 style={{ fontFamily: F.heading, fontSize: 42, fontWeight: 300, color: C.white, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
        {slide.title}
      </h2>
      <Divider />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, flex: 1 }}>
        {[left, right].map((col, ci) => (
          <div key={ci} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: ci === 0 ? "#ec4899" : C.orange }} />
              <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.white, textTransform: "uppercase", letterSpacing: "0.08em" }}>{col.heading}</span>
            </div>
            {col.items.map((item, ii) => (
              <div key={ii} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: F.body, fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function RenderActionSlide({ slide }: { slide: SlideData }) {
  const actions = slide.actions || [];
  return (
    <div style={{ width: "100%", height: "100%", background: C.navy, display: "flex", flexDirection: "column", padding: "48px 60px" }}>
      <div style={{ fontFamily: F.body, fontSize: 12, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{slide.subtitle || "Next Steps"}</div>
      <h2 style={{ fontFamily: F.heading, fontSize: 42, fontWeight: 300, color: C.white, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
        {slide.title}
      </h2>
      <Divider />
      <div style={{ display: "grid", gridTemplateColumns: actions.length > 3 ? "1fr 1fr" : "1fr", gap: 16, flex: 1, alignContent: "start" }}>
        {actions.map((a, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "22px 26px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: F.heading, fontSize: 14, fontWeight: 700, color: C.white }}>{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div style={{ fontFamily: F.heading, fontSize: 18, fontWeight: 700, color: C.white, lineHeight: 1.3 }}>{a.label}</div>
            </div>
            <p style={{ fontFamily: F.body, fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, margin: "0 0 10px", flex: 1 }}>{a.detail}</p>
            {a.owner && (
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: F.body, background: `${C.orange}20`, color: C.orange, padding: "3px 10px", borderRadius: 20, alignSelf: "flex-start" }}>{a.owner}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RenderCloseSlide({ slide }: { slide: SlideData }) {
  return (
    <div style={{ width: "100%", height: "100%", background: C.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 50% 50%, ${C.orange}10 0%, transparent 65%)`, pointerEvents: "none" }} />
      <img src="https://cdn.prod.website-files.com/67a44396c211269f785f9dfe/67a4a8650573be9ae072ae9e_Opptra-logo.svg" alt="Opptra" style={{ height: 40, marginBottom: 48, filter: "brightness(0) invert(1)" }} />
      <div style={{ textAlign: "center", maxWidth: 680 }}>
        <h2 style={{ fontFamily: F.heading, fontSize: 52, fontWeight: 300, color: C.white, letterSpacing: "-0.04em", margin: "0 0 20px", lineHeight: 1.1 }}>
          {slide.title}
        </h2>
        {slide.tagline && (
          <p style={{ fontFamily: F.body, fontSize: 17, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: 0 }}>{slide.tagline}</p>
        )}
      </div>
      <div style={{ position: "absolute", bottom: 32, fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>OPPTRA · CONFIDENTIAL</div>
    </div>
  );
}

function RenderSlide({ slide }: { slide: SlideData }) {
  switch (slide.type) {
    case "title": return <RenderTitleSlide slide={slide} />;
    case "kpi": return <RenderKpiSlide slide={slide} />;
    case "list": return <RenderListSlide slide={slide} />;
    case "comparison": return <RenderComparisonSlide slide={slide} />;
    case "action": return <RenderActionSlide slide={slide} />;
    case "close": return <RenderCloseSlide slide={slide} />;
    default: return <RenderListSlide slide={slide} />;
  }
}

// ── AI Prompt for slide generation ──────────────────────────────────────────
const SYSTEM_PROMPT = `You are a presentation builder for Opptra, a brand distribution company operating across GCC, India, and SEA markets in Beauty and Fashion verticals.

Generate a JSON array of 5-7 slide objects for a professional presentation. Each slide must have a "type" field.

Slide types and required fields:
- "title": { type, title, subtitle }
- "kpi": { type, title, subtitle, kpis: [{ value, label, sub? }] } — max 5 KPIs
- "list": { type, title, subtitle, bullets: string[] } — max 6 bullets
- "comparison": { type, title, subtitle, left: { heading, items: string[] }, right: { heading, items: string[] } } — max 5 items each
- "action": { type, title, subtitle, actions: [{ label, detail, owner? }] } — max 4 actions
- "close": { type, title, tagline }

Rules:
- First slide MUST be type "title"
- Last slide MUST be type "close"
- Use real business language, specific numbers where possible
- Keep text concise — this is for slides, not documents
- Return ONLY the JSON array, no markdown, no explanation`;

// ── Main Component ──────────────────────────────────────────────────────────
export function PresentationPage() {
  const [mode, setMode] = useState<"home" | "presenting">("home");
  const [decks, setDecks] = useState<SavedDeck[]>(loadDecks);
  const [activeDeck, setActiveDeck] = useState<SavedDeck | null>(null);
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const slides = activeDeck?.slides || [];
  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(slides.length - 1, c + 1)), []);

  useEffect(() => {
    if (mode !== "presenting") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); prev(); }
      if (e.key === "f" || e.key === "F") { toggleFs(); }
      if (e.key === "Escape") {
        if (fullscreen) { setFullscreen(false); document.exitFullscreen?.().catch(() => {}); }
        else { setMode("home"); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, next, prev, fullscreen, slides.length]);

  function toggleFs() {
    if (!fullscreen) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setFullscreen(false);
    }
  }

  async function handleGenerate() {
    if (!topic.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const prompt = `${SYSTEM_PROMPT}\n\nTopic: ${topic.trim()}${context.trim() ? `\n\nAdditional context:\n${context.trim()}` : ""}\n\nGenerate the slide deck JSON:`;
      const res = await queryAgent(prompt);
      const text = res.answer.trim();
      // Extract JSON from response (may be wrapped in code blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("AI did not return valid slide data. Try again.");
      const parsed: SlideData[] = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed) || parsed.length < 2) throw new Error("Generated deck too short. Try again with more detail.");

      const deck: SavedDeck = {
        id: Date.now().toString(),
        topic: topic.trim(),
        slides: parsed,
        createdAt: new Date().toISOString(),
      };

      const updated = [deck, ...decks];
      setDecks(updated);
      saveDecks(updated);
      setActiveDeck(deck);
      setCurrent(0);
      setMode("presenting");
      setTopic("");
      setContext("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate presentation. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  function openDeck(deck: SavedDeck) {
    setActiveDeck(deck);
    setCurrent(0);
    setMode("presenting");
  }

  function deleteDeck(id: string) {
    const updated = decks.filter(d => d.id !== id);
    setDecks(updated);
    saveDecks(updated);
  }

  // ── HOME MODE ──────────────────────────────────────────────────────────────
  if (mode === "home") {
    return (
      <div style={{ fontFamily: F.body, minHeight: "calc(100vh - 60px)", background: "#0a0e28", padding: "40px 48px" }}>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link href="https://fonts.googleapis.com/css2?family=Spectral:wght@300;600;700&family=Raleway:wght@400;500;600&display=swap" rel="stylesheet" />

        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>AI Presentation Builder</div>
            <h1 style={{ fontFamily: F.heading, fontSize: 44, fontWeight: 300, color: C.white, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
              Create a <span style={{ fontWeight: 700, color: C.orange }}>Presentation</span>
            </h1>
            <p style={{ fontFamily: F.body, fontSize: 15, color: "rgba(255,255,255,0.5)", margin: 0 }}>
              Tell AI what you want to present — it will generate a branded Opptra slide deck for you.
            </p>
          </div>

          {/* Create form */}
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "28px 32px", marginBottom: 32 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                What do you want to present?
              </label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Present Nudestix brand opportunity to the GCC team"
                onKeyDown={e => e.key === "Enter" && !generating && handleGenerate()}
                style={{
                  width: "100%", padding: "14px 18px", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)",
                  color: C.white, fontFamily: F.body, fontSize: 15, outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                Additional context (optional)
              </label>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Add any numbers, brand details, market info, or specific points to cover..."
                rows={3}
                style={{
                  width: "100%", padding: "14px 18px", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)",
                  color: C.white, fontFamily: F.body, fontSize: 14, outline: "none",
                  resize: "vertical", boxSizing: "border-box"
                }}
              />
            </div>

            {error && (
              <div style={{ padding: "10px 16px", borderRadius: 8, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontFamily: F.body, fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              onClick={() => void handleGenerate()}
              disabled={generating || !topic.trim()}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 28px", borderRadius: 10, border: "none",
                background: generating || !topic.trim() ? "rgba(255,255,255,0.1)" : C.orange,
                color: C.white, fontFamily: F.body, fontSize: 14, fontWeight: 600,
                cursor: generating || !topic.trim() ? "default" : "pointer",
                transition: "background 0.2s"
              }}
            >
              {generating ? (
                <>
                  <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: C.white, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Generating slides...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Presentation
                </>
              )}
            </button>
          </div>

          {/* Quick templates */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Quick Ideas</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                "Portfolio overview for leadership",
                "Nudestix brand pitch for GCC retailers",
                "Fashion pipeline quarterly review",
                "Beauty vs Fashion market comparison",
                "Revenue forecast presentation",
                "New brand onboarding proposal",
              ].map(t => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  style={{
                    padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)",
                    fontFamily: F.body, fontSize: 12, cursor: "pointer", transition: "all 0.15s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.orange; e.currentTarget.style.color = C.orange; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Saved decks */}
          {decks.length > 0 && (
            <div>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
                Your Presentations ({decks.length})
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {decks.map(deck => (
                  <div
                    key={deck.id}
                    style={{
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 14, padding: "20px 24px", cursor: "pointer", transition: "border-color 0.15s",
                      position: "relative"
                    }}
                    onClick={() => openDeck(deck)}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,88,0,0.4)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  >
                    <div style={{ fontFamily: F.body, fontSize: 15, fontWeight: 600, color: C.white, marginBottom: 6 }}>{deck.topic}</div>
                    <div style={{ fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                      {deck.slides.length} slides · {new Date(deck.createdAt).toLocaleDateString()}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteDeck(deck.id); }}
                      style={{
                        position: "absolute", top: 12, right: 12, width: 28, height: 28,
                        borderRadius: 6, border: "none", background: "transparent",
                        color: "rgba(255,255,255,0.25)", cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center"
                      }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── PRESENTING MODE ────────────────────────────────────────────────────────
  const slideData = slides[current];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", background: "#0a0e28", fontFamily: F.body }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" />
      <link href="https://fonts.googleapis.com/css2?family=Spectral:wght@300;600;700&family=Raleway:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Slide area */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px 12px", overflow: "hidden" }}>
        <div style={{ width: "100%", maxWidth: 1100, aspectRatio: "16/9", background: C.navy, borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", position: "relative" }}>
          {slideData && <RenderSlide slide={slideData} />}
        </div>
      </div>

      {/* Controls bar */}
      <div style={{ padding: "10px 24px 16px", display: "flex", alignItems: "center", gap: 16 }}>
        {/* Back */}
        <button
          onClick={() => { setMode("home"); setFullscreen(false); }}
          style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: C.white, cursor: "pointer", fontFamily: F.body, fontSize: 12, fontWeight: 600 }}
        >
          Back
        </button>

        {/* Prev */}
        <button onClick={prev} disabled={current === 0}
          style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: current === 0 ? "rgba(255,255,255,0.2)" : C.white, cursor: current === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={18} />
        </button>

        {/* Slide dots */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          {slides.map((s, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "4px 6px" }}>
              <div style={{ width: i === current ? 24 : 8, height: 6, borderRadius: 3, background: i === current ? C.orange : "rgba(255,255,255,0.2)", transition: "all 0.25s" }} />
              <span style={{ fontSize: 10, color: i === current ? C.orange : "rgba(255,255,255,0.3)", fontFamily: F.body, fontWeight: 600, transition: "color 0.2s", maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.title?.slice(0, 12) || `Slide ${i + 1}`}
              </span>
            </button>
          ))}
        </div>

        {/* Counter */}
        <span style={{ fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,0.35)", minWidth: 50, textAlign: "center" }}>
          {current + 1} / {slides.length}
        </span>

        {/* Fullscreen */}
        <button onClick={toggleFs}
          style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>

        {/* Next */}
        <button onClick={next} disabled={current === slides.length - 1}
          style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: current === slides.length - 1 ? "rgba(255,255,255,0.03)" : C.orange, color: C.white, cursor: current === slides.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ textAlign: "center", paddingBottom: 8, fontFamily: F.body, fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>
        Arrow keys to navigate · F for fullscreen · Esc to go back
      </div>
    </div>
  );
}

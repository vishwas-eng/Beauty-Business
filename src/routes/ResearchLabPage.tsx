import { useEffect, useMemo, useRef, useState } from "react";
import { loadStoredDashboard } from "../lib/storage";
import { queryAgent } from "../lib/api";
import {
  Bot, Brain, Check, ChevronRight, Copy, Download,
  FlaskConical, Loader2, Play, RotateCcw, Sparkles, X,
} from "lucide-react";

// ── Agent definitions ─────────────────────────────────────────────────────────

interface AgentDef {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  description: string;
}

interface AgentMessage {
  agentId: string;
  agentName: string;
  agentRole: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  content: string;
  timestamp: string;
  isSynthesis?: boolean;
}

export const RESEARCH_AGENTS: AgentDef[] = [
  {
    id: "market-scout",
    name: "Market Scout",
    role: "Market Intelligence",
    emoji: "🔭",
    color: "#3b82f6",
    bg: "#3b82f60a",
    border: "#3b82f628",
    description: "Analyses market size, trends, and macro opportunity",
  },
  {
    id: "rival-tracker",
    name: "Rival Tracker",
    role: "Competitive Intelligence",
    emoji: "⚔️",
    color: "#f97316",
    bg: "#f973160a",
    border: "#f9731628",
    description: "Maps competitors and finds exploitable gaps",
  },
  {
    id: "consumer-whisperer",
    name: "Consumer Whisperer",
    role: "Consumer Insights",
    emoji: "🧠",
    color: "#8b5cf6",
    bg: "#8b5cf60a",
    border: "#8b5cf628",
    description: "Profiles target consumers and purchase behaviour",
  },
  {
    id: "brand-oracle",
    name: "Brand Oracle",
    role: "Brand Strategy",
    emoji: "✨",
    color: "#22c55e",
    bg: "#22c55e0a",
    border: "#22c55e28",
    description: "Recommends positioning, pricing, and channels",
  },
  {
    id: "synthesis-engine",
    name: "Synthesis Engine",
    role: "Executive Report",
    emoji: "📋",
    color: "#FF5800",
    bg: "#FF58000a",
    border: "#FF580028",
    description: "Compiles all findings into an actionable brief",
  },
];

const MARKETS = ["India", "SEA", "GCC", "Global", "Under Discussion"];

function buildPrompt(
  agentId: string,
  topic: string,
  brand: string,
  market: string,
  prev: AgentMessage[]
): string {
  const context = prev
    .map(m => `${m.emoji} ${m.agentName} (${m.agentRole}):\n${m.content.substring(0, 300)}...`)
    .join("\n\n");

  switch (agentId) {
    case "market-scout":
      return `You are Market Scout, a market intelligence specialist for the beauty & personal care sector.
Research brief: "${topic}"
Brand in focus: ${brand} | Target market: ${market}

Analyse and report:
1. Current market size and growth trajectory for this category in ${market}
2. 2–3 macro consumer trends driving demand right now
3. The biggest white-space opportunity you see
4. One key risk or headwind to flag

Be specific, cite plausible data ranges, keep each point to 2–3 sharp sentences.
Sign off as "— Market Scout 🔭"`;

    case "rival-tracker":
      return `You are Rival Tracker, a competitive intelligence agent specialising in beauty & personal care.
Research brief: "${topic}"
Brand: ${brand} | Market: ${market}

Market Scout has already briefed the team:
${context}

Building on that, now deliver:
1. The 3–4 main competitors in this space and their core strategy
2. Exploitable competitive gaps or positioning white spaces
3. Where ${brand} has a genuine differentiation advantage
4. One competitor move to watch closely — and how to counter it

Challenge Market Scout if you see something different. Be opinionated.
Sign off as "— Rival Tracker ⚔️"`;

    case "consumer-whisperer":
      return `You are Consumer Whisperer, a consumer psychology specialist.
Research brief: "${topic}"
Brand: ${brand} | Market: ${market}

Team findings so far:
${context}

Now bring the human dimension:
1. Precise target consumer profile for ${brand} in ${market} (age, income, values, digital behaviour)
2. Top 3 purchase triggers — what makes them buy
3. Top 2 barriers — what stops them
4. Where they discover beauty brands: platforms, influencers, formats
5. One counterintuitive consumer insight that the other agents may have missed

Sign off as "— Consumer Whisperer 🧠"`;

    case "brand-oracle":
      return `You are Brand Oracle, a brand positioning and go-to-market strategist.
Research brief: "${topic}"
Brand: ${brand} | Market: ${market}

Full team brief:
${context}

Synthesise into concrete, opinionated strategy:
1. The single most powerful positioning angle for ${brand} in ${market} — one crisp sentence
2. Price positioning recommendation with rationale
3. Top 2–3 channels to prioritise in year 1 and why
4. The one make-or-break factor for this launch
5. If you had to bet — is this a go or a no? State your conviction level.

Push back on the team where needed. Make a call.
Sign off as "— Brand Oracle ✨"`;

    case "synthesis-engine":
      return `You are the Synthesis Engine for Lumara, Opptra's AI research system.
Research brief: "${topic}"
Brand: ${brand} | Market: ${market}

Full multi-agent research session:
${context}

Compile into a structured executive brief — use exactly these headers:

## MARKET VERDICT
[2 sentences: Is this market attractive for ${brand}? What is the headline opportunity?]

## COMPETITIVE EDGE
[2 sentences: The defensible competitive angle the team agrees on]

## TARGET CONSUMER
[1 crisp sentence: Who to acquire first and the core hook]

## 90-DAY ACTION PLAN
1. [Specific action — owner — deadline]
2. [Specific action — owner — deadline]
3. [Specific action — owner — deadline]

## RISK WATCH
[One key risk and its mitigation]

## AGENT CONSENSUS SCORE
[Score 1–10 on how aligned the agents were, and why]

Sign off as "— Synthesis Engine 📋 · Lumara Multi-Agent Research"`;

    default:
      return topic;
  }
}

// ── Saved reports ─────────────────────────────────────────────────────────────

const REPORTS_KEY = "lumara-research-reports-v1";

interface SavedReport {
  id: string;
  topic: string;
  brand: string;
  market: string;
  messages: AgentMessage[];
  savedAt: string;
}

function loadReports(): SavedReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    return raw ? (JSON.parse(raw) as SavedReport[]) : [];
  } catch { return []; }
}

function saveReport(report: SavedReport) {
  const all = loadReports();
  const updated = [report, ...all.filter(r => r.id !== report.id)].slice(0, 10);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
}

// ─────────────────────────────────────────────────────────────────────────────

export function ResearchLabPage() {
  const dashboard = useMemo(() => loadStoredDashboard(), []);
  const rows = dashboard.performance ?? [];
  const brands = useMemo(() => [...new Set(rows.map(r => r.brand))].sort(), [rows]);

  const [tab, setTab] = useState<"lab" | "reports">("lab");
  const [topic, setTopic] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(brands[0] ?? "");
  const [selectedMarket, setSelectedMarket] = useState("India");
  const [enabledAgents, setEnabledAgents] = useState<Set<string>>(
    new Set(RESEARCH_AGENTS.map(a => a.id))
  );

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);

  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReports(loadReports());
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, activeAgentId]);

  function toggleAgent(id: string) {
    setEnabledAgents(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  async function runResearch() {
    if (!topic.trim() || running) return;
    setMessages([]);
    setDone(false);
    setRunning(true);
    setActiveAgentId(null);
    setTab("lab");

    const activeAgents = RESEARCH_AGENTS.filter(a => enabledAgents.has(a.id));
    const collected: AgentMessage[] = [];

    for (const agent of activeAgents) {
      setActiveAgentId(agent.id);
      await new Promise(r => setTimeout(r, 600));

      const prompt = buildPrompt(agent.id, topic, selectedBrand, selectedMarket, collected);
      const res = await queryAgent(prompt);

      const msg: AgentMessage = {
        agentId: agent.id,
        agentName: agent.name,
        agentRole: agent.role,
        emoji: agent.emoji,
        color: agent.color,
        bg: agent.bg,
        border: agent.border,
        content: res.answer,
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        isSynthesis: agent.id === "synthesis-engine",
      };

      collected.push(msg);
      setMessages([...collected]);
    }

    setRunning(false);
    setActiveAgentId(null);
    setDone(true);

    // Auto-save
    const report: SavedReport = {
      id: `report-${Date.now()}`,
      topic,
      brand: selectedBrand,
      market: selectedMarket,
      messages: collected,
      savedAt: new Date().toISOString(),
    };
    saveReport(report);
    setReports(loadReports());
  }

  function copyReport() {
    const text = messages.map(m =>
      `${m.emoji} ${m.agentName} (${m.agentRole})\n${"─".repeat(40)}\n${m.content}\n`
    ).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setMessages([]);
    setDone(false);
    setTopic("");
  }

  function loadSavedReport(report: SavedReport) {
    setSelectedReport(report);
    setMessages(report.messages);
    setDone(true);
    setSelectedBrand(report.brand);
    setSelectedMarket(report.market);
    setTopic(report.topic);
    setTab("lab");
  }

  const displayMessages = selectedReport
    ? (selectedReport.messages.length > 0 ? selectedReport.messages : messages)
    : messages;

  return (
    <div className="lab-page">
      {/* Header */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="strategy-breadcrumb">Research Lab</div>
          <h2 className="strategy-title">Multi-Agent Market Research</h2>
          <p className="strategy-subtitle">
            Five specialist AI agents collaborate in real-time — each reading the previous agents' findings
            and building on them to produce a layered, executive-grade market brief.
          </p>
        </div>
        <div className="lab-agent-badges">
          {RESEARCH_AGENTS.map(a => (
            <span key={a.id} className="lab-agent-chip" style={{ color: a.color, background: a.bg, border: `1px solid ${a.border}` }}>
              {a.emoji} {a.name}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="intel-tabs">
        <button className={`intel-tab ${tab === "lab" ? "is-active" : ""}`} onClick={() => { setTab("lab"); setSelectedReport(null); }}>
          <FlaskConical size={14} /> Live Research
        </button>
        <button className={`intel-tab ${tab === "reports" ? "is-active" : ""}`} onClick={() => setTab("reports")}>
          <Brain size={14} /> Saved Reports
          {reports.length > 0 && <span className="intel-tab-count">{reports.length}</span>}
        </button>
      </div>

      {/* Reports list */}
      {tab === "reports" && (
        <div className="lab-reports-grid">
          {reports.length === 0 ? (
            <div className="mosaic-empty panel">
              <Brain size={32} color="#6366f1" />
              <p>No research sessions saved yet. Run your first research in the Live Research tab.</p>
            </div>
          ) : (
            reports.map(r => (
              <div key={r.id} className="lab-report-card" onClick={() => loadSavedReport(r)}>
                <div className="lab-report-top">
                  <span className="lab-report-brand">{r.brand}</span>
                  <span className="lab-report-market">{r.market}</span>
                </div>
                <div className="lab-report-topic">"{r.topic}"</div>
                <div className="lab-report-meta">
                  {r.messages.length} agents · {new Date(r.savedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
                <div className="lab-report-agents">
                  {r.messages.map(m => (
                    <span key={m.agentId} title={m.agentName}>{m.emoji}</span>
                  ))}
                </div>
                <button className="lab-report-open-btn">
                  Open Report <ChevronRight size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Lab workspace */}
      {tab === "lab" && (
        <div className="lab-workspace">
          {/* ── Left: Brief panel ── */}
          <div className="lab-brief-panel panel">
            <div className="lab-brief-header">
              <FlaskConical size={16} color="#6366f1" />
              <strong>Research Brief</strong>
            </div>

            <div className="lab-field">
              <label>Brand</label>
              <select
                className="fit-select"
                value={selectedBrand}
                onChange={e => setSelectedBrand(e.target.value)}
                disabled={running}
              >
                {brands.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>

            <div className="lab-field">
              <label>Target Market</label>
              <select
                className="fit-select"
                value={selectedMarket}
                onChange={e => setSelectedMarket(e.target.value)}
                disabled={running}
              >
                {MARKETS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            <div className="lab-field">
              <label>Research Question</label>
              <textarea
                className="lab-topic-input"
                placeholder="e.g. Should we launch Nudestix in India's Tier-1 cities? What is the market opportunity for K-Beauty skincare in SEA?"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                disabled={running}
                rows={4}
              />
            </div>

            {/* Agent toggles */}
            <div className="lab-field">
              <label>Active Agents</label>
              <div className="lab-agent-toggles">
                {RESEARCH_AGENTS.map(a => {
                  const on = enabledAgents.has(a.id);
                  return (
                    <button
                      key={a.id}
                      className={`lab-agent-toggle ${on ? "is-on" : ""}`}
                      style={on ? { borderColor: a.color, background: a.bg, color: a.color } : {}}
                      onClick={() => toggleAgent(a.id)}
                      disabled={running}
                      title={a.description}
                    >
                      <span>{a.emoji}</span>
                      <span className="lab-toggle-name">{a.name}</span>
                      {on && <Check size={10} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              className="lab-run-btn"
              onClick={runResearch}
              disabled={running || !topic.trim()}
            >
              {running ? (
                <><Loader2 size={16} className="lab-spin" /> Agents researching...</>
              ) : (
                <><Play size={15} /> Run Research</>
              )}
            </button>

            {done && (
              <div className="lab-done-actions">
                <button className="btn-secondary lab-action-btn" onClick={copyReport}>
                  {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy Report</>}
                </button>
                <button className="btn-ghost lab-action-btn" onClick={reset}>
                  <RotateCcw size={13} /> Reset
                </button>
              </div>
            )}
          </div>

          {/* ── Right: Chat feed ── */}
          <div className="lab-chat-panel">
            {/* Agent status bar */}
            <div className="lab-agent-status-bar">
              {RESEARCH_AGENTS.filter(a => enabledAgents.has(a.id)).map(a => {
                const hasSpoken = displayMessages.some(m => m.agentId === a.id);
                const isThinking = activeAgentId === a.id;
                return (
                  <div
                    key={a.id}
                    className={`lab-agent-node ${hasSpoken ? "is-done" : ""} ${isThinking ? "is-active" : ""}`}
                    style={hasSpoken || isThinking ? { borderColor: a.color, background: a.bg } : {}}
                    title={`${a.name} — ${a.role}`}
                  >
                    <span className="lab-node-emoji">{a.emoji}</span>
                    <span className="lab-node-name" style={hasSpoken || isThinking ? { color: a.color } : {}}>{a.name}</span>
                    {isThinking && <span className="lab-typing-dots"><span /><span /><span /></span>}
                    {hasSpoken && !isThinking && <Check size={10} color={a.color} />}
                  </div>
                );
              })}
            </div>

            {/* Messages */}
            <div className="lab-chat-feed" ref={chatRef}>
              {displayMessages.length === 0 && !running && (
                <div className="lab-empty-state">
                  <div className="lab-empty-icon">
                    {RESEARCH_AGENTS.map(a => (
                      <span key={a.id} className="lab-empty-emoji">{a.emoji}</span>
                    ))}
                  </div>
                  <h3>5 agents, one research session</h3>
                  <p>
                    Set your brand, market, and research question on the left.
                    The agents will take turns analysing, debating, and synthesising
                    a complete market intelligence brief.
                  </p>
                  <div className="lab-example-topics">
                    <strong>Example topics</strong>
                    {[
                      "Should we prioritise GCC or India for Ajmal's expansion?",
                      "Is the K-Beauty wave sustainable in SEA — and can we capitalise?",
                      "Men's grooming in India: what's the real opportunity for Beardo?",
                    ].map(t => (
                      <button key={t} className="lab-topic-chip" onClick={() => setTopic(t)}>{t}</button>
                    ))}
                  </div>
                </div>
              )}

              {displayMessages.map((msg, i) => (
                <div
                  key={`${msg.agentId}-${i}`}
                  className={`lab-message ${msg.isSynthesis ? "lab-message-synthesis" : ""}`}
                  style={{ borderColor: msg.border, background: msg.bg }}
                >
                  <div className="lab-msg-header">
                    <div className="lab-msg-agent">
                      <span className="lab-msg-emoji">{msg.emoji}</span>
                      <div>
                        <span className="lab-msg-name" style={{ color: msg.color }}>{msg.agentName}</span>
                        <span className="lab-msg-role">{msg.agentRole}</span>
                      </div>
                    </div>
                    <span className="lab-msg-time">{msg.timestamp}</span>
                  </div>
                  <div className={`lab-msg-content ${msg.isSynthesis ? "lab-msg-synthesis-content" : ""}`}>
                    {msg.content.split("\n").map((line, j) => {
                      if (line.startsWith("## ")) {
                        return <div key={j} className="lab-synthesis-heading">{line.replace("## ", "")}</div>;
                      }
                      if (/^\d\./.test(line) || line.startsWith("- ")) {
                        return <div key={j} className="lab-synthesis-item">{line}</div>;
                      }
                      return line.trim() ? <p key={j} className="lab-msg-para">{line}</p> : null;
                    })}
                  </div>
                  {i < displayMessages.length - 1 && (
                    <div className="lab-handoff">
                      <ChevronRight size={12} />
                      <span>Passed to {displayMessages[i + 1]?.agentName}</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {running && activeAgentId && (
                <div className="lab-thinking-bubble">
                  {(() => {
                    const a = RESEARCH_AGENTS.find(ag => ag.id === activeAgentId);
                    return a ? (
                      <>
                        <span className="lab-thinking-emoji">{a.emoji}</span>
                        <div>
                          <span className="lab-thinking-name" style={{ color: a.color }}>{a.name}</span>
                          <span className="lab-thinking-label"> is analysing</span>
                          <span className="lab-typing-dots"><span /><span /><span /></span>
                        </div>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

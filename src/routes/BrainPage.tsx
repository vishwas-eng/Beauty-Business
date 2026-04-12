import { useEffect, useRef, useState } from "react";
import { Brain, Loader2, Send, Shirt, Sparkles, TrendingUp, Users, Zap } from "lucide-react";

interface BrandSummary {
  total: number; beautyCount: number; fashionCount: number;
  byGeo: Record<string,number>; byStage: Record<string,number>;
  byLob: Record<string,number>; fashionRevenue: number;
  postRiskRev: number; preRiskRev: number;
  activeDeals: number; signedDeals: number; onHold: number;
}
interface Message { role: "user"|"brain"; content: string; ts: string; }

const QUICK_PROMPTS = [
  "What's our total portfolio across beauty and fashion? Summarise key metrics.",
  "Which fashion brands in GCC are at the most advanced stage?",
  "Which beauty brands are going cold and need immediate action?",
  "Give me a combined revenue forecast for India across beauty and fashion.",
  "Compare our India vs GCC vs SEA pipeline strength.",
  "Which quadrant 1A brands haven't signed yet and why?",
  "What are the top risks in our fashion pipeline right now?",
  "Give me a weekly priorities list across both verticals.",
];

export function BrainPage() {
  const [summary, setSummary]   = useState<BrandSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/brain").then(r=>r.json()).then(d => {
      if (d.ok) setSummary(d.summary);
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  async function ask(q: string) {
    if (!q.trim() || thinking) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: q, ts: new Date().toISOString() }]);
    setThinking(true);
    try {
      const res  = await fetch("/api/brain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "brain", content: data.answer || data.error || "No response", ts: new Date().toISOString() }]);
    } catch {
      setMessages(prev => [...prev, { role: "brain", content: "Could not reach the Brain. Check your connection.", ts: new Date().toISOString() }]);
    }
    setThinking(false);
  }

  const fmt = (n: number) => n?.toLocaleString() ?? "0";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>

      {/* Header */}
      <div style={{ padding: "24px 0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#131A48,#FF5800)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Brain size={18} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#131A48", margin: 0 }}>One Brain</h1>
            <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Unified AI intelligence across Beauty + Fashion/Softlines</p>
          </div>
          <span style={{ marginLeft: "auto", background: "#FF580015", color: "#FF5800", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, border: "1px solid #FF580030" }}>LIVE</span>
        </div>
      </div>

      {/* KPI Row */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0", color: "#94a3b8", fontSize: 13 }}>
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading portfolio data...
        </div>
      ) : summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Total Brands", value: fmt(summary.total), icon: <Users size={13} />, color: "#131A48" },
            { label: "Beauty",       value: fmt(summary.beautyCount),  icon: <Sparkles size={13} />, color: "#ec4899" },
            { label: "Fashion",      value: fmt(summary.fashionCount), icon: <Shirt size={13} />,    color: "#8b5cf6" },
            { label: "Active",       value: fmt(summary.activeDeals),  icon: <Zap size={13} />,      color: "#16a34a" },
            { label: "Signed",       value: fmt(summary.signedDeals),  icon: <TrendingUp size={13} />, color: "#2563eb" },
            { label: "On Hold",      value: fmt(summary.onHold),       icon: <Loader2 size={13} />,  color: "#ea580c" },
            { label: "Fashion Rev (Dec'26)", value: `$${fmt(Math.round(summary.fashionRevenue))}K`, icon: <TrendingUp size={13} />, color: "#131A48" },
          ].map((k,i) => (
            <div key={i} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#94a3b8", marginBottom: 6 }}>{k.icon}<span style={{ fontSize: 10 }}>{k.label}</span></div>
              <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Market split */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "By Market", data: summary.byGeo },
            { label: "By Stage",  data: summary.byStage },
            { label: "By LOB",    data: summary.byLob },
          ].map((panel, i) => (
            <div key={i} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{panel.label}</div>
              {Object.entries(panel.data).filter(([k])=>k&&k!=='undefined'&&k!=='').sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ flex: 1, fontSize: 12, color: "#475569" }}>{k}</div>
                  <div style={{ width: 60, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(v/summary.total)*100}%`, background: "#FF5800", borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#131A48", minWidth: 20, textAlign: "right" }}>{v}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ask the Brain</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => ask(p)} style={{
                padding: "6px 12px", fontSize: 12, background: "white",
                border: "1px solid #e2e8f0", borderRadius: 20,
                cursor: "pointer", color: "#475569", transition: "all 0.15s"
              }}>{p.length > 50 ? p.slice(0,50)+"…" : p}</button>
            ))}
          </div>
        </div>
      )}

      {/* Chat */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 12, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
            {m.role === "brain" && (
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#131A48,#FF5800)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <Brain size={14} color="white" />
              </div>
            )}
            <div style={{
              maxWidth: "78%", padding: "12px 16px", borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
              background: m.role === "user" ? "#131A48" : "white",
              border: m.role === "brain" ? "1px solid #e2e8f0" : "none",
              color: m.role === "user" ? "white" : "#1e293b",
              fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap"
            }}>
              {m.content.split('\n').map((line, li) => {
                if (line.startsWith('## ') || line.startsWith('# ')) {
                  return <div key={li} style={{ fontWeight: 700, color: "#FF5800", fontSize: 14, marginTop: li > 0 ? 12 : 0, marginBottom: 4 }}>{line.replace(/^#+\s/, '')}</div>;
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <div key={li} style={{ fontWeight: 700, color: "#131A48" }}>{line.replace(/\*\*/g, '')}</div>;
                }
                if (line.startsWith('- ') || line.startsWith('• ')) {
                  return <div key={li} style={{ display: "flex", gap: 6, marginBottom: 3 }}><span style={{ color: "#FF5800", flexShrink: 0 }}>•</span><span>{line.slice(2)}</span></div>;
                }
                return <div key={li} style={{ marginBottom: line ? 0 : 4 }}>{line}</div>;
              })}
            </div>
          </div>
        ))}
        {thinking && (
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#131A48,#FF5800)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Brain size={14} color="white" />
            </div>
            <div style={{ padding: "12px 16px", background: "white", border: "1px solid #e2e8f0", borderRadius: "12px 12px 12px 4px", display: "flex", gap: 5, alignItems: "center" }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF5800", animation: `bounce 1.2s ${i*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 0 20px", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && ask(input)}
            placeholder="Ask anything across beauty + fashion pipeline, revenue, markets..."
            style={{ flex: 1, padding: "12px 16px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", background: "white" }}
          />
          <button onClick={() => ask(input)} disabled={thinking || !input.trim()} style={{
            padding: "12px 20px", background: thinking ? "#94a3b8" : "#FF5800", color: "white",
            border: "none", borderRadius: 10, cursor: thinking ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600
          }}>
            {thinking ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={16} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
      `}</style>
    </div>
  );
}

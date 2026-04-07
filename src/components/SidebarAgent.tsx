import { FormEvent, useState } from "react";
import { Bot, SendHorizontal } from "lucide-react";
import { queryAgent } from "../lib/api";
import { AgentResponse } from "../types/domain";

const quickPrompts = [
  "What should I focus on this week?",
  "Show brands waiting for NDA details",
  "What is happening with Beardo?"
];

export function SidebarAgent() {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<
    Array<{
      role: "user" | "assistant";
      text: string;
      rows?: AgentResponse["rows"];
      suggestions?: string[];
    }>
  >([]);

  async function runQuery(nextQuery: string) {
    if (!nextQuery.trim()) {
      return;
    }

    setBusy(true);
    setHistory((current) => [...current, { role: "user", text: nextQuery }]);

    try {
      const next = await queryAgent(nextQuery);
      setHistory((current) => [
        ...current,
        {
          role: "assistant",
          text: next.answer,
          rows: next.rows.slice(0, 3),
          suggestions: next.suggestions.slice(0, 2)
        }
      ]);
      setQuery("");
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void runQuery(query);
  }

  return (
    <section className="sidebar-agent">
      <div className="sidebar-agent-header">
        <Bot size={16} />
        <div>
          <strong>Agent</strong>
          <p className="brand-subtitle">Ask across tracker rows, emails, legal status, and documents.</p>
        </div>
      </div>

      <div className="sidebar-agent-prompts">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="ghost-button sidebar-agent-prompt"
            onClick={() => void runQuery(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="sidebar-agent-chat">
        {history.length === 0 ? (
          <div className="agent-empty-state">
            <div className="agent-bubble agent-bubble-assistant">
              Ask about a brand, legal blocker, market, category, or document like a term sheet.
            </div>
          </div>
        ) : (
          history.slice(-8).map((item, index) => (
            <div
              key={`${item.role}-${index}-${item.text.slice(0, 24)}`}
              className={
                item.role === "user"
                  ? "agent-message agent-message-user"
                  : "agent-message agent-message-assistant"
              }
            >
              <div
                className={
                  item.role === "user"
                    ? "agent-bubble agent-bubble-user"
                    : "agent-bubble agent-bubble-assistant"
                }
              >
                {item.text}
              </div>
              {item.role === "assistant" && item.rows && item.rows.length > 0 ? (
                <div className="agent-inline-results">
                  {item.rows.map((row, rowIndex) => (
                    <div key={`${row.brand}-${rowIndex}`} className="agent-inline-card">
                      <strong>{row.brand}</strong>
                      <span>{row.stage ?? row.ndaStatus ?? row.market ?? "Update"}</span>
                      {row.summary ? <p>{row.summary}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
              {item.role === "assistant" && item.suggestions && item.suggestions.length > 0 ? (
                <div className="agent-followups">
                  {item.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="ghost-button agent-followup-chip"
                      onClick={() => void runQuery(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
        {busy ? (
          <div className="agent-message agent-message-assistant">
            <div className="agent-bubble agent-bubble-assistant agent-typing">Thinking...</div>
          </div>
        ) : null}
      </div>

      <form className="sidebar-agent-form" onSubmit={handleSubmit}>
        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Message Agent"
          rows={3}
        />
        <button
          className="primary-button sidebar-agent-button"
          type="submit"
          disabled={busy || !query.trim()}
        >
          <SendHorizontal size={14} />
        </button>
      </form>
    </section>
  );
}

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Bot, SendHorizontal, X } from "lucide-react";
import { queryAgent } from "../lib/api";

const starterChips = [
  "What needs attention today?",
  "Which brands are most at risk?",
  "Summarize the pipeline",
  "Which stage is the bottleneck?"
];

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export function SidebarAgent({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [history, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setQuery("");
    setBusy(true);
    setHistory((prev) => [...prev, { role: "user", text: trimmed }]);

    try {
      const res = await queryAgent(trimmed);
      setHistory((prev) => [...prev, { role: "assistant", text: res.answer }]);
    } catch {
      setHistory((prev) => [
        ...prev,
        { role: "assistant", text: "Something went wrong. Please try again." }
      ]);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void send(query);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(query);
    }
  }

  function renderAssistantText(text: string) {
    const sanitized = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = sanitized.replace(/\n/g, "<br/>");
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return (
    <section className="sidebar-agent">
      <div className="sidebar-agent-header">
        <div className="agent-drawer-title">
          <Bot size={16} />
          <div>
            <strong>Ask AI</strong>
            <p className="brand-subtitle">
              Ask anything about your pipeline, brands, or strategy.
            </p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            className="ghost-button agent-close-button"
            onClick={onClose}
            aria-label="Close AI chat"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      {history.length === 0 ? (
        <div className="sidebar-agent-prompts">
          {starterChips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="ghost-button sidebar-agent-prompt"
              onClick={() => setQuery(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      <div className="sidebar-agent-chat" ref={chatRef}>
        {history.length === 0 ? (
          <div className="agent-message agent-message-assistant">
            <div className="agent-bubble agent-bubble-assistant">
              Ask anything about the current business view and I will answer
              from the latest dashboard data.
            </div>
          </div>
        ) : (
          history.map((msg, i) => (
            <div
              key={`${msg.role}-${i}`}
              className={
                msg.role === "user"
                  ? "agent-message agent-message-user"
                  : "agent-message agent-message-assistant"
              }
            >
              <div
                className={
                  msg.role === "user"
                    ? "agent-bubble agent-bubble-user"
                    : "agent-bubble agent-bubble-assistant"
                }
              >
                {msg.role === "user" ? msg.text : renderAssistantText(msg.text)}
              </div>
            </div>
          ))
        )}
        {busy ? (
          <div className="agent-message agent-message-assistant">
            <div className="agent-bubble agent-bubble-assistant agent-typing">
              Thinking...
            </div>
          </div>
        ) : null}
      </div>

      <form className="sidebar-agent-form" onSubmit={handleSubmit}>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about any brand, market, category, or stage"
          rows={2}
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

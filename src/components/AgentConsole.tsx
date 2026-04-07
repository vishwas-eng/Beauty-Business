import { FormEvent, useState } from "react";
import { Bot, Database, SendHorizontal } from "lucide-react";
import { AgentResponse } from "../types/domain";

interface AgentConsoleProps {
  response: AgentResponse | null;
  busy: boolean;
  onSubmit(query: string): void;
}

const starterPrompts = [
  "Which brands are waiting for NDA details?",
  "Show brands in commercials",
  "Which brands are on hold?",
  "What should I focus on this week?"
];

export function AgentConsole({ response, busy, onSubmit }: AgentConsoleProps) {
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(query);
  }

  return (
    <div className="page-stack">
      <section className="panel agent-panel">
        <div className="panel-header">
          <div>
            <h2>Agent</h2>
            <p>Ask in plain language. The agent maps your question to structured data behind the scenes.</p>
          </div>
        </div>

        <form className="agent-form" onSubmit={handleSubmit}>
          <div className="agent-input-wrap">
            <Bot size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask about brands, stages, NDA status, markets, or next steps"
            />
          </div>
          <button className="primary-button" type="submit" disabled={busy || !query.trim()}>
            <SendHorizontal size={16} />
            {busy ? "Running..." : "Run query"}
          </button>
        </form>

        <div className="agent-prompt-list">
          {starterPrompts.map((prompt) => (
            <button
              key={prompt}
              className="secondary-button"
              onClick={() => {
                setQuery(prompt);
                onSubmit(prompt);
              }}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      {response ? (
        <section className="content-grid">
          <div className="panel content-span-2">
            <div className="panel-header">
              <div>
                <h2>Answer</h2>
                <p>{response.answer}</p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Market</th>
                    <th>Stage</th>
                    <th>Category</th>
                    <th>Owner</th>
                    <th>NDA Status</th>
                    <th>Next Step</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {response.rows.length > 0 ? (
                    response.rows.map((row, index) => (
                      <tr key={`${row.brand}-${index}`}>
                        <td>{row.brand}</td>
                        <td>{row.market ?? "—"}</td>
                        <td>{row.stage ?? "—"}</td>
                        <td>{row.category ?? "—"}</td>
                        <td>{row.owner ?? "—"}</td>
                        <td>{row.ndaStatus ?? "—"}</td>
                        <td>{row.nextStep ?? "—"}</td>
                        <td>{row.summary ?? "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="empty-state-cell">
                        No rows returned for this query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel mini-panel">
            <div className="panel-header">
              <div>
                <h2>Query Plan</h2>
                <p>How the agent interpreted your question.</p>
              </div>
            </div>

            <div className="agent-query-card">
              <div className="context-card-title">
                <Database size={16} />
                <strong>SQL preview</strong>
              </div>
              <pre className="nda-email-preview">{response.sqlPreview}</pre>
            </div>

            <div className="agent-query-card">
              <div className="context-card-title">
                <Bot size={16} />
                <strong>Suggested follow-ups</strong>
              </div>
              <div className="context-list compact-list">
                {response.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    className="ghost-button agent-suggestion"
                    onClick={() => {
                      setQuery(suggestion);
                      onSubmit(suggestion);
                    }}
                    type="button"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

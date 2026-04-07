import { useState } from "react";
import { AgentConsole } from "../components/AgentConsole";
import { queryAgent } from "../lib/api";
import { AgentResponse } from "../types/domain";

export function AgentPage() {
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<AgentResponse | null>(null);

  async function handleQuery(query: string) {
    setBusy(true);
    try {
      const next = await queryAgent(query);
      setResponse(next);
    } finally {
      setBusy(false);
    }
  }

  return <AgentConsole response={response} busy={busy} onSubmit={handleQuery} />;
}

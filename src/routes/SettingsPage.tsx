import { FormEvent, useEffect, useState } from "react";
import { Bot, Database, Save, Workflow } from "lucide-react";
import { getAutomationConfig, persistAutomationConfig, runAutomation } from "../lib/api";
import { defaultAutomationConfig } from "../lib/liveSnapshot";
import { AutomationConfig } from "../types/domain";

export function SettingsPage() {
  const [config, setConfig] = useState<AutomationConfig>(defaultAutomationConfig);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getAutomationConfig().then(setConfig);
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await persistAutomationConfig(config);
    setMessage("Automation architecture saved.");
  }

  async function handleRun() {
    setBusy(true);
    await runAutomation("mtd");
    setBusy(false);
    setMessage("Automation run triggered. Sheets, Notion, and Claude were refreshed.");
  }

  return (
    <div className="page-stack">
      <section className="panel settings-panel">
        <div className="panel-header">
          <div>
            <h2>Automated Data Architecture</h2>
            <p>Configure Google Sheets, Notion, Claude, and the refresh schedule in one place.</p>
          </div>
        </div>

        <form className="settings-form" onSubmit={handleSubmit}>
          <div className="settings-grid">
            <div className="config-card">
              <div className="config-card-title">
                <Database size={18} />
                <strong>Google Sheets</strong>
              </div>

              <label>
                Sheet ID
                <input
                  value={config.sheet.sheetId}
                  onChange={(event) =>
                    setConfig({ ...config, sheet: { ...config.sheet, sheetId: event.target.value } })
                  }
                  placeholder="1AbCdEf..."
                />
              </label>

              <label>
                Tab name
                <input
                  value={config.sheet.tabName}
                  onChange={(event) =>
                    setConfig({ ...config, sheet: { ...config.sheet, tabName: event.target.value } })
                  }
                  placeholder="Sales"
                />
              </label>

              <label>
                Range
                <input
                  value={config.sheet.range}
                  onChange={(event) =>
                    setConfig({ ...config, sheet: { ...config.sheet, range: event.target.value } })
                  }
                  placeholder="A1:L500"
                />
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={config.sheet.enabled}
                  onChange={(event) =>
                    setConfig({ ...config, sheet: { ...config.sheet, enabled: event.target.checked } })
                  }
                />
                Enable sheet sync
              </label>
            </div>

            <div className="config-card">
              <div className="config-card-title">
                <Workflow size={18} />
                <strong>Notion Control Center</strong>
              </div>

              <label>
                Database ID
                <input
                  value={config.notion.databaseId}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      notion: { ...config.notion, databaseId: event.target.value }
                    })
                  }
                  placeholder="Database or data source ID"
                />
              </label>

              <label>
                Title field
                <input
                  value={config.notion.titleField}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      notion: { ...config.notion, titleField: event.target.value }
                    })
                  }
                />
              </label>

              <label>
                Category field
                <input
                  value={config.notion.categoryField}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      notion: { ...config.notion, categoryField: event.target.value }
                    })
                  }
                />
              </label>

              <label>
                Notes field
                <input
                  value={config.notion.notesField}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      notion: { ...config.notion, notesField: event.target.value }
                    })
                  }
                />
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={config.notion.enabled}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      notion: { ...config.notion, enabled: event.target.checked }
                    })
                  }
                />
                Enable Notion sync
              </label>
            </div>

            <div className="config-card">
              <div className="config-card-title">
                <Bot size={18} />
                <strong>Claude Insights</strong>
              </div>

              <label>
                Claude model
                <input
                  value={config.claude.model}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      claude: { ...config.claude, model: event.target.value }
                    })
                  }
                  placeholder="claude-3-5-sonnet-latest"
                />
              </label>

              <label>
                Max tokens
                <input
                  type="number"
                  value={config.claude.maxTokens}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      claude: { ...config.claude, maxTokens: Number(event.target.value) }
                    })
                  }
                />
              </label>

              <label>
                System prompt
                <input
                  value={config.claude.systemPrompt}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      claude: { ...config.claude, systemPrompt: event.target.value }
                    })
                  }
                />
              </label>

              <label>
                Schedule minutes
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={config.scheduleMinutes}
                  onChange={(event) =>
                    setConfig({ ...config, scheduleMinutes: Number(event.target.value) })
                  }
                />
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={config.claude.enabled}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      claude: { ...config.claude, enabled: event.target.checked }
                    })
                  }
                />
                Enable Claude summaries
              </label>
            </div>
          </div>

          <div className="button-row">
            <button className="primary-button" type="submit">
              <Save size={16} />
              Save architecture
            </button>
            <button className="secondary-button" type="button" onClick={handleRun} disabled={busy}>
              <Workflow size={16} />
              {busy ? "Running..." : "Run full automation now"}
            </button>
          </div>
        </form>

        {message ? <p className="status-note">{message}</p> : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Automation operating rules</h2>
            <p>Keep everything automatic without repeated uploads or manual prompting.</p>
          </div>
        </div>

        <div className="rules-list">
          <div className="rule-card">
            <Database size={18} />
            <div>
              <strong>Sheets hold the live business numbers</strong>
              <p>Use Google Sheets for raw sales, returns, inventory, and margin inputs.</p>
            </div>
          </div>
          <div className="rule-card">
            <Workflow size={18} />
            <div>
              <strong>Notion holds the operating brain</strong>
              <p>Store alert rules, KPI definitions, summary tone, workflow notes, and business context there.</p>
            </div>
          </div>
          <div className="rule-card">
            <Bot size={18} />
            <div>
              <strong>Claude runs only after sync</strong>
              <p>First sync Sheets and Notion, then generate grounded insights from the latest state.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

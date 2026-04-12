import { useState } from "react";
import { Brain, CheckCircle2, ChevronDown, ChevronRight, Database, FileSpreadsheet, Layers, Link2, Loader2, Plus, RefreshCw, Trash2, Zap } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ColumnMapping {
  originalColumn: string;
  semanticField:  string;
  dataType:       string;
  importance:     string;
}
interface SheetAnalysis {
  dataType:        string;
  confidence:      number;
  summary:         string;
  targetModule:    string;
  columnMappings:  ColumnMapping[];
  primaryKeyColumns: string[];
  insights:        string[];
  suggestedActions:string[];
}
interface ConnectedSheet {
  id:        string;
  sheetId:   string;
  tabName:   string;
  label:     string;
  dataType:  string;
  targetModule: string;
  rowCount:  number;
  syncedAt:  string;
  analysis:  SheetAnalysis;
}

const STORAGE_KEY = "lumara-sheet-master-v1";
const MODULE_COLORS: Record<string, { bg: string; color: string }> = {
  pipeline:   { bg: "#dbeafe", color: "#2563eb" },
  inventory:  { bg: "#dcfce7", color: "#16a34a" },
  sales:      { bg: "#fef9c3", color: "#ca8a04" },
  suppliers:  { bg: "#f3e8ff", color: "#9333ea" },
  marketing:  { bg: "#ffedd5", color: "#ea580c" },
  financials: { bg: "#fee2e2", color: "#dc2626" },
  contacts:   { bg: "#e0f2fe", color: "#0284c7" },
  custom:     { bg: "#f1f5f9", color: "#64748b" },
};

function loadSheets(): ConnectedSheet[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveSheets(sheets: ConnectedSheet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
}

export function SheetMasterPage() {
  const [sheets, setSheets]         = useState<ConnectedSheet[]>(loadSheets);
  const [showForm, setShowForm]     = useState(false);
  const [sheetId, setSheetId]       = useState("");
  const [tabName, setTabName]       = useState("");
  const [label, setLabel]           = useState("");
  const [step, setStep]             = useState<"input"|"analyzing"|"review"|"syncing"|"done">("input");
  const [analysis, setAnalysis]     = useState<SheetAnalysis | null>(null);
  const [preview, setPreview]       = useState<any[]>([]);
  const [totalRows, setTotalRows]   = useState(0);
  const [error, setError]           = useState("");
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [syncing, setSyncing]       = useState<string | null>(null);

  async function handleAnalyze() {
    if (!sheetId.trim()) { setError("Paste your Google Sheet ID first"); return; }
    setError("");
    setStep("analyzing");

    try {
      const res  = await fetch("/api/sheet-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", sheetId: sheetId.trim(), tabName: tabName.trim() || "Sheet1" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setAnalysis(data.analysis);
      setPreview(data.sampleRows || []);
      setTotalRows(data.totalRows);
      setStep("review");
    } catch (e: any) {
      setError(e.message);
      setStep("input");
    }
  }

  async function handleSync() {
    if (!analysis) return;
    setStep("syncing");

    try {
      const res  = await fetch("/api/sheet-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:         "sync",
          sheetId:        sheetId.trim(),
          tabName:        tabName.trim() || "Sheet1",
          dataType:       analysis.dataType,
          columnMappings: analysis.columnMappings,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const newSheet: ConnectedSheet = {
        id:           `${sheetId}-${tabName}-${Date.now()}`,
        sheetId:      sheetId.trim(),
        tabName:      tabName.trim() || "Sheet1",
        label:        label.trim() || tabName.trim() || "My Sheet",
        dataType:     analysis.dataType,
        targetModule: analysis.targetModule,
        rowCount:     data.rowCount,
        syncedAt:     data.syncedAt,
        analysis,
      };

      const updated = [newSheet, ...sheets];
      setSheets(updated);
      saveSheets(updated);
      setStep("done");

      // Reset after 2s
      setTimeout(() => {
        setStep("input");
        setSheetId("");
        setTabName("");
        setLabel("");
        setAnalysis(null);
        setShowForm(false);
      }, 2000);

    } catch (e: any) {
      setError(e.message);
      setStep("review");
    }
  }

  async function resync(sheet: ConnectedSheet) {
    setSyncing(sheet.id);
    try {
      const res  = await fetch("/api/sheet-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:         "sync",
          sheetId:        sheet.sheetId,
          tabName:        sheet.tabName,
          dataType:       sheet.dataType,
          columnMappings: sheet.analysis.columnMappings,
        }),
      });
      const data = await res.json();
      const updated = sheets.map(s =>
        s.id === sheet.id ? { ...s, rowCount: data.rowCount, syncedAt: data.syncedAt } : s
      );
      setSheets(updated);
      saveSheets(updated);
    } catch (e) {}
    setSyncing(null);
  }

  function removeSheet(id: string) {
    const updated = sheets.filter(s => s.id !== id);
    setSheets(updated);
    saveSheets(updated);
  }

  const mc = (type: string) => MODULE_COLORS[type] || MODULE_COLORS.custom;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <Brain size={22} color="#FF5800" />
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#131A48", margin: 0 }}>Sheet Master</h1>
              <span style={{ background: "#FF580015", color: "#FF5800", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: "1px solid #FF580030" }}>AI</span>
            </div>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
              Connect any Google Sheet — AI reads the structure, understands the data, and plugs it into the right module automatically
            </p>
          </div>
          <button onClick={() => { setShowForm(true); setStep("input"); setError(""); }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#131A48", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={15} /> Connect Sheet
          </button>
        </div>
      </div>

      {/* Add sheet form */}
      {showForm && (
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 28, marginBottom: 28 }}>

          {/* Step: Input */}
          {(step === "input" || step === "analyzing") && (
            <>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#131A48", marginBottom: 20 }}>Connect a New Sheet</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Sheet ID *</label>
                  <input value={sheetId} onChange={e => setSheetId(e.target.value)}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>From the URL: /spreadsheets/d/<strong>THIS_PART</strong>/edit</div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Tab Name</label>
                  <input value={tabName} onChange={e => setTabName(e.target.value)}
                    placeholder="Sheet1"
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Label (optional)</label>
                  <input value={label} onChange={e => setLabel(e.target.value)}
                    placeholder="e.g. Q1 Sales Data"
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                </div>
              </div>
              {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{error}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleAnalyze} disabled={step === "analyzing"}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", background: step === "analyzing" ? "#94a3b8" : "#FF5800", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: step === "analyzing" ? "not-allowed" : "pointer" }}>
                  {step === "analyzing" ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> AI is reading your sheet...</> : <><Brain size={14} /> Analyze with AI</>}
                </button>
                <button onClick={() => setShowForm(false)} style={{ padding: "10px 18px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#64748b" }}>Cancel</button>
              </div>
            </>
          )}

          {/* Step: Review */}
          {step === "review" && analysis && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: mc(analysis.dataType).bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Brain size={18} color={mc(analysis.dataType).color} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#131A48" }}>AI Analysis Complete</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{totalRows} rows found • {Math.round(analysis.confidence * 100)}% confidence</div>
                </div>
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: mc(analysis.dataType).bg, color: mc(analysis.dataType).color, textTransform: "uppercase" }}>
                  {analysis.dataType}
                </span>
              </div>

              {/* Summary */}
              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: "#0369a1", fontWeight: 500 }}>📋 {analysis.summary}</div>
                <div style={{ fontSize: 12, color: "#0284c7", marginTop: 4 }}>→ Will sync to: <strong>{analysis.targetModule}</strong></div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                {/* Column mappings */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#131A48", marginBottom: 10 }}>Column Mappings</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {analysis.columnMappings.filter(m => m.importance === "primary").map((m, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "#f8fafc", borderRadius: 6, fontSize: 12 }}>
                        <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{m.originalColumn}</span>
                        <ChevronRight size={12} color="#94a3b8" />
                        <span style={{ color: "#131A48", fontWeight: 600 }}>{m.semanticField}</span>
                        <span style={{ marginLeft: "auto", background: "#e2e8f0", padding: "1px 6px", borderRadius: 4, color: "#64748b" }}>{m.dataType}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insights */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#131A48", marginBottom: 10 }}>AI Insights</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {analysis.insights.map((ins, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "#475569" }}>
                        <span style={{ color: "#FF5800", flexShrink: 0 }}>•</span>{ins}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#131A48", marginTop: 14, marginBottom: 8 }}>Suggested Actions</div>
                  {analysis.suggestedActions.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "#16a34a", marginBottom: 6 }}>
                      <Zap size={12} style={{ flexShrink: 0, marginTop: 1 }} />{a}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample rows */}
              {preview.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#131A48", marginBottom: 8 }}>Sample Data (first 3 rows)</div>
                  <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          {Object.keys(preview[0]).map(k => (
                            <th key={k} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#64748b", whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0" }}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} style={{ borderBottom: i < preview.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                            {Object.values(row).map((v: any, j) => (
                              <td key={j} style={{ padding: "8px 12px", color: "#475569", whiteSpace: "nowrap", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>{String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{error}</div>}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleSync}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", background: "#131A48", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <Database size={14} /> Sync {totalRows} Rows into Lumara
                </button>
                <button onClick={() => setStep("input")}
                  style={{ padding: "10px 18px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#64748b" }}>
                  Back
                </button>
              </div>
            </>
          )}

          {/* Step: Syncing */}
          {step === "syncing" && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <Loader2 size={32} color="#FF5800" style={{ animation: "spin 1s linear infinite", marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: "#131A48" }}>Syncing your data into Lumara...</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>AI is mapping and importing all rows</div>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <CheckCircle2 size={40} color="#22c55e" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: "#131A48" }}>Sheet connected successfully!</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Data is now live in Lumara</div>
            </div>
          )}
        </div>
      )}

      {/* Connected sheets */}
      {sheets.length === 0 && !showForm ? (
        <div style={{ background: "white", border: "2px dashed #e2e8f0", borderRadius: 12, padding: 60, textAlign: "center" }}>
          <FileSpreadsheet size={40} color="#94a3b8" style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: "#131A48", marginBottom: 8 }}>No sheets connected yet</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Connect any Google Sheet and AI will automatically understand its structure</div>
          <button onClick={() => setShowForm(true)}
            style={{ padding: "10px 24px", background: "#FF5800", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + Connect Your First Sheet
          </button>
        </div>
      ) : sheets.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#131A48", marginBottom: 14 }}>
            Connected Sheets ({sheets.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sheets.map(sheet => {
              const colors = mc(sheet.dataType);
              const isExpanded = expanded === sheet.id;
              return (
                <div key={sheet.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", cursor: "pointer" }}
                    onClick={() => setExpanded(isExpanded ? null : sheet.id)}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Layers size={16} color={colors.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#131A48" }}>{sheet.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: colors.bg, color: colors.color, textTransform: "uppercase" }}>{sheet.dataType}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                        Tab: {sheet.tabName} • {sheet.rowCount} rows • Last synced {new Date(sheet.syncedAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>→ {sheet.targetModule}</span>
                      <button onClick={e => { e.stopPropagation(); resync(sheet); }}
                        disabled={syncing === sheet.id}
                        style={{ padding: "6px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#475569", display: "flex", alignItems: "center", gap: 4 }}>
                        <RefreshCw size={11} style={syncing === sheet.id ? { animation: "spin 1s linear infinite" } : {}} />
                        {syncing === sheet.id ? "Syncing..." : "Re-sync"}
                      </button>
                      <button onClick={e => { e.stopPropagation(); removeSheet(sheet.id); }}
                        style={{ padding: "6px 8px", background: "#fee2e2", border: "none", borderRadius: 6, cursor: "pointer", color: "#dc2626", display: "flex", alignItems: "center" }}>
                        <Trash2 size={12} />
                      </button>
                      {isExpanded ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "0 20px 20px", borderTop: "1px solid #f1f5f9" }}>
                      <div style={{ paddingTop: 16 }}>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>{sheet.analysis.summary}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                          {sheet.analysis.columnMappings.filter(m => m.importance === "primary").map((m, i) => (
                            <span key={i} style={{ fontSize: 11, padding: "3px 8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 4, color: "#475569" }}>
                              {m.originalColumn} → <strong>{m.semanticField}</strong>
                            </span>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <Link2 size={12} color="#94a3b8" />
                          <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{sheet.sheetId}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

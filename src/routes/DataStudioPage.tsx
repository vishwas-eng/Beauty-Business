import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle, Brain, Check, CheckCircle2, ChevronDown, ChevronRight,
  Database, FileSpreadsheet, Globe, Loader2, Plus, RefreshCcw,
  Trash2, Upload, X, Zap
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ColMapping {
  originalColumn: string;
  semanticField: string;
  dataType: string;
  importance: "primary" | "secondary" | "metadata";
  sampleValue: string;
  issue: string | null;
}
interface QualityIssue {
  type: string; column: string; detail: string; rowCount: number;
}
interface Analysis {
  dataType: string; confidence: number; summary: string;
  targetModule: string; columnMappings: ColMapping[];
  qualityIssues: QualityIssue[]; suggestedActions: string[];
  primaryKeyColumns: string[];
}
interface CatalogEntry {
  id: string; name: string; sourceType: "excel"|"csv"|"sheet"|"paste";
  dataType: string; targetModule: string; rowCount: number;
  importedAt: string; status: "imported"|"analyzing"|"error";
  sheetId?: string; tabName?: string;
}

const MODULE_COLORS: Record<string,string> = {
  "Dashboard":    "#131A48",
  "Revenue Suite":"#16a34a",
  "Inventory":    "#f59e0b",
  "Research Lab": "#8b5cf6",
  "Custom":       "#64748b",
};
const TYPE_COLORS: Record<string,string> = {
  pipeline:"#131A48", sales:"#16a34a", inventory:"#f59e0b",
  contacts:"#3b82f6", finance:"#8b5cf6", marketing:"#ec4899",
  suppliers:"#f97316", custom:"#64748b"
};
const IMPORTANCE_COLORS: Record<string,string> = {
  primary:"#FF5800", secondary:"#3b82f6", metadata:"#94a3b8"
};
const DATA_TYPE_OPTIONS = ["text","number","date","boolean","currency","percentage","email","phone"];
const SEMANTIC_FIELDS: Record<string,string[]> = {
  pipeline:  ["brand_name","category","segment","market","status","stage","quadrant","company","source_country","discussion_start_date","next_steps","hold_reason","notes"],
  sales:     ["date","sku","product_name","brand","category","channel","quantity_sold","revenue","unit_price","discount","returns","cost"],
  inventory: ["sku","product_name","brand","category","channel","quantity_on_hand","quantity_reserved","unit_cost","total_value","reorder_point","supplier","warehouse"],
  contacts:  ["name","email","company","role","phone","market","status","notes","last_contact_date"],
  finance:   ["period","category","revenue","cost","gross_margin","opex","ebitda","brand","market"],
  marketing: ["campaign","channel","spend","impressions","clicks","conversions","date","brand","market"],
  suppliers: ["supplier_name","contact_email","contact_phone","lead_time_days","moq","payment_terms","rating","category","brand","country"],
  custom:    [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10); }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
}
function fillPct(pct: number) {
  const col = pct >= 90 ? "#16a34a" : pct >= 70 ? "#f59e0b" : "#ef4444";
  return <div style={{ display:"flex", alignItems:"center", gap:6 }}>
    <div style={{ width:60, height:5, background:"#f1f5f9", borderRadius:3, overflow:"hidden" }}>
      <div style={{ width:`${pct}%`, height:"100%", background:col, borderRadius:3 }} />
    </div>
    <span style={{ fontSize:10, color:col, fontWeight:600 }}>{pct}%</span>
  </div>;
}

// ── Catalog stored in localStorage ───────────────────────────────────────────
const CAT_KEY = "lumara-data-catalog-v1";
function loadCatalog(): CatalogEntry[] {
  try { return JSON.parse(localStorage.getItem(CAT_KEY) || "[]"); } catch { return []; }
}
function saveCatalog(c: CatalogEntry[]) { localStorage.setItem(CAT_KEY, JSON.stringify(c)); }

// ─────────────────────────────────────────────────────────────────────────────
export function DataStudioPage() {
  const [catalog, setCatalog]       = useState<CatalogEntry[]>(loadCatalog);
  const [step, setStep]             = useState<"idle"|"loaded"|"analyzing"|"review"|"importing"|"done">("idle");
  const [source, setSource]         = useState<{type:string;name:string;headers:string[];rows:Record<string,string>[]}>( {type:"",name:"",headers:[],rows:[]} );
  const [analysis, setAnalysis]     = useState<Analysis | null>(null);
  const [quality, setQuality]       = useState<Record<string,{total:number;empty:number;unique:number;fill:number}>>({});
  const [mappings, setMappings]     = useState<ColMapping[]>([]);
  const [error, setError]           = useState("");
  const [sheetUrl, setSheetUrl]     = useState("");
  const [sheetTabs, setSheetTabs]   = useState<string[]>([]);
  const [activeTab, setActiveTab]   = useState("");
  const [tabLoading, setTabLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [reviewTab, setReviewTab]   = useState<"mapping"|"quality"|"preview">("mapping");
  const [selectedEntry, setSelectedEntry] = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { saveCatalog(catalog); }, [catalog]);

  // ── Parse local file (Excel / CSV) ──────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as string[][];
        if (raw.length < 2) { setError("File appears empty — need at least a header row and one data row."); return; }

        const headers = (raw[0] as string[]).map(h => String(h || "").trim()).filter(Boolean);
        const rows = raw.slice(1).filter(r => r.some(c => c !== "")).map(row => {
          const obj: Record<string,string> = {};
          headers.forEach((h,i) => { obj[h] = String(row[i] || "").trim(); });
          return obj;
        });

        setSource({ type: file.name.endsWith(".csv") ? "csv" : "excel", name: file.name, headers, rows });
        setStep("loaded");
      } catch (ex) {
        setError("Could not parse file. Make sure it's a valid Excel (.xlsx/.xls) or CSV file.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Load Google Sheet ────────────────────────────────────────────────────────
  async function loadGoogleSheet() {
    setError("");
    setTabLoading(true);
    try {
      // Extract sheet ID from URL or use raw ID
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      const sheetId = match ? match[1] : sheetUrl.trim();
      if (!sheetId) { setError("Enter a valid Google Sheet URL or ID"); setTabLoading(false); return; }

      const res  = await fetch("/api/data-studio", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"fetch-sheet", sheetId }) });
      const data = await res.json();

      if (!data.ok) { setError(data.error || "Could not access sheet — make sure it's publicly shared"); setTabLoading(false); return; }
      setSheetTabs(data.tabs || []);
      if (data.tabs?.length === 1) await loadSheetTab(sheetId, data.tabs[0]);
      else setStep("loaded"); // let user pick tab
    } catch {
      setError("Network error — could not reach Google Sheets API");
    }
    setTabLoading(false);
  }

  async function loadSheetTab(sheetId: string, tab: string) {
    setTabLoading(true);
    setActiveTab(tab);
    try {
      const res  = await fetch("/api/data-studio", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"fetch-sheet", sheetId, tabName: tab }) });
      const data = await res.json();
      if (!data.ok) { setError(data.error); setTabLoading(false); return; }

      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      const sheetId2 = match ? match[1] : sheetUrl.trim();
      setSource({ type:"sheet", name:`${tab} (Google Sheet)`, headers: data.headers, rows: data.rows });
      setStep("loaded");
    } catch { setError("Failed to load tab"); }
    setTabLoading(false);
  }

  // ── Run AI Analysis ──────────────────────────────────────────────────────────
  async function analyze() {
    setStep("analyzing");
    setError("");
    try {
      const res  = await fetch("/api/data-studio", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ action:"analyze", headers: source.headers, rows: source.rows, sourceName: source.name })
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); setStep("loaded"); return; }

      setAnalysis(data.analysis);
      setQuality(data.quality || {});
      setMappings(data.analysis.columnMappings || []);
      setStep("review");
    } catch {
      setError("Analysis failed — check your connection");
      setStep("loaded");
    }
  }

  // ── Import ───────────────────────────────────────────────────────────────────
  async function doImport() {
    if (!analysis) return;
    setStep("importing");
    try {
      const res  = await fetch("/api/data-studio", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ action:"import", dataType: analysis.dataType, rows: source.rows, columnMappings: mappings, sourceName: source.name, sourceType: source.type })
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); setStep("review"); return; }

      const entry: CatalogEntry = {
        id: uid(), name: source.name, sourceType: source.type as CatalogEntry["sourceType"],
        dataType: analysis.dataType, targetModule: analysis.targetModule,
        rowCount: data.rowCount, importedAt: data.importedAt, status: "imported"
      };
      setCatalog(prev => [entry, ...prev]);
      setStep("done");
    } catch {
      setError("Import failed"); setStep("review");
    }
  }

  function reset() {
    setStep("idle"); setAnalysis(null); setMappings([]); setSource({type:"",name:"",headers:[],rows:[]});
    setError(""); setSheetTabs([]); setActiveTab(""); setShowPreview(false); setReviewTab("mapping");
  }

  function updateMapping(idx: number, field: keyof ColMapping, value: string) {
    setMappings(prev => prev.map((m,i) => i === idx ? {...m, [field]: value} : m));
  }

  const criticalIssues = (analysis?.qualityIssues || []).filter(q => q.type === "missing_values" || q.type === "duplicates");
  const warningIssues  = (analysis?.qualityIssues || []).filter(q => !["missing_values","duplicates"].includes(q.type));

  return (
    <div style={{ display:"flex", height:"calc(100vh - 60px)", overflow:"hidden" }}>

      {/* ── Left Sidebar: Catalog ─────────────────────────────────────────── */}
      <div style={{ width:280, borderRight:"1px solid #e2e8f0", display:"flex", flexDirection:"column", background:"#f8fafc", flexShrink:0 }}>
        <div style={{ padding:"20px 16px 12px", borderBottom:"1px solid #e2e8f0" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Database size={16} color="#131A48" />
              <span style={{ fontSize:14, fontWeight:700, color:"#131A48" }}>Data Catalog</span>
            </div>
            <span style={{ fontSize:11, background:"#131A4815", color:"#131A48", padding:"2px 8px", borderRadius:20, fontWeight:600 }}>
              {catalog.length}
            </span>
          </div>
          <p style={{ fontSize:11, color:"#94a3b8", margin:0 }}>All imported sources</p>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
          {catalog.length === 0 ? (
            <div style={{ padding:"32px 16px", textAlign:"center", color:"#94a3b8", fontSize:12 }}>
              <Database size={28} style={{ marginBottom:8, opacity:0.4 }} />
              <div>No data imported yet</div>
              <div style={{ marginTop:4, fontSize:11 }}>Import your first sheet →</div>
            </div>
          ) : catalog.map(entry => (
            <div key={entry.id}
              onClick={() => setSelectedEntry(selectedEntry === entry.id ? null : entry.id)}
              style={{
                padding:"10px 16px", cursor:"pointer", borderLeft:`3px solid ${selectedEntry === entry.id ? TYPE_COLORS[entry.dataType] ?? "#131A48" : "transparent"}`,
                background: selectedEntry === entry.id ? "white" : "transparent",
                transition:"all 0.1s"
              }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                <FileSpreadsheet size={14} color={TYPE_COLORS[entry.dataType] ?? "#64748b"} style={{ flexShrink:0, marginTop:2 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#1e293b", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{entry.name}</div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>
                    <span style={{ color: TYPE_COLORS[entry.dataType], fontWeight:600 }}>{entry.dataType}</span>
                    {" · "}{entry.rowCount} rows{" · "}{fmtDate(entry.importedAt)}
                  </div>
                  {selectedEntry === entry.id && (
                    <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
                      <span style={{ fontSize:10, background:"#f1f5f9", color:"#64748b", padding:"2px 6px", borderRadius:4 }}>{entry.targetModule}</span>
                      <button onClick={(e)=>{ e.stopPropagation(); setCatalog(prev=>prev.filter(c=>c.id!==entry.id)); setSelectedEntry(null); }}
                        style={{ fontSize:10, color:"#ef4444", background:"#fee2e2", border:"none", padding:"2px 6px", borderRadius:4, cursor:"pointer", display:"flex", alignItems:"center", gap:3 }}>
                        <Trash2 size={9}/> Remove
                      </button>
                    </div>
                  )}
                </div>
                <CheckCircle2 size={12} color="#16a34a" style={{ flexShrink:0, marginTop:2 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding:"12px 16px", borderTop:"1px solid #e2e8f0" }}>
          <button onClick={reset} style={{ width:"100%", padding:"10px", background:"#FF5800", color:"white", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <Plus size={14}/> Import New Source
          </button>
        </div>
      </div>

      {/* ── Main Area ─────────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:"28px 32px" }}>

        {/* ── IDLE: Source picker ──────────────────────────────────────────── */}
        {step === "idle" && (
          <div>
            <div style={{ marginBottom:28 }}>
              <h2 style={{ fontSize:22, fontWeight:700, color:"#131A48", margin:"0 0 6px" }}>Data Workspace</h2>
              <p style={{ color:"#64748b", fontSize:14, margin:0 }}>
                Drop any Excel, CSV, or paste a Google Sheet URL. AI auto-detects structure, maps columns, and catches issues before they hit your database.
              </p>
            </div>

            {error && (
              <div style={{ background:"#fee2e2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", marginBottom:20, color:"#dc2626", fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
                <AlertTriangle size={14}/> {error}
              </div>
            )}

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e=>e.preventDefault()}
              onClick={()=>fileRef.current?.click()}
              style={{
                border:"2px dashed #cbd5e1", borderRadius:16, padding:"48px 32px",
                textAlign:"center", cursor:"pointer", marginBottom:24,
                background:"#f8fafc", transition:"all 0.15s"
              }}
              onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor="#FF5800";(e.currentTarget as HTMLDivElement).style.background="#fff5f0";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor="#cbd5e1";(e.currentTarget as HTMLDivElement).style.background="#f8fafc";}}
            >
              <Upload size={32} color="#94a3b8" style={{ marginBottom:12 }} />
              <div style={{ fontSize:16, fontWeight:600, color:"#475569", marginBottom:6 }}>
                Drop Excel or CSV here
              </div>
              <div style={{ fontSize:13, color:"#94a3b8" }}>Supports .xlsx · .xls · .csv — or click to browse</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }}
                onChange={e=>{ if(e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
              <div style={{ flex:1, height:1, background:"#e2e8f0" }} />
              <span style={{ fontSize:12, color:"#94a3b8", fontWeight:600 }}>OR</span>
              <div style={{ flex:1, height:1, background:"#e2e8f0" }} />
            </div>

            {/* Google Sheet URL */}
            <div style={{ background:"white", border:"1px solid #e2e8f0", borderRadius:12, padding:20, marginBottom:24 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <Globe size={16} color="#3b82f6" />
                <span style={{ fontSize:14, fontWeight:600, color:"#1e293b" }}>Google Sheet</span>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <input
                  value={sheetUrl}
                  onChange={e=>setSheetUrl(e.target.value)}
                  onKeyDown={e=>e.key==="Enter" && loadGoogleSheet()}
                  placeholder="Paste Google Sheet URL or ID (must be publicly accessible)"
                  style={{ flex:1, padding:"10px 14px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, outline:"none" }}
                />
                <button onClick={loadGoogleSheet} disabled={tabLoading || !sheetUrl.trim()}
                  style={{ padding:"10px 20px", background: tabLoading ? "#94a3b8" : "#3b82f6", color:"white", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" }}>
                  {tabLoading ? <Loader2 size={14} style={{ animation:"spin 1s linear infinite" }} /> : <Globe size={14}/>}
                  {tabLoading ? "Connecting..." : "Connect"}
                </button>
              </div>

              {sheetTabs.length > 1 && (
                <div style={{ marginTop:14 }}>
                  <div style={{ fontSize:12, color:"#64748b", marginBottom:8, fontWeight:600 }}>Select a tab to import:</div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {sheetTabs.map(tab => (
                      <button key={tab} onClick={()=>{ const m=sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/); loadSheetTab(m?m[1]:sheetUrl.trim(), tab); }}
                        style={{ padding:"6px 14px", fontSize:12, background: activeTab===tab ? "#131A48" : "white", color: activeTab===tab ? "white" : "#475569",
                          border:"1px solid #e2e8f0", borderRadius:20, cursor:"pointer", fontWeight:600 }}>
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* What this does */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[
                { icon:<Brain size={18} color="#FF5800"/>, title:"AI Auto-Mapping", desc:"Detects column meaning automatically — no manual field mapping needed" },
                { icon:<AlertTriangle size={18} color="#f59e0b"/>, title:"Quality Scanner", desc:"Catches missing values, duplicates, and formatting issues before import" },
                { icon:<Database size={18} color="#16a34a"/>, title:"Smart Catalog", desc:"Every source tracked with status, row count, and last sync time" },
              ].map((f,i) => (
                <div key={i} style={{ background:"white", border:"1px solid #e2e8f0", borderRadius:10, padding:"16px" }}>
                  <div style={{ marginBottom:8 }}>{f.icon}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1e293b", marginBottom:4 }}>{f.title}</div>
                  <div style={{ fontSize:12, color:"#64748b", lineHeight:1.5 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LOADED: Ready to analyze ─────────────────────────────────────── */}
        {step === "loaded" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
              <button onClick={reset} style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:13 }}>← Back</button>
              <div style={{ flex:1 }}>
                <h2 style={{ fontSize:20, fontWeight:700, color:"#131A48", margin:"0 0 2px" }}>File Loaded</h2>
                <p style={{ color:"#64748b", fontSize:13, margin:0 }}>{source.name} · {source.rows.length} rows · {source.headers.length} columns</p>
              </div>
            </div>

            {error && (
              <div style={{ background:"#fee2e2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", marginBottom:20, color:"#dc2626", fontSize:13 }}>
                {error}
              </div>
            )}

            <div style={{ background:"white", border:"1px solid #e2e8f0", borderRadius:12, padding:20, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#64748b", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.05em" }}>Column Preview</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {source.headers.map(h => (
                  <span key={h} style={{ fontSize:12, background:"#f1f5f9", color:"#475569", padding:"4px 10px", borderRadius:6, border:"1px solid #e2e8f0" }}>{h}</span>
                ))}
              </div>
            </div>

            <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:12, padding:"16px 20px", marginBottom:24, display:"flex", alignItems:"center", gap:14 }}>
              <Brain size={24} color="#16a34a"/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:"#15803d" }}>Ready for AI Analysis</div>
                <div style={{ fontSize:12, color:"#4ade80", marginTop:2 }}>AI will map all {source.headers.length} columns, detect data type, and scan for quality issues automatically.</div>
              </div>
              <button onClick={analyze} style={{ padding:"10px 24px", background:"#16a34a", color:"white", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                <Zap size={14}/> Analyze with AI
              </button>
            </div>
          </div>
        )}

        {/* ── ANALYZING ────────────────────────────────────────────────────── */}
        {step === "analyzing" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:400, gap:20 }}>
            <div style={{ width:56, height:56, borderRadius:14, background:"linear-gradient(135deg,#131A48,#FF5800)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Brain size={26} color="white"/>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:700, color:"#131A48", marginBottom:6 }}>AI is analyzing your data</div>
              <div style={{ fontSize:13, color:"#64748b" }}>Detecting structure · Mapping columns · Scanning for quality issues...</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:"#FF5800", animation:`bounce 1.2s ${i*0.2}s infinite` }} />)}
            </div>
            <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ── REVIEW: Mapping + Quality + Preview ──────────────────────────── */}
        {(step === "review" || step === "importing") && analysis && (
          <div>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                  <button onClick={reset} style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:13 }}>← Back</button>
                  <h2 style={{ fontSize:20, fontWeight:700, color:"#131A48", margin:0 }}>Review & Import</h2>
                </div>
                <p style={{ color:"#64748b", fontSize:13, margin:0 }}>{source.name} · {source.rows.length} rows · {source.headers.length} columns</p>
              </div>
              <button onClick={doImport} disabled={step==="importing"}
                style={{ padding:"11px 28px", background: step==="importing" ? "#94a3b8" : "#FF5800", color:"white", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                {step==="importing" ? <Loader2 size={15} style={{ animation:"spin 1s linear infinite" }}/> : <Database size={15}/>}
                {step==="importing" ? "Importing..." : "Import to Dashboard"}
              </button>
            </div>

            {/* Summary cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
              {[
                { label:"Data Type",     value: analysis.dataType,                         color: TYPE_COLORS[analysis.dataType] ?? "#64748b" },
                { label:"AI Confidence", value: `${Math.round(analysis.confidence * 100)}%`, color: analysis.confidence > 0.75 ? "#16a34a" : "#f59e0b" },
                { label:"Rows",          value: String(source.rows.length),                  color: "#3b82f6" },
                { label:"Issues Found",  value: String(analysis.qualityIssues.length),       color: analysis.qualityIssues.length > 0 ? "#ef4444" : "#16a34a" },
              ].map(c => (
                <div key={c.label} style={{ background:"white", border:"1px solid #e2e8f0", borderRadius:10, padding:"14px 16px" }}>
                  <div style={{ fontSize:11, color:"#94a3b8", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>{c.label}</div>
                  <div style={{ fontSize:22, fontWeight:800, color:c.color }}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* AI summary */}
            <div style={{ background:"#fafafa", border:"1px solid #e2e8f0", borderRadius:10, padding:"14px 18px", marginBottom:20, display:"flex", gap:12, alignItems:"flex-start" }}>
              <Brain size={16} color="#FF5800" style={{ flexShrink:0, marginTop:2 }} />
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#1e293b", marginBottom:2 }}>{analysis.summary}</div>
                <div style={{ fontSize:12, color:"#64748b" }}>
                  Target: <strong style={{ color: MODULE_COLORS[analysis.targetModule] ?? "#64748b" }}>{analysis.targetModule}</strong>
                  {analysis.suggestedActions?.[0] && <> · {analysis.suggestedActions[0]}</>}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:"flex", borderBottom:"1px solid #e2e8f0", marginBottom:0 }}>
              {[
                { key:"mapping",  label:"Column Mapping", count: mappings.length },
                { key:"quality",  label:"Quality Issues",  count: analysis.qualityIssues.length, alert: criticalIssues.length > 0 },
                { key:"preview",  label:"Data Preview" },
              ].map(t => (
                <button key={t.key} onClick={()=>setReviewTab(t.key as typeof reviewTab)}
                  style={{ padding:"10px 20px", fontSize:13, fontWeight:600, background:"none", border:"none", borderBottom: reviewTab===t.key ? "2px solid #FF5800" : "2px solid transparent",
                    color: reviewTab===t.key ? "#FF5800" : "#64748b", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                  {t.label}
                  {t.count !== undefined && (
                    <span style={{ fontSize:10, background: t.alert ? "#ef4444" : "#f1f5f9", color: t.alert ? "white" : "#64748b", padding:"1px 7px", borderRadius:20, fontWeight:700 }}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Column Mapping */}
            {reviewTab === "mapping" && (
              <div style={{ background:"white", border:"1px solid #e2e8f0", borderTop:"none", borderRadius:"0 0 12px 12px" }}>
                <div style={{ display:"grid", gridTemplateColumns:"200px 1fr 120px 110px 1fr", gap:0, padding:"10px 16px", background:"#f8fafc", borderBottom:"1px solid #e2e8f0", fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  <span>Original Column</span><span>Maps To Field</span><span>Data Type</span><span>Importance</span><span>Sample Value</span>
                </div>
                {mappings.map((m, i) => (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"200px 1fr 120px 110px 1fr", gap:0, padding:"10px 16px", borderBottom:"1px solid #f1f5f9", alignItems:"center",
                    background: m.issue ? "#fffbeb" : "white" }}>
                    <div>
                      <span style={{ fontSize:13, fontWeight:600, color:"#1e293b" }}>{m.originalColumn}</span>
                      {m.issue && <div style={{ fontSize:10, color:"#f59e0b", marginTop:2 }}><AlertTriangle size={9} style={{ display:"inline", marginRight:3 }}/>{m.issue}</div>}
                    </div>
                    <select value={m.semanticField} onChange={e=>updateMapping(i,"semanticField",e.target.value)}
                      style={{ fontSize:12, padding:"4px 8px", border:"1px solid #e2e8f0", borderRadius:6, background:"white", color:"#1e293b", outline:"none" }}>
                      <option value={m.semanticField}>{m.semanticField}</option>
                      <optgroup label={`${analysis.dataType} fields`}>
                        {(SEMANTIC_FIELDS[analysis.dataType] || []).map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </optgroup>
                      <option value="skip">— skip this column —</option>
                    </select>
                    <select value={m.dataType} onChange={e=>updateMapping(i,"dataType",e.target.value)}
                      style={{ fontSize:12, padding:"4px 8px", border:"1px solid #e2e8f0", borderRadius:6, background:"white", color:"#1e293b", marginLeft:8, outline:"none" }}>
                      {DATA_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div style={{ marginLeft:8 }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
                        background: IMPORTANCE_COLORS[m.importance]+"20", color: IMPORTANCE_COLORS[m.importance] }}>
                        {m.importance}
                      </span>
                    </div>
                    <span style={{ fontSize:12, color:"#64748b", marginLeft:8, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {m.sampleValue || "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Quality Issues */}
            {reviewTab === "quality" && (
              <div style={{ background:"white", border:"1px solid #e2e8f0", borderTop:"none", borderRadius:"0 0 12px 12px", padding:20 }}>
                {analysis.qualityIssues.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"40px 0", color:"#16a34a" }}>
                    <CheckCircle2 size={32} style={{ marginBottom:8 }}/>
                    <div style={{ fontSize:14, fontWeight:600 }}>No quality issues found</div>
                    <div style={{ fontSize:12, color:"#94a3b8", marginTop:4 }}>Your data looks clean — ready to import!</div>
                  </div>
                ) : (
                  <>
                    {criticalIssues.length > 0 && (
                      <div style={{ marginBottom:20 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"#dc2626", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                          Critical Issues ({criticalIssues.length})
                        </div>
                        {criticalIssues.map((q,i) => (
                          <div key={i} style={{ display:"flex", gap:12, padding:"12px 14px", background:"#fef2f2", borderRadius:8, marginBottom:8, border:"1px solid #fecaca" }}>
                            <AlertTriangle size={14} color="#dc2626" style={{ flexShrink:0, marginTop:2 }}/>
                            <div>
                              <div style={{ fontSize:13, fontWeight:600, color:"#1e293b" }}>{q.column}</div>
                              <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{q.detail}</div>
                            </div>
                            <span style={{ marginLeft:"auto", fontSize:11, fontWeight:700, color:"#dc2626" }}>{q.rowCount} rows</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {warningIssues.length > 0 && (
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:"#f59e0b", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                          Warnings ({warningIssues.length})
                        </div>
                        {warningIssues.map((q,i) => (
                          <div key={i} style={{ display:"flex", gap:12, padding:"12px 14px", background:"#fffbeb", borderRadius:8, marginBottom:8, border:"1px solid #fef08a" }}>
                            <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink:0, marginTop:2 }}/>
                            <div>
                              <div style={{ fontSize:13, fontWeight:600, color:"#1e293b" }}>{q.column}</div>
                              <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{q.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Column fill stats */}
                <div style={{ marginTop:24, borderTop:"1px solid #f1f5f9", paddingTop:20 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", marginBottom:12, textTransform:"uppercase" }}>Column Fill Rate</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
                    {Object.entries(quality).map(([col, stat]) => (
                      <div key={col} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"#f8fafc", borderRadius:8 }}>
                        <span style={{ fontSize:12, color:"#1e293b", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{col}</span>
                        {fillPct(stat.fill)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Data Preview */}
            {reviewTab === "preview" && (
              <div style={{ background:"white", border:"1px solid #e2e8f0", borderTop:"none", borderRadius:"0 0 12px 12px", overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ background:"#f8fafc" }}>
                      {source.headers.slice(0,8).map(h => (
                        <th key={h} style={{ padding:"10px 12px", textAlign:"left", fontWeight:600, color:"#64748b", fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:"1px solid #e2e8f0", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                      {source.headers.length > 8 && <th style={{ padding:"10px 12px", color:"#94a3b8", fontSize:11 }}>+{source.headers.length-8} more</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {source.rows.slice(0,8).map((row,i) => (
                      <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                        {source.headers.slice(0,8).map(h => (
                          <td key={h} style={{ padding:"9px 12px", color:row[h] ? "#1e293b" : "#d1d5db", maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {row[h] || "—"}
                          </td>
                        ))}
                        {source.headers.length > 8 && <td style={{ padding:"9px 12px", color:"#94a3b8" }}>...</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {source.rows.length > 8 && (
                  <div style={{ padding:"10px 16px", textAlign:"center", fontSize:12, color:"#94a3b8", borderTop:"1px solid #f1f5f9" }}>
                    Showing 8 of {source.rows.length} rows
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── DONE ─────────────────────────────────────────────────────────── */}
        {step === "done" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:440, gap:24 }}>
            <div style={{ width:64, height:64, borderRadius:20, background:"linear-gradient(135deg,#16a34a,#22c55e)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Check size={30} color="white" strokeWidth={3} />
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:22, fontWeight:800, color:"#131A48", marginBottom:8 }}>Import Successful</div>
              <div style={{ fontSize:14, color:"#64748b" }}>
                <strong>{source.rows.length} rows</strong> from <strong>{source.name}</strong> have been cataloged
              </div>
              {analysis && (
                <div style={{ marginTop:12, fontSize:13, color:"#64748b" }}>
                  Data type: <strong style={{ color: TYPE_COLORS[analysis.dataType] }}>{analysis.dataType}</strong>
                  {" → "}<strong style={{ color: MODULE_COLORS[analysis.targetModule] }}>{analysis.targetModule}</strong>
                </div>
              )}
            </div>
            {analysis?.suggestedActions?.length && (
              <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"16px 24px", maxWidth:480, width:"100%" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", marginBottom:10, textTransform:"uppercase" }}>AI Suggestions</div>
                {analysis.suggestedActions.map((a,i) => (
                  <div key={i} style={{ display:"flex", gap:8, marginBottom:8, fontSize:13, color:"#475569" }}>
                    <ChevronRight size={14} color="#FF5800" style={{ flexShrink:0, marginTop:2 }} />
                    {a}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:"flex", gap:12 }}>
              <button onClick={reset} style={{ padding:"11px 24px", background:"#FF5800", color:"white", border:"none", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                <Plus size={14}/> Import Another
              </button>
              <button onClick={reset} style={{ padding:"11px 24px", background:"white", color:"#475569", border:"1px solid #e2e8f0", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                View Catalog
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

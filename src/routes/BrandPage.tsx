import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Copy, Globe, LayoutTemplate, Mail, Mic, PlusCircle, X } from "lucide-react";
import { fetchDashboard, queryAgent } from "../lib/api";
import {
  ACTIVITY_COLORS,
  ACTIVITY_LABELS,
  ActivityEntry,
  ActivityType,
  addActivity,
  getActivitiesForBrand,
  loadBrandNote,
  saveBrandNote
} from "../lib/activityLog";
import { computeBrandScore, scoreLabel, scoreTone } from "../lib/scoring";
import { DashboardPayload, PerformanceRow } from "../types/domain";
import { formatDateTime } from "../lib/format";

const REGIONS = ["India", "SEA", "GCC", "Under Discussion"];

export function BrandPage() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState("");

  // Beta: Deck Prep
  const [deckOpen, setDeckOpen] = useState(false);
  const [deckText, setDeckText] = useState("");
  const [deckLoading, setDeckLoading] = useState(false);
  const [deckCopied, setDeckCopied] = useState(false);

  // Beta: Region Research
  const [researchRegion, setResearchRegion] = useState(REGIONS[0]);
  const [researchText, setResearchText] = useState("");
  const [researchLoading, setResearchLoading] = useState(false);

  // Beta: Email Draft
  const [emailText, setEmailText] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  // Beta: Meeting Ingestion
  const [meetingTranscript, setMeetingTranscript] = useState("");
  const [meetingResult, setMeetingResult] = useState("");
  const [meetingLoading, setMeetingLoading] = useState(false);

  // Beta: Activity Log
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [newNote, setNewNote] = useState("");

  // Beta: Brand Notes
  const [brandNote, setBrandNote] = useState("");

  useEffect(() => {
    setLoading(true);
    void fetchDashboard("mtd")
      .then(setPayload)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!payload?.brandProfiles.length) {
      return;
    }

    setSelectedBrand((current) =>
      current && payload.brandProfiles.some((item) => item.id === current)
        ? current
        : payload.brandProfiles[0].id
    );
  }, [payload]);

  const profile = useMemo(
    () => payload?.brandProfiles.find((item) => item.id === selectedBrand) ?? payload?.brandProfiles[0],
    [payload, selectedBrand]
  );

  // Reload activity log + notes when brand changes
  useEffect(() => {
    if (!profile) return;
    const key = `${profile.brand}||${profile.market}`;
    setActivities(getActivitiesForBrand(key));
    setBrandNote(loadBrandNote(key));
    setEmailText("");
    setMeetingResult("");
    setMeetingTranscript("");
    setResearchText("");
  }, [profile?.brand, profile?.market]);

  function getBrandKey() {
    return profile ? `${profile.brand}||${profile.market}` : "";
  }

  function logActivity(type: ActivityType, text: string) {
    const entry = addActivity({ brandKey: getBrandKey(), type, text });
    setActivities(prev => [entry, ...prev]);
  }

  function addNote() {
    if (!newNote.trim()) return;
    logActivity("note", newNote.trim());
    setNewNote("");
  }

  function saveNote() {
    saveBrandNote(getBrandKey(), brandNote);
  }

  // Find pipeline rows for this brand
  function getBrandRows(): PerformanceRow[] {
    if (!payload || !profile) return [];
    return payload.performance.filter(r => r.brand.trim() === profile.brand.trim());
  }

  async function generateDeck(brandName: string, market: string, stage: string) {
    setDeckOpen(true);
    setDeckLoading(true);
    setDeckText("");
    const res = await queryAgent(
      `Generate a 6-slide pitch deck outline for the brand "${brandName}" targeting the ${market} market. The brand is currently at "${stage}" stage in our pipeline.\n\nFor each slide include: slide title, 3-4 key bullet points, and what supporting data or visuals to include.\n\nSlide structure: 1) Brand Overview & Positioning, 2) Market Opportunity in ${market}, 3) Why This Brand Fits Our Region, 4) Commercial Opportunity & Terms, 5) Risks & Mitigations, 6) Recommended Next Steps.\n\nBe specific to the brand and region. Format clearly with slide headers.`
    );
    setDeckText(res.answer);
    logActivity("deck_prep", `Deck outline prepared for ${brandName} (${market})`);
    setDeckLoading(false);
  }

  function copyDeck() {
    void navigator.clipboard.writeText(deckText);
    setDeckCopied(true);
    setTimeout(() => setDeckCopied(false), 2000);
  }

  async function generateEmailDraft(brandName: string, market: string, stage: string, nextStep: string) {
    setEmailLoading(true);
    setEmailText("");
    const res = await queryAgent(
      `Write a professional follow-up email for the brand "${brandName}" in the ${market} market. They are currently at "${stage}" stage in our pipeline. The agreed next step is: "${nextStep || "follow up on status"}". Write the email from Opptra's BD team to the brand's contact. Keep it concise, warm, and action-oriented. Include a clear subject line. Do not add placeholder brackets — write it as a real email ready to send.`
    );
    setEmailText(res.answer);
    logActivity("email_draft", `Email draft generated for ${brandName} (${market} · ${stage})`);
    setEmailLoading(false);
  }

  function copyEmail() {
    void navigator.clipboard.writeText(emailText);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  }

  async function ingestMeetingNotes(brandName: string, transcript: string) {
    if (!transcript.trim()) return;
    setMeetingLoading(true);
    setMeetingResult("");
    const res = await queryAgent(
      `Extract structured meeting notes from the following transcript for the brand "${brandName}". Output:\n1. Key discussion points (3-5 bullets)\n2. Objections or concerns raised\n3. Agreed next steps with owner if mentioned\n4. Any new contacts or decision-makers named\n5. Recommended pipeline stage update (if any)\n6. Follow-up actions for the Opptra team\n\nTranscript:\n${transcript}`
    );
    setMeetingResult(res.answer);
    logActivity("meeting_ingested", `Meeting notes ingested for ${brandName}`);
    setMeetingLoading(false);
  }

  async function runRegionResearch(brandName: string, region: string) {
    setResearchLoading(true);
    setResearchText("");
    const res = await queryAgent(
      `Research how the brand "${brandName}" would likely perform in ${region}. Analyse: 1) Market fit — does the brand category and price point suit ${region} consumers? 2) Competitive landscape — who are the key players already in this space in ${region}? 3) Key opportunities — what is the growth potential? 4) Key risks — what challenges should we anticipate? 5) Verdict — strong fit, possible fit, or weak fit, and why.\n\nIf this brand is already in our pipeline for ${region}, reference what stage it is at and what the current blockers are. Be specific and actionable.`
    );
    setResearchText(res.answer);
    logActivity("region_research", `Region research: ${brandName} in ${region}`);
    setResearchLoading(false);
  }

  if (loading || !payload || !profile) {
    return <div className="page-loader">Preparing brand view...</div>;
  }

  const relatedUpdates = payload.inboxUpdates.filter((item) => item.brand === profile.brand);
  const relatedActions = payload.actionItems.filter((item) => item.brand === profile.brand);
  const brandRows = getBrandRows();
  const topRow = brandRows[0];
  const brandScore = topRow ? computeBrandScore(topRow) : null;
  const tone = brandScore !== null ? scoreTone(brandScore) : null;
  const slabel = brandScore !== null ? scoreLabel(brandScore) : null;

  return (
    <div className="page-stack">
      <section className="hero-row">
        <div>
          <p className="subdued">Brand 360 pulls tracker status, emails, legal state, and key documents into one record.</p>
        </div>
        <div className="action-row">
          <label className="filter-select">
            <span>Brand</span>
            <select value={profile.id} onChange={(event) => setSelectedBrand(event.target.value)}>
              {payload.brandProfiles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.brand}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
          <button
            className="primary-button"
            onClick={() => void generateDeck(profile.brand, profile.market, profile.stage)}
            type="button"
          >
            <LayoutTemplate size={15} />
            Prep Deck
            <span className="beta-badge" style={{ marginLeft: 2 }}>BETA</span>
          </button>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel content-span-2">
          <div className="panel-header">
            <div>
              <div className="title-row" style={{ gap: 12, marginBottom: 4 }}>
                <h2>{profile.brand}</h2>
                {brandScore !== null && tone && slabel && (
                  <span className={`score-badge score-badge-${tone} score-badge-lg`} title={slabel}>
                    {slabel} · {brandScore}/100
                  </span>
                )}
              </div>
              <p>{profile.summary}</p>
            </div>
          </div>

          <div className="nda-field-grid">
            <div className="nda-field-card">
              <span>Market</span>
              <strong>{profile.market}</strong>
            </div>
            <div className="nda-field-card">
              <span>Stage</span>
              <strong>{profile.stage}</strong>
            </div>
            <div className="nda-field-card">
              <span>Owner</span>
              <strong>{profile.owner}</strong>
            </div>
            <div className="nda-field-card">
              <span>Legal status</span>
              <strong>{profile.legalStatus}</strong>
            </div>
            <div className="nda-field-card">
              <span>Next step</span>
              <strong>{profile.nextStep}</strong>
            </div>
            <div className="nda-field-card">
              <span>Last update</span>
              <strong>{formatDateTime(profile.lastUpdate)}</strong>
            </div>
          </div>
        </div>

        <div className="panel mini-panel">
          <div className="panel-header">
            <div>
              <h2>Contacts</h2>
              <p>People currently relevant to this brand.</p>
            </div>
          </div>
          <div className="context-list">
            {profile.keyContacts.map((contact) => (
              <div key={contact} className="context-card">
                <strong>{contact}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel content-span-2">
          <div className="panel-header">
            <div>
              <h2>Inbox Updates</h2>
              <p>Latest email signals tied to this brand.</p>
            </div>
          </div>
          <div className="context-list">
            {relatedUpdates.map((item) => (
              <div key={item.id} className="context-card">
                <div className="context-card-title">
                  <strong>{item.subject}</strong>
                </div>
                <p>{item.summary}</p>
                <div className="context-meta">
                  <span>{item.sender}</span>
                  <span>{item.actionNeeded}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel mini-panel">
          <div className="panel-header">
            <div>
              <h2>Documents</h2>
              <p>Drafts and files linked to this brand.</p>
            </div>
          </div>
          <div className="context-list">
            {profile.documents.map((document) => (
              <div key={document.id} className="context-card">
                <strong>{document.title}</strong>
                <p>{document.status}</p>
                {document.url ? (
                  <a className="template-link" href={document.url} target="_blank" rel="noreferrer">
                    Open document
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Open Actions</h2>
            <p>What needs to happen next for this brand.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Owner</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {relatedActions.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.owner}</td>
                  <td>{item.priority}</td>
                  <td>{item.status}</td>
                  <td>{item.dueLabel}</td>
                  <td>{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="title-row">
              <h2>Region Research</h2>
              <span className="beta-badge">BETA</span>
            </div>
            <p>AI analysis of how {profile.brand} would fit a specific market.</p>
          </div>
          <div className="action-row">
            <label className="filter-select" style={{ minWidth: 160 }}>
              <span>Target region</span>
              <select value={researchRegion} onChange={(e) => setResearchRegion(e.target.value)}>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
            <button
              className="primary-button"
              onClick={() => void runRegionResearch(profile.brand, researchRegion)}
              disabled={researchLoading}
              type="button"
            >
              <Globe size={15} />
              {researchLoading ? "Researching..." : "Research"}
            </button>
          </div>
        </div>
        {researchLoading ? (
          <div className="brief-loading" style={{ marginTop: 16 }}>
            <div className="brief-spinner" />
            Analysing {profile.brand} for {researchRegion}...
          </div>
        ) : researchText ? (
          <div className="brief-text" style={{ marginTop: 16 }}>{researchText}</div>
        ) : (
          <p className="subdued" style={{ marginTop: 12 }}>
            Select a region and click Research to get an AI-powered market fit analysis.
          </p>
        )}
      </section>

      {/* Email Draft */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="title-row">
              <h2>Email Draft</h2>
              <span className="beta-badge">BETA</span>
            </div>
            <p>Generate a follow-up email for {profile.brand} based on current stage and next step.</p>
          </div>
          <button
            className="primary-button"
            onClick={() => void generateEmailDraft(profile.brand, profile.market, profile.stage, profile.nextStep)}
            disabled={emailLoading}
            type="button"
          >
            <Mail size={15} />
            {emailLoading ? "Drafting..." : "Generate Email"}
          </button>
        </div>
        {emailLoading && (
          <div className="brief-loading" style={{ marginTop: 16 }}>
            <div className="brief-spinner" />
            Drafting email for {profile.brand}...
          </div>
        )}
        {emailText && !emailLoading && (
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            <div className="brief-text">{emailText}</div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="secondary-button" onClick={copyEmail} type="button">
                {emailCopied ? <Check size={14} /> : <Copy size={14} />}
                {emailCopied ? "Copied!" : "Copy email"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Meeting Note Ingestion */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="title-row">
              <h2>Meeting Note Ingestion</h2>
              <span className="beta-badge">BETA</span>
            </div>
            <p>Paste a call transcript or notes — AI extracts key points, next steps, and action items.</p>
          </div>
        </div>
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <textarea
            className="meeting-textarea"
            placeholder="Paste meeting transcript or raw notes here..."
            rows={5}
            value={meetingTranscript}
            onChange={e => setMeetingTranscript(e.target.value)}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="primary-button"
              onClick={() => void ingestMeetingNotes(profile.brand, meetingTranscript)}
              disabled={meetingLoading || !meetingTranscript.trim()}
              type="button"
            >
              <Mic size={15} />
              {meetingLoading ? "Processing..." : "Ingest Notes"}
            </button>
          </div>
          {meetingLoading && (
            <div className="brief-loading">
              <div className="brief-spinner" />
              Extracting insights from meeting notes...
            </div>
          )}
          {meetingResult && !meetingLoading && (
            <div className="brief-text">{meetingResult}</div>
          )}
        </div>
      </section>

      {/* Activity Log */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="title-row">
              <h2>Activity Log</h2>
              <span className="beta-badge">BETA</span>
            </div>
            <p>All interactions and AI actions for {profile.brand}.</p>
          </div>
        </div>
        <div className="activity-add-row" style={{ marginTop: 14 }}>
          <input
            className="activity-note-input"
            placeholder="Add a note (e.g. called brand, sent samples, had a call)..."
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addNote(); }}
          />
          <button className="secondary-button" onClick={addNote} disabled={!newNote.trim()} type="button">
            <PlusCircle size={14} />
            Add
          </button>
        </div>
        {activities.length === 0 ? (
          <p className="subdued" style={{ marginTop: 14 }}>No activity yet. Actions like deck prep, region research, and email drafts are logged automatically.</p>
        ) : (
          <div className="activity-timeline">
            {activities.map(entry => (
              <div key={entry.id} className="activity-entry">
                <div className="activity-dot" style={{ background: ACTIVITY_COLORS[entry.type] }} />
                <div className="activity-body">
                  <span className="activity-label">{ACTIVITY_LABELS[entry.type]}</span>
                  <p className="activity-text">{entry.text}</p>
                  <span className="activity-time">{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Brand Notes */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="title-row">
              <h2>Brand Notes</h2>
              <span className="beta-badge">BETA</span>
            </div>
            <p>Persistent notes for {profile.brand} — saved locally.</p>
          </div>
          <button className="secondary-button" onClick={saveNote} type="button">
            <Check size={14} />
            Save Notes
          </button>
        </div>
        <textarea
          className="brand-notes-area"
          placeholder="Add context, relationship notes, key contacts, or anything the team should know about this brand..."
          rows={6}
          value={brandNote}
          onChange={e => setBrandNote(e.target.value)}
          style={{ marginTop: 14 }}
        />
      </section>

      {deckOpen ? (
        <div className="brief-modal-overlay" onClick={() => setDeckOpen(false)}>
          <div className="brief-modal" onClick={(e) => e.stopPropagation()}>
            <div className="brief-modal-header">
              <div className="brief-modal-title">
                <strong>Deck Outline — {profile.brand}</strong>
                <span className="beta-badge">BETA</span>
              </div>
              <button className="ghost-button agent-close-button" onClick={() => setDeckOpen(false)} type="button">
                <X size={16} />
              </button>
            </div>
            {deckLoading ? (
              <div className="brief-loading">
                <div className="brief-spinner" />
                Preparing deck outline for {profile.brand}...
              </div>
            ) : (
              <>
                <div className="brief-text">{deckText}</div>
                <div className="brief-footer">
                  <button className="secondary-button" onClick={copyDeck} type="button">
                    {deckCopied ? <Check size={14} /> : <Copy size={14} />}
                    {deckCopied ? "Copied!" : "Copy outline"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from "lucide-react";

// ── Opptra brand tokens ────────────────────────────────────────────────────────
const C = {
  navy:   "#131A48",
  orange: "#FF5800",
  orangeLight: "#FF8C4F",
  yellow: "#FFFCE8",
  grey:   "#5A5A5A",
  greyL:  "#CECECE",
  white:  "#FFFFFF",
};
const F = {
  heading: "'Spectral', Georgia, serif",
  body:    "'Raleway', 'Segoe UI', sans-serif",
};

// ── Data ──────────────────────────────────────────────────────────────────────
const DATA = {
  beauty: {
    total: 69, active: 24, mql: 13, commercials: 1, hold: 12, reject: 2, leads: 7,
    topBrands: [
      { brand: "Nudestix",             market: "SEA",             stage: "Commercials", category: "Makeup" },
      { brand: "Beardo",               market: "SEA / GCC",       stage: "MQL",         category: "Mens' Grooming" },
      { brand: "Anastasia Bev. Hills", market: "SEA",             stage: "MQL",         category: "Makeup" },
      { brand: "Elf Beauty",           market: "Under Discussion", stage: "MQL",         category: "Makeup" },
      { brand: "Inde Wild",            market: "Under Discussion", stage: "MQL",         category: "Haircare" },
      { brand: "Deconstruct",          market: "Under Discussion", stage: "MQL",         category: "Skincare" },
      { brand: "Paula's Choice",       market: "Under Discussion", stage: "MQL",         category: "Skincare" },
    ],
    byMarket: [{ m: "Under Discussion", n: 26 }, { m: "India", n: 17 }, { m: "SEA", n: 14 }, { m: "GCC", n: 12 }],
  },
  fashion: {
    total: 52, confirmed: 15, pipeline: 18,
    confirmedRevK: 1581, pipelineRevK: 5518,
    topDeals: [
      { brand: "US Polo",      market: "GCC",   stage: "Active",  revK: 595, lob: "Footwear" },
      { brand: "Campus",       market: "GCC",   stage: "Active",  revK: 139, lob: "Footwear" },
      { brand: "FC",           market: "GCC",   stage: "Active",  revK: 112, lob: "Apparel"  },
      { brand: "Keds",         market: "GCC",   stage: "Active",  revK: 100, lob: "Footwear" },
      { brand: "Pumi",         market: "GCC",   stage: "Active",  revK: 51,  lob: "Footwear" },
      { brand: "BHPC",         market: "GCC+IN",stage: "Pipeline",revK: 569, lob: "Apparel"  },
      { brand: "Next",         market: "SEA",   stage: "Pipeline",revK: 432, lob: "Apparel"  },
      { brand: "Jack & Jones", market: "India", stage: "Pipeline",revK: 567, lob: "Apparel"  },
    ],
    byMarket: [
      { m: "GCC",   conf: 975, pipe: 1071 },
      { m: "SEA",   conf: 204, pipe: 1864 },
      { m: "India", conf: 209, pipe: 1621 },
    ],
  },
  actions: [
    { priority: "01", label: "Close Nudestix SEA",         detail: "Term sheet received — commercial decision pending. Highest-priority beauty deal.",                 owner: "Pooja Sodhi",    deadline: "Apr 2026" },
    { priority: "02", label: "Push MQL batch to SQL",       detail: "Beardo, Anastasia, Elf — 3 MQL brands ready to advance. NDA + deck prep in motion.",              owner: "Richa Gupta",    deadline: "Apr 2026" },
    { priority: "03", label: "Close BHPC & Next",           detail: "$1B+ combined pipeline. Both in SQL — proposals ready to issue.",                                  owner: "Vishwas Pandey", deadline: "May 2026" },
    { priority: "04", label: "Activate India fashion",      detail: "Jack & Jones ($567K), LCW + BHPC India — $923K pipeline sitting at lead/SQL stage.",               owner: "Vishwas Pandey", deadline: "May 2026" },
  ],
};

// ── Small building-block components ──────────────────────────────────────────
function Tag({ label, color = C.orange }: { label: string; color?: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, fontFamily: F.body, background: color + "20", color, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function KpiBox({ value, label, sub, accent = false }: { value: string; label: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{ background: accent ? C.orange : "rgba(255,255,255,0.07)", border: `1px solid ${accent ? C.orange : "rgba(255,255,255,0.15)"}`, borderRadius: 14, padding: "20px 24px", textAlign: "center" }}>
      <div style={{ fontFamily: F.heading, fontSize: 40, fontWeight: 700, color: accent ? C.white : C.orange, lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.white, opacity: 0.9 }}>{label}</div>
      {sub && <div style={{ fontFamily: F.body, fontSize: 11, color: C.white, opacity: 0.55, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function HBar({ value, max, label, sub, color = C.orange }: { value: number; max: number; label: string; sub?: string; color?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.white }}>{label}</span>
        <span style={{ fontFamily: F.body, fontSize: 12, color: C.orange }}>{sub}</span>
      </div>
      <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(100, (value / max) * 100)}%`, background: color, borderRadius: 4, transition: "width 0.8s" }} />
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 48, height: 3, background: C.orange, borderRadius: 2, marginBottom: 20 }} />;
}

// ── SLIDES ────────────────────────────────────────────────────────────────────
function Slide1() { // Title
  return (
    <div style={{ width: "100%", height: "100%", background: C.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      {/* Background grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 20% 80%, ${C.orange}15 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3b82f620 0%, transparent 50%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${C.white}08 1px, transparent 1px), linear-gradient(90deg, ${C.white}08 1px, transparent 1px)`, backgroundSize: "60px 60px", pointerEvents: "none" }} />

      <img src="https://cdn.prod.website-files.com/67a44396c211269f785f9dfe/67a4a8650573be9ae072ae9e_Opptra-logo.svg" alt="Opptra" style={{ height: 44, marginBottom: 48, filter: "brightness(0) invert(1)" }} />

      <div style={{ textAlign: "center", maxWidth: 820, padding: "0 40px" }}>
        <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.orange, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 20 }}>
          Portfolio Intelligence · April 2026
        </div>
        <h1 style={{ fontFamily: F.heading, fontSize: 62, fontWeight: 300, color: C.white, margin: "0 0 16px", lineHeight: 1.1, letterSpacing: "-0.04em" }}>
          Beauty + Fashion<br />
          <span style={{ fontWeight: 700, color: C.orange }}>Command Center</span>
        </h1>
        <p style={{ fontFamily: F.body, fontSize: 18, color: "rgba(255,255,255,0.6)", margin: "0 0 40px", lineHeight: 1.6 }}>
          121 brand opportunities · GCC · India · SEA<br />
          Live pipeline intelligence powered by AI
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {["69 Beauty Brands", "52 Fashion Brands", "3 Key Markets", "$7.1M Portfolio"].map(t => (
            <Tag key={t} label={t} color={C.white} />
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 32, fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>CONFIDENTIAL · OPPTRA INTERNAL</div>
    </div>
  );
}

function Slide2() { // Portfolio at a Glance
  return (
    <div style={{ width: "100%", height: "100%", background: C.navy, display: "flex", flexDirection: "column", padding: "48px 60px" }}>
      <div style={{ fontFamily: F.body, fontSize: 12, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Portfolio Overview</div>
      <h2 style={{ fontFamily: F.heading, fontSize: 44, fontWeight: 300, color: C.white, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
        At a <span style={{ fontWeight: 700, color: C.orange }}>Glance</span>
      </h2>
      <Divider />

      {/* Top KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 32 }}>
        <KpiBox value="121" label="Total Opportunities" sub="Brand × Market" accent />
        <KpiBox value="69" label="Beauty Brands" sub="Live Google Sheet" />
        <KpiBox value="52" label="Fashion Brands" sub="SL BD Tracker" />
        <KpiBox value="$1.6M" label="Confirmed Revenue" sub="Fashion Dec '26" />
        <KpiBox value="$5.5M" label="Pipeline Potential" sub="Fashion + Named" />
      </div>

      {/* Split: Beauty vs Fashion */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, flex: 1 }}>
        {/* Beauty */}
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ec4899" }} />
            <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.white, textTransform: "uppercase", letterSpacing: "0.08em" }}>Beauty Pipeline</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
            {[["1", "Commercials"], ["13", "MQL"], ["7", "Leads"]].map(([v, l]) => (
              <div key={l} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontFamily: F.heading, fontSize: 28, fontWeight: 700, color: "#ec4899" }}>{v}</div>
                <div style={{ fontFamily: F.body, fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          {DATA.beauty.byMarket.map(({ m, n }) => (
            <HBar key={m} value={n} max={30} label={m} sub={`${n} brands`} color="#ec4899" />
          ))}
        </div>

        {/* Fashion */}
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.orange }} />
            <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.white, textTransform: "uppercase", letterSpacing: "0.08em" }}>Fashion Pipeline</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
            {[["$1.6M", "Confirmed"], ["$5.5M", "Pipeline"], ["14", "Active Deals"]].map(([v, l]) => (
              <div key={l} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontFamily: F.heading, fontSize: v.startsWith("$") ? 22 : 28, fontWeight: 700, color: C.orange }}>{v}</div>
                <div style={{ fontFamily: F.body, fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          {DATA.fashion.byMarket.map(({ m, conf, pipe }) => (
            <HBar key={m} value={conf + pipe} max={3000} label={m} sub={`$${conf}K+$${pipe}K`} color={C.orange} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Slide3() { // Beauty Pipeline
  const stageColors: Record<string, string> = { Commercials: "#FF5800", SQL: "#8b5cf6", MQL: "#3b82f6", Leads: "#22c55e", Hold: "#94a3b8", Reject: "#ef4444" };

  return (
    <div style={{ width: "100%", height: "100%", background: C.navy, display: "flex", flexDirection: "column", padding: "48px 60px" }}>
      <div style={{ fontFamily: F.body, fontSize: 12, color: "#ec4899", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Beauty · 69 Brands Tracked</div>
      <h2 style={{ fontFamily: F.heading, fontSize: 44, fontWeight: 300, color: C.white, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
        Beauty <span style={{ fontWeight: 700, color: "#ec4899" }}>Pipeline</span>
      </h2>
      <Divider />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, flex: 1 }}>
        {/* Stage funnel */}
        <div>
          <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Pipeline Funnel</div>
          {[
            { stage: "Commercials", count: 1,  note: "Nudestix SEA — term sheet received" },
            { stage: "MQL",         count: 13, note: "Beardo, Elf, Anastasia, Inde Wild..." },
            { stage: "Leads",       count: 7,  note: "Lancome, YSL, Azzaro, Solinotes..." },
            { stage: "Hold",        count: 12, note: "Primarily small opp / restructuring" },
            { stage: "Reject",      count: 2,  note: "Too small / terms not agreed" },
          ].map(({ stage, count, note }) => (
            <div key={stage} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{ width: Math.max(32, (count / 13) * 160), height: 40, background: (stageColors[stage] || "#64748b") + "30", border: `1px solid ${stageColors[stage] || "#64748b"}40`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: F.heading, fontSize: 18, fontWeight: 700, color: stageColors[stage] || "#64748b" }}>{count}</span>
              </div>
              <div>
                <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.white }}>{stage}</div>
                <div style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{note}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Top brands table */}
        <div>
          <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Top Active Brands</div>
          {DATA.beauty.topBrands.map((b, i) => (
            <div key={b.brand} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: i === 0 ? "rgba(255,88,0,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${i === 0 ? "rgba(255,88,0,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: F.heading, fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.2)", width: 20 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.white }}>{b.brand}</div>
                <div style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{b.category} · {b.market}</div>
              </div>
              <Tag label={b.stage} color={stageColors[b.stage] || C.orange} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Slide4() { // Fashion Pipeline
  return (
    <div style={{ width: "100%", height: "100%", background: C.navy, display: "flex", flexDirection: "column", padding: "48px 60px" }}>
      <div style={{ fontFamily: F.body, fontSize: 12, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Fashion / Softlines · 52 Brands Tracked</div>
      <h2 style={{ fontFamily: F.heading, fontSize: 44, fontWeight: 300, color: C.white, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
        Fashion <span style={{ fontWeight: 700, color: C.orange }}>Pipeline</span>
      </h2>
      <Divider />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, flex: 1 }}>
        {/* Confirmed deals */}
        <div>
          <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
            Top Deals by Revenue (Dec '26 Forecast)
          </div>
          {DATA.fashion.topDeals.map((d, i) => (
            <div key={d.brand + d.market} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: d.stage === "Active" ? "rgba(255,88,0,0.1)" : "rgba(59,130,246,0.08)", border: `1px solid ${d.stage === "Active" ? "rgba(255,88,0,0.3)" : "rgba(59,130,246,0.2)"}`, borderRadius: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: F.heading, fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.2)", width: 20 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.white }}>{d.brand}</div>
                <div style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{d.lob} · {d.market}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: F.heading, fontSize: 16, fontWeight: 700, color: d.stage === "Active" ? C.orange : "#3b82f6" }}>${d.revK}K</div>
                <div style={{ fontFamily: F.body, fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{d.stage}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue by market + LOB */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 14 }}>Revenue by Market</div>
            {DATA.fashion.byMarket.map(({ m, conf, pipe }) => (
              <div key={m} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.white }}>{m}</span>
                  <span style={{ fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>${conf}K confirmed + ${pipe}K pipeline</span>
                </div>
                <div style={{ height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 5, overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, height: "100%", width: `${Math.min(100, (conf / 2500) * 100)}%`, background: C.orange, borderRadius: 5 }} />
                  <div style={{ position: "absolute", left: `${Math.min(100, (conf / 2500) * 100)}%`, height: "100%", width: `${Math.min(100, (pipe / 2500) * 100)}%`, background: "#3b82f6", borderRadius: 5 }} />
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: C.orange }} />
                <span style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Confirmed</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "#3b82f6" }} />
                <span style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Pipeline</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Apparel", pct: 62, revK: 4403, color: "#8b5cf6" },
              { label: "Footwear", pct: 38, revK: 2696, color: C.orange },
            ].map(({ label, pct, revK, color }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "18px", textAlign: "center" }}>
                <div style={{ fontFamily: F.heading, fontSize: 32, fontWeight: 700, color, marginBottom: 4 }}>{pct}%</div>
                <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.white }}>{label}</div>
                <div style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>${revK}K total</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Slide5() { // Revenue
  return (
    <div style={{ width: "100%", height: "100%", background: C.navy, display: "flex", flexDirection: "column", padding: "48px 60px" }}>
      <div style={{ fontFamily: F.body, fontSize: 12, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Financial Snapshot</div>
      <h2 style={{ fontFamily: F.heading, fontSize: 44, fontWeight: 300, color: C.white, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
        Revenue <span style={{ fontWeight: 700, color: C.orange }}>Picture</span>
      </h2>
      <Divider />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, flex: 1 }}>
        {/* Left: numbers */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Big confirmed */}
          <div style={{ background: "linear-gradient(135deg, rgba(255,88,0,0.15), rgba(255,88,0,0.05))", border: "1px solid rgba(255,88,0,0.3)", borderRadius: 16, padding: "28px 32px" }}>
            <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.orange, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Fashion Confirmed Revenue (Dec '26)</div>
            <div style={{ fontFamily: F.heading, fontSize: 54, fontWeight: 700, color: C.white, lineHeight: 1 }}>$1.58<span style={{ fontSize: 28, color: C.orange }}>M</span></div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>Active + Signed deals only · 15 confirmed brand-market pairs</div>
          </div>

          {/* Pipeline */}
          <div style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 16, padding: "22px 28px" }}>
            <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Fashion Pipeline (Jun '28)</div>
            <div style={{ fontFamily: F.heading, fontSize: 40, fontWeight: 700, color: C.white, lineHeight: 1 }}>$5.52<span style={{ fontSize: 22, color: "#3b82f6" }}>M</span></div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>Named deals in SQL/MQL stage</div>
          </div>

          {/* Beauty */}
          <div style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 16, padding: "22px 28px" }}>
            <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: "#ec4899", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Beauty Pipeline Status</div>
            <div style={{ fontFamily: F.heading, fontSize: 32, fontWeight: 700, color: C.white, lineHeight: 1 }}>Pre-Revenue</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>69 brands in active discussion — revenue unlocks on deal close</div>
          </div>
        </div>

        {/* Right: breakdown */}
        <div>
          <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 14 }}>Total Portfolio Opportunity</div>

          <div style={{ marginBottom: 24 }}>
            {[
              { label: "Fashion Confirmed",  val: 1581, max: 7100, color: C.orange, fmt: "$1.58M" },
              { label: "Fashion Pipeline",   val: 5518, max: 7100, color: "#3b82f6", fmt: "$5.52M" },
              { label: "Beauty (potential)", val: 0,    max: 7100, color: "#ec4899", fmt: "TBD" },
            ].map(({ label, val, max, color, fmt }) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.white }}>{label}</span>
                  <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color }}>{fmt}</span>
                </div>
                <div style={{ height: 12, background: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(val / max) * 100}%`, background: color, borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 12 }}>Key Revenue Milestones</div>
            {[
              { date: "Apr 2026", event: "Nudestix SEA close → first beauty revenue signal" },
              { date: "Jun 2026", event: "BHPC + Next sign → $1B+ new pipeline confirmed" },
              { date: "Dec 2026", event: "$1.58M fashion revenue realized" },
              { date: "Jun 2028", event: "$7.1M combined portfolio target" },
            ].map(({ date, event }) => (
              <div key={date} style={{ display: "flex", gap: 14, marginBottom: 12 }}>
                <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.orange, whiteSpace: "nowrap", paddingTop: 2 }}>{date}</span>
                <span style={{ fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{event}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Slide6() { // Action Plan
  return (
    <div style={{ width: "100%", height: "100%", background: C.navy, display: "flex", flexDirection: "column", padding: "48px 60px" }}>
      <div style={{ fontFamily: F.body, fontSize: 12, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Q2 2026 Priorities</div>
      <h2 style={{ fontFamily: F.heading, fontSize: 44, fontWeight: 300, color: C.white, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
        What We're <span style={{ fontWeight: 700, color: C.orange }}>Doing Next</span>
      </h2>
      <Divider />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1 }}>
        {DATA.actions.map(({ priority, label, detail, owner, deadline }) => (
          <div key={priority} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "24px 28px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: F.heading, fontSize: 16, fontWeight: 700, color: C.white }}>{priority}</span>
              </div>
              <div style={{ fontFamily: F.heading, fontSize: 20, fontWeight: 700, color: C.white, lineHeight: 1.3 }}>{label}</div>
            </div>
            <p style={{ fontFamily: F.body, fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: "0 0 16px", flex: 1 }}>{detail}</p>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Tag label={owner} color={C.orangeLight} />
              <Tag label={deadline} color="rgba(255,255,255,0.5)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide7() { // Close
  return (
    <div style={{ width: "100%", height: "100%", background: C.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 50% 50%, ${C.orange}10 0%, transparent 65%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${C.white}05 1px, transparent 1px), linear-gradient(90deg, ${C.white}05 1px, transparent 1px)`, backgroundSize: "60px 60px", pointerEvents: "none" }} />

      <img src="https://cdn.prod.website-files.com/67a44396c211269f785f9dfe/67a4a8650573be9ae072ae9e_Opptra-logo.svg" alt="Opptra" style={{ height: 40, marginBottom: 48, filter: "brightness(0) invert(1)" }} />

      <div style={{ textAlign: "center", maxWidth: 680 }}>
        <h2 style={{ fontFamily: F.heading, fontSize: 56, fontWeight: 300, color: C.white, letterSpacing: "-0.04em", margin: "0 0 20px", lineHeight: 1.1 }}>
          One Platform.<br /><span style={{ fontWeight: 700, color: C.orange }}>Every Brand.</span>
        </h2>
        <p style={{ fontFamily: F.body, fontSize: 17, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: "0 0 40px" }}>
          Beauty + Fashion · GCC · India · SEA<br />
          AI-powered intelligence, live from every sheet
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          {["Live Google Sheet Sync", "AI Pipeline Analysis", "Revenue Intelligence", "Data Workspace"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.orange }} />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 32, fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>OPPTRA · CONFIDENTIAL · APRIL 2026</div>
    </div>
  );
}

// ── Slide manifest ─────────────────────────────────────────────────────────────
const SLIDES = [
  { id: 1, title: "Title",         component: Slide1 },
  { id: 2, title: "At a Glance",   component: Slide2 },
  { id: 3, title: "Beauty",        component: Slide3 },
  { id: 4, title: "Fashion",       component: Slide4 },
  { id: 5, title: "Revenue",       component: Slide5 },
  { id: 6, title: "Actions",       component: Slide6 },
  { id: 7, title: "Close",         component: Slide7 },
];

// ── Main component ────────────────────────────────────────────────────────────
export function PresentationPage() {
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(SLIDES.length - 1, c + 1)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")                    { e.preventDefault(); prev(); }
      if (e.key === "f" || e.key === "F")                                    { toggleFs(); }
      if (e.key === "Escape" && fullscreen)                                  { setFullscreen(false); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, fullscreen]);

  function toggleFs() {
    if (!fullscreen) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setFullscreen(false);
    }
  }

  const SlideComponent = SLIDES[current].component;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", background: "#0a0e28", fontFamily: F.body }}>
      {/* Font import */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" />
      <link href="https://fonts.googleapis.com/css2?family=Spectral:wght@300;600;700&family=Raleway:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Slide area */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px 12px", overflow: "hidden" }}>
        <div style={{ width: "100%", maxWidth: 1100, aspectRatio: "16/9", background: C.navy, borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", position: "relative" }}>
          <SlideComponent />
        </div>
      </div>

      {/* Controls bar */}
      <div style={{ padding: "10px 24px 16px", display: "flex", alignItems: "center", gap: 16 }}>
        {/* Prev */}
        <button onClick={prev} disabled={current === 0}
          style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: current === 0 ? "rgba(255,255,255,0.2)" : C.white, cursor: current === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={18} />
        </button>

        {/* Slide dots */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          {SLIDES.map((s, i) => (
            <button key={s.id} onClick={() => setCurrent(i)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "4px 6px" }}>
              <div style={{ width: i === current ? 24 : 8, height: 6, borderRadius: 3, background: i === current ? C.orange : "rgba(255,255,255,0.2)", transition: "all 0.25s" }} />
              <span style={{ fontSize: 10, color: i === current ? C.orange : "rgba(255,255,255,0.3)", fontFamily: F.body, fontWeight: 600, transition: "color 0.2s" }}>
                {s.title}
              </span>
            </button>
          ))}
        </div>

        {/* Slide counter */}
        <span style={{ fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,0.35)", minWidth: 50, textAlign: "center" }}>
          {current + 1} / {SLIDES.length}
        </span>

        {/* Fullscreen */}
        <button onClick={toggleFs}
          style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>

        {/* Next */}
        <button onClick={next} disabled={current === SLIDES.length - 1}
          style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: current === SLIDES.length - 1 ? "rgba(255,255,255,0.03)" : C.orange, color: C.white, cursor: current === SLIDES.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ textAlign: "center", paddingBottom: 8, fontFamily: F.body, fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>
        ← → arrow keys to navigate · F for fullscreen
      </div>
    </div>
  );
}

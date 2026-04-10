import { useState, useEffect } from "react";
import {
  AlertTriangle, ArrowUpRight, Box, CheckCircle2, ChevronDown,
  ChevronUp, Clock, Package, RefreshCw, ShoppingCart, TrendingDown,
  TrendingUp, Truck, XCircle, Zap
} from "lucide-react";

// ─── Mock data (graceful fallback when Supabase not connected) ────────────────

const MOCK_INVENTORY: InventoryRow[] = [
  { sku: "ND-LIP-001", product_name: "Nudestix Lip + Cheek Pencil — Sunkissed", category: "Lip", brand: "Nudestix", channel: "Sephora", quantity_on_hand: 142, quantity_reserved: 40, quantity_available: 102, unit_cost: 18, total_value: 2556, days_of_supply: 12, sell_through: 72 },
  { sku: "ND-FDN-002", product_name: "Nudestix Tinted Cover Foundation", category: "Face", brand: "Nudestix", channel: "Nykaa", quantity_on_hand: 38, quantity_reserved: 12, quantity_available: 26, unit_cost: 32, total_value: 1216, days_of_supply: 6, sell_through: 88 },
  { sku: "MH-MSK-001", product_name: "MaskerAide Detox Party Mask", category: "Skincare", brand: "MaskerAide", channel: "Noon", quantity_on_hand: 520, quantity_reserved: 20, quantity_available: 500, unit_cost: 8, total_value: 4160, days_of_supply: 94, sell_through: 14 },
  { sku: "ND-EYE-003", product_name: "Nudestix Magnetic Eye Color Pencil", category: "Eye", brand: "Nudestix", channel: "Sephora", quantity_on_hand: 67, quantity_reserved: 15, quantity_available: 52, unit_cost: 24, total_value: 1608, days_of_supply: 21, sell_through: 61 },
  { sku: "MH-SRM-002", product_name: "MaskerAide Brightening Serum", category: "Skincare", brand: "MaskerAide", channel: "Nykaa", quantity_on_hand: 14, quantity_reserved: 5, quantity_available: 9, unit_cost: 22, total_value: 308, days_of_supply: 3, sell_through: 95 },
  { sku: "ND-BRS-004", product_name: "Nudestix Brow Save Gel", category: "Brow", brand: "Nudestix", channel: "Direct", quantity_on_hand: 210, quantity_reserved: 10, quantity_available: 200, unit_cost: 16, total_value: 3360, days_of_supply: 78, sell_through: 22 },
  { sku: "MH-CLN-003", product_name: "MaskerAide Pore Cleansing Strips", category: "Skincare", brand: "MaskerAide", channel: "Noon", quantity_on_hand: 89, quantity_reserved: 20, quantity_available: 69, unit_cost: 6, total_value: 534, days_of_supply: 31, sell_through: 48 },
  { sku: "ND-CNT-005", product_name: "Nudestix Contour Pencil", category: "Face", brand: "Nudestix", channel: "Sephora", quantity_on_hand: 22, quantity_reserved: 8, quantity_available: 14, unit_cost: 28, total_value: 616, days_of_supply: 5, sell_through: 91 },
];

const MOCK_ALERTS: AlertRow[] = [
  { id: "a1", alert_type: "low_stock",  severity: "critical", sku: "MH-SRM-002", product_name: "MaskerAide Brightening Serum",   message: "Only 3 days of supply remaining at current velocity",          recommended_action: "Place emergency reorder of 200 units immediately", acknowledged: false, resolved: false, created_at: "2026-04-09T08:00:00Z" },
  { id: "a2", alert_type: "low_stock",  severity: "critical", sku: "ND-FDN-002", product_name: "Nudestix Tinted Cover Foundation", message: "6 days of supply. Lead time is 14 days — already in stockout window", recommended_action: "Expedite PO with supplier — request air freight",        acknowledged: false, resolved: false, created_at: "2026-04-09T09:00:00Z" },
  { id: "a3", alert_type: "low_stock",  severity: "critical", sku: "ND-CNT-005", product_name: "Nudestix Contour Pencil",         message: "5 days of supply. Trending up 40% WoW",                         recommended_action: "Reorder 150 units. Prioritize Sephora channel",      acknowledged: false, resolved: false, created_at: "2026-04-09T10:00:00Z" },
  { id: "a4", alert_type: "dead_stock", severity: "warning",  sku: "MH-MSK-001", product_name: "MaskerAide Detox Party Mask",     message: "94 days of supply. Sell-through only 14% in 60 days",          recommended_action: "Consider 20% promotion or redirect units to GCC market", acknowledged: false, resolved: false, created_at: "2026-04-08T14:00:00Z" },
  { id: "a5", alert_type: "overstock",  severity: "warning",  sku: "ND-BRS-004", product_name: "Nudestix Brow Save Gel",          message: "78 days of supply. Holding cost accruing",                     recommended_action: "Bundle with Lip Pencil or run retailer promotion",   acknowledged: true,  resolved: false, created_at: "2026-04-07T11:00:00Z" },
];

const MOCK_REORDERS: ReorderRow[] = [
  { id: "r1", sku: "MH-SRM-002", product_name: "MaskerAide Brightening Serum",   brand: "MaskerAide", supplier_name: "Maskeraide CA",  current_stock: 14,  recommended_order_qty: 200, reorder_point: 30,  safety_stock: 15, lead_time_days: 14, estimated_cost: 4400,  priority: "critical", reason: "Stockout in 3 days, below safety stock",      status: "pending" },
  { id: "r2", sku: "ND-FDN-002", product_name: "Nudestix Tinted Cover Foundation", brand: "Nudestix", supplier_name: "Nudestix Corp",  current_stock: 38,  recommended_order_qty: 150, reorder_point: 50,  safety_stock: 20, lead_time_days: 14, estimated_cost: 4800,  priority: "critical", reason: "6 days supply, inside lead time window",       status: "pending" },
  { id: "r3", sku: "ND-CNT-005", product_name: "Nudestix Contour Pencil",         brand: "Nudestix", supplier_name: "Nudestix Corp",  current_stock: 22,  recommended_order_qty: 150, reorder_point: 40,  safety_stock: 15, lead_time_days: 14, estimated_cost: 4200,  priority: "critical", reason: "5 days supply, +40% WoW demand spike",        status: "pending" },
  { id: "r4", sku: "ND-LIP-001", product_name: "Nudestix Lip + Cheek Pencil",     brand: "Nudestix", supplier_name: "Nudestix Corp",  current_stock: 142, recommended_order_qty: 300, reorder_point: 80,  safety_stock: 40, lead_time_days: 14, estimated_cost: 5400,  priority: "high",     reason: "12 days supply, seasonal uplift expected",    status: "pending" },
  { id: "r5", sku: "MH-CLN-003", product_name: "MaskerAide Pore Cleansing Strips", brand: "MaskerAide", supplier_name: "Maskeraide CA", current_stock: 89, recommended_order_qty: 400, reorder_point: 60,  safety_stock: 30, lead_time_days: 21, estimated_cost: 2400,  priority: "medium",   reason: "31 days supply, routine reorder cycle",       status: "approved" },
];

const MOCK_SUPPLIERS = [
  { id: "s1", name: "Nudestix Corp",   contact_email: "supply@nudestix.com",   lead_time_days: 14, minimum_order_qty: 100, payment_terms: "Net 30", rating: 4.8, active: true, skus: 5 },
  { id: "s2", name: "Maskeraide CA",   contact_email: "orders@maskeraide.com", lead_time_days: 21, minimum_order_qty: 200, payment_terms: "Net 45", rating: 4.2, active: true, skus: 3 },
  { id: "s3", name: "Sephora 3PL",    contact_email: "ops@sephora.com",       lead_time_days: 3,  minimum_order_qty: 50,  payment_terms: "Net 15", rating: 4.6, active: true, skus: 8 },
];

const MOCK_FORECAST = [
  { sku: "ND-LIP-001", product_name: "Nudestix Lip + Cheek Pencil", days: [
    { date: "Apr 11", predicted: 12, lower: 9, upper: 16 },
    { date: "Apr 18", predicted: 15, lower: 11, upper: 20 },
    { date: "Apr 25", predicted: 18, lower: 13, upper: 24 },
    { date: "May 02", predicted: 22, lower: 16, upper: 29 },
  ]},
  { sku: "MH-SRM-002", product_name: "MaskerAide Brightening Serum", days: [
    { date: "Apr 11", predicted: 5,  lower: 3, upper: 7  },
    { date: "Apr 18", predicted: 6,  lower: 4, upper: 9  },
    { date: "Apr 25", predicted: 7,  lower: 5, upper: 10 },
    { date: "May 02", predicted: 8,  lower: 5, upper: 12 },
  ]},
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface InventoryRow {
  sku: string; product_name: string; category: string; brand: string;
  channel: string; quantity_on_hand: number; quantity_reserved: number;
  quantity_available: number; unit_cost: number; total_value: number;
  days_of_supply: number; sell_through: number;
}
interface AlertRow {
  id: string; alert_type: string; severity: "critical" | "warning" | "info";
  sku: string | null; product_name: string | null; message: string;
  recommended_action: string | null; acknowledged: boolean; resolved: boolean;
  created_at: string;
}
interface ReorderRow {
  id: string; sku: string; product_name: string; brand: string;
  supplier_name: string | null; current_stock: number;
  recommended_order_qty: number; reorder_point: number; safety_stock: number;
  lead_time_days: number | null; estimated_cost: number | null;
  priority: "critical" | "high" | "medium" | "low";
  reason: string | null; status: "pending" | "approved" | "ordered" | "rejected";
}

type Tab = "stock" | "alerts" | "reorders" | "forecast" | "suppliers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sellThroughColor(pct: number) {
  if (pct >= 80) return { bg: "#dcfce7", color: "#16a34a", label: "Fast" };
  if (pct >= 50) return { bg: "#fef9c3", color: "#ca8a04", label: "Moderate" };
  if (pct >= 25) return { bg: "#ffedd5", color: "#ea580c", label: "Slow" };
  return { bg: "#fee2e2", color: "#dc2626", label: "Dead" };
}

function daysColor(days: number) {
  if (days <= 7)  return "#dc2626";
  if (days <= 21) return "#ea580c";
  if (days <= 45) return "#ca8a04";
  return "#16a34a";
}

function priorityPill(p: string) {
  const map: Record<string, { bg: string; color: string }> = {
    critical: { bg: "#fee2e2", color: "#dc2626" },
    high:     { bg: "#ffedd5", color: "#ea580c" },
    medium:   { bg: "#fef9c3", color: "#ca8a04" },
    low:      { bg: "#dcfce7", color: "#16a34a" },
  };
  return map[p] || { bg: "#f1f5f9", color: "#64748b" };
}

function fmt(n: number) {
  return n.toLocaleString();
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InventoryPage() {
  const [tab, setTab] = useState<Tab>("alerts");
  const [inventory] = useState<InventoryRow[]>(MOCK_INVENTORY);
  const [alerts, setAlerts] = useState<AlertRow[]>(MOCK_ALERTS);
  const [reorders, setReorders] = useState<ReorderRow[]>(MOCK_REORDERS);
  const [sortCol, setSortCol] = useState<keyof InventoryRow>("days_of_supply");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterBrand, setFilterBrand] = useState("All");
  const [loading, setLoading] = useState(false);

  // KPIs
  const totalValue     = inventory.reduce((s, r) => s + r.total_value, 0);
  const criticalAlerts = alerts.filter(a => a.severity === "critical" && !a.resolved).length;
  const pendingOrders  = reorders.filter(r => r.status === "pending").length;
  const avgDays        = Math.round(inventory.reduce((s, r) => s + r.days_of_supply, 0) / inventory.length);
  const deadStockValue = inventory.filter(r => r.sell_through < 25).reduce((s, r) => s + r.total_value, 0);

  // Sort & filter inventory
  const brands = ["All", ...Array.from(new Set(inventory.map(r => r.brand)))];
  const sorted = [...inventory]
    .filter(r => filterBrand === "All" || r.brand === filterBrand)
    .sort((a, b) => {
      const av = a[sortCol] as any;
      const bv = b[sortCol] as any;
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  function toggleSort(col: keyof InventoryRow) {
    if (sortCol === col) setSortAsc(s => !s);
    else { setSortCol(col); setSortAsc(true); }
  }

  function acknowledgeAlert(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  }

  function approveReorder(id: string) {
    setReorders(prev => prev.map(r => r.id === id ? { ...r, status: "approved" } : r));
  }

  function rejectReorder(id: string) {
    setReorders(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" } : r));
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "alerts",    label: `🚨 Alerts (${criticalAlerts})` },
    { id: "reorders",  label: `📦 Reorders (${pendingOrders} pending)` },
    { id: "stock",     label: "📊 Stock Overview" },
    { id: "forecast",  label: "📈 Demand Forecast" },
    { id: "suppliers", label: "🚚 Suppliers" },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <Package size={22} color="#FF5800" />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#131A48", margin: 0 }}>Inventory Planner</h1>
          <span style={{ background: "#FF580015", color: "#FF5800", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: "1px solid #FF580030" }}>LIVE</span>
        </div>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Stock health, reorder alerts, demand forecasts and supplier management</p>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 28 }}>
        <KpiCard icon={<Box size={16} />}          label="Total Stock Value"    value={`$${fmt(totalValue)}`}         sub="across all SKUs"          color="#131A48" />
        <KpiCard icon={<AlertTriangle size={16} />} label="Critical Alerts"     value={String(criticalAlerts)}         sub="need immediate action"    color="#dc2626" bg="#fee2e2" />
        <KpiCard icon={<ShoppingCart size={16} />}  label="Pending Reorders"    value={String(pendingOrders)}          sub="awaiting approval"        color="#ea580c" bg="#ffedd5" />
        <KpiCard icon={<Clock size={16} />}         label="Avg Days of Supply"  value={`${avgDays}d`}                  sub="across portfolio"         color="#131A48" />
        <KpiCard icon={<TrendingDown size={16} />}  label="Dead Stock Value"    value={`$${fmt(deadStockValue)}`}      sub="sell-through < 25%"       color="#dc2626" bg="#fee2e2" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #e2e8f0", paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 16px", fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? "#FF5800" : "#64748b",
            background: "none", border: "none", borderBottom: tab === t.id ? "2px solid #FF5800" : "2px solid transparent",
            cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s"
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── ALERTS TAB ─────────────────────────────────────────────────────── */}
      {tab === "alerts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {alerts.filter(a => !a.resolved).map(alert => (
            <div key={alert.id} style={{
              background: "white", border: `1px solid ${alert.severity === "critical" ? "#fecaca" : "#fed7aa"}`,
              borderLeft: `4px solid ${alert.severity === "critical" ? "#dc2626" : "#ea580c"}`,
              borderRadius: 10, padding: "16px 20px",
              opacity: alert.acknowledged ? 0.6 : 1
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                      background: alert.severity === "critical" ? "#fee2e2" : "#ffedd5",
                      color: alert.severity === "critical" ? "#dc2626" : "#ea580c",
                      textTransform: "uppercase"
                    }}>{alert.severity}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{alert.alert_type.replace("_", " ").toUpperCase()}</span>
                    {alert.acknowledged && <span style={{ fontSize: 11, color: "#94a3b8" }}>• Acknowledged</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#131A48", marginBottom: 4 }}>{alert.product_name}</div>
                  <div style={{ fontSize: 13, color: "#475569", marginBottom: 8 }}>{alert.message}</div>
                  {alert.recommended_action && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "8px 12px" }}>
                      <Zap size={13} color="#16a34a" style={{ marginTop: 1, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "#166534" }}><strong>Action:</strong> {alert.recommended_action}</span>
                    </div>
                  )}
                </div>
                {!alert.acknowledged && (
                  <button onClick={() => acknowledgeAlert(alert.id)} style={{
                    padding: "6px 14px", fontSize: 12, fontWeight: 600,
                    background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: 6, cursor: "pointer", color: "#475569", whiteSpace: "nowrap"
                  }}>Acknowledge</button>
                )}
              </div>
            </div>
          ))}
          {alerts.filter(a => !a.resolved).length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
              <CheckCircle2 size={40} color="#22c55e" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 600 }}>All clear — no active alerts</div>
            </div>
          )}
        </div>
      )}

      {/* ── REORDERS TAB ───────────────────────────────────────────────────── */}
      {tab === "reorders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reorders.map(r => {
            const pp = priorityPill(r.priority);
            return (
              <div key={r.id} style={{
                background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: pp.bg, color: pp.color, textTransform: "uppercase" }}>{r.priority}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{r.sku}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>• {r.supplier_name}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#131A48", marginBottom: 4 }}>{r.product_name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>{r.reason}</div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <Stat label="Current Stock" value={`${fmt(r.current_stock)} units`} />
                      <Stat label="Order Qty" value={`${fmt(r.recommended_order_qty)} units`} highlight />
                      <Stat label="Reorder Point" value={`${fmt(r.reorder_point)} units`} />
                      <Stat label="Lead Time" value={`${r.lead_time_days}d`} />
                      {r.estimated_cost && <Stat label="Est. Cost" value={`$${fmt(r.estimated_cost)}`} />}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                    <StatusPill status={r.status} />
                    {r.status === "pending" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => approveReorder(r.id)} style={{
                          padding: "6px 14px", fontSize: 12, fontWeight: 600,
                          background: "#131A48", color: "white", border: "none",
                          borderRadius: 6, cursor: "pointer"
                        }}>Approve</button>
                        <button onClick={() => rejectReorder(r.id)} style={{
                          padding: "6px 12px", fontSize: 12, fontWeight: 600,
                          background: "#f8fafc", color: "#dc2626", border: "1px solid #fecaca",
                          borderRadius: 6, cursor: "pointer"
                        }}>Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── STOCK OVERVIEW TAB ─────────────────────────────────────────────── */}
      {tab === "stock" && (
        <div>
          {/* Brand filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {brands.map(b => (
              <button key={b} onClick={() => setFilterBrand(b)} style={{
                padding: "5px 14px", fontSize: 12, fontWeight: filterBrand === b ? 600 : 400,
                background: filterBrand === b ? "#131A48" : "#f8fafc",
                color: filterBrand === b ? "white" : "#64748b",
                border: `1px solid ${filterBrand === b ? "#131A48" : "#e2e8f0"}`,
                borderRadius: 20, cursor: "pointer"
              }}>{b}</button>
            ))}
          </div>

          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {[
                    { label: "Product", col: "product_name" },
                    { label: "SKU", col: "sku" },
                    { label: "Channel", col: "channel" },
                    { label: "On Hand", col: "quantity_on_hand" },
                    { label: "Available", col: "quantity_available" },
                    { label: "Days Supply", col: "days_of_supply" },
                    { label: "Sell-Through", col: "sell_through" },
                    { label: "Stock Value", col: "total_value" },
                  ].map(h => (
                    <th key={h.col} onClick={() => toggleSort(h.col as keyof InventoryRow)} style={{
                      padding: "10px 14px", textAlign: "left", fontWeight: 600,
                      color: "#475569", cursor: "pointer", userSelect: "none",
                      whiteSpace: "nowrap"
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {h.label}
                        {sortCol === h.col ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => {
                  const st = sellThroughColor(row.sell_through);
                  return (
                    <tr key={row.sku} style={{ borderBottom: i < sorted.length - 1 ? "1px solid #f1f5f9" : "none", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ padding: "11px 14px", fontWeight: 500, color: "#131A48" }}>{row.product_name}</td>
                      <td style={{ padding: "11px 14px", color: "#94a3b8", fontFamily: "monospace", fontSize: 12 }}>{row.sku}</td>
                      <td style={{ padding: "11px 14px", color: "#475569" }}>{row.channel}</td>
                      <td style={{ padding: "11px 14px", color: "#131A48", fontWeight: 500 }}>{fmt(row.quantity_on_hand)}</td>
                      <td style={{ padding: "11px 14px", color: "#131A48" }}>{fmt(row.quantity_available)}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ color: daysColor(row.days_of_supply), fontWeight: 700 }}>{row.days_of_supply}d</span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 50, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${row.sell_through}%`, height: "100%", background: st.color, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: st.bg, color: st.color }}>{row.sell_through}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px", color: "#131A48", fontWeight: 500 }}>${fmt(row.total_value)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DEMAND FORECAST TAB ────────────────────────────────────────────── */}
      {tab === "forecast" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#0369a1" }}>
            📈 Forecasts are generated using 90-day rolling velocity + seasonality signals. Connect Supabase to enable ML-powered forecasting.
          </div>
          {MOCK_FORECAST.map(f => (
            <div key={f.sku} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: "20px 24px" }}>
              <div style={{ fontWeight: 600, color: "#131A48", fontSize: 14, marginBottom: 4 }}>{f.product_name}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>{f.sku} — 30-day weekly forecast</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {f.days.map((d, i) => (
                  <div key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>{d.date}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#131A48" }}>{d.predicted}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>units</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{d.lower}–{d.upper} range</div>
                    <div style={{ marginTop: 8, height: 4, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(d.predicted / 30) * 100}%`, background: "#FF5800", borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SUPPLIERS TAB ──────────────────────────────────────────────────── */}
      {tab === "suppliers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {MOCK_SUPPLIERS.map(s => (
            <div key={s.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <Truck size={16} color="#FF5800" />
                    <span style={{ fontWeight: 600, fontSize: 15, color: "#131A48" }}>{s.name}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#dcfce7", color: "#16a34a", fontWeight: 600 }}>Active</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{s.contact_email}</div>
                </div>
                <div style={{ display: "flex", gap: 24, textAlign: "right" }}>
                  <Stat label="Lead Time" value={`${s.lead_time_days} days`} />
                  <Stat label="Min Order" value={`${s.minimum_order_qty} units`} />
                  <Stat label="Payment" value={s.payment_terms} />
                  <Stat label="Rating" value={`⭐ ${s.rating}`} highlight />
                </div>
              </div>
            </div>
          ))}
          <button style={{
            padding: "12px 20px", fontSize: 13, fontWeight: 600,
            background: "#f8fafc", border: "2px dashed #e2e8f0",
            borderRadius: 10, cursor: "pointer", color: "#94a3b8",
            width: "100%"
          }}>+ Add Supplier</button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color = "#131A48", bg = "white" }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color?: string; bg?: string;
}) {
  return (
    <div style={{ background: bg === "white" ? "white" : bg, border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: "#94a3b8" }}>{icon}<span style={{ fontSize: 12 }}>{label}</span></div>
      <div style={{ fontSize: 24, fontWeight: 700, color, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#94a3b8" }}>{sub}</div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: highlight ? 700 : 500, color: highlight ? "#FF5800" : "#131A48" }}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: "#fef9c3", color: "#ca8a04", label: "Pending" },
    approved: { bg: "#dcfce7", color: "#16a34a", label: "Approved" },
    ordered:  { bg: "#dbeafe", color: "#2563eb", label: "Ordered" },
    rejected: { bg: "#fee2e2", color: "#dc2626", label: "Rejected" },
  };
  const s = map[status] || { bg: "#f1f5f9", color: "#64748b", label: status };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color, textTransform: "uppercase" }}>{s.label}</span>
  );
}

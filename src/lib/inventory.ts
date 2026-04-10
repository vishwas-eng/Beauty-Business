import { supabase } from './supabase';
import type { SessionUser } from '../types/domain';

export interface DashboardMetrics {
  total_revenue: number;
  total_units_sold: number;
  total_orders: number;
  avg_order_value: number;
  gross_margin_pct: number;
  inventory_turnover: number;
  top_category: string;
  top_brand: string;
}

export interface ReorderPoint {
  reorder_point: number;
  safety_stock: number;
  avg_daily_demand: number;
  demand_std_dev: number;
}

export interface DemandForecast {
  forecast_date: string;
  predicted_demand: number;
  confidence_lower: number;
  confidence_upper: number;
  confidence_score: number;
}

export interface InventorySnapshot {
  id: string;
  snapshot_date: string;
  sku: string;
  product_name: string;
  category: string;
  brand: string;
  channel: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  unit_cost: number;
  total_value: number;
  days_of_supply: number | null;
}

export interface ReorderRecommendation {
  id: string;
  sku: string;
  product_name: string;
  category: string;
  brand: string;
  supplier_name: string | null;
  current_stock: number;
  recommended_order_qty: number;
  reorder_point: number;
  safety_stock: number;
  lead_time_days: number | null;
  estimated_cost: number | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string | null;
  status: 'pending' | 'approved' | 'ordered' | 'rejected';
  generated_at: string;
}

export interface InventoryAlert {
  id: string;
  alert_type: 'low_stock' | 'overstock' | 'expiring' | 'dead_stock' | 'forecast_anomaly';
  severity: 'critical' | 'warning' | 'info';
  sku: string | null;
  product_name: string | null;
  message: string;
  recommended_action: string | null;
  acknowledged: boolean;
  resolved: boolean;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  lead_time_days: number | null;
  minimum_order_qty: number | null;
  payment_terms: string | null;
  rating: number | null;
  active: boolean;
}

/**
 * Get dashboard metrics for a workspace
 */
export async function getDashboardMetrics(
  workspaceId: string,
  daysBack: number = 30
): Promise<DashboardMetrics | null> {
  if (!supabase) {
    console.warn('Supabase not configured');
    return null;
  }

  const { data, error } = await supabase.rpc('get_dashboard_metrics', {
    p_workspace_id: workspaceId,
    p_days_back: daysBack
  });

  if (error) {
    console.error('Error fetching dashboard metrics:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Calculate reorder point for a SKU
 */
export async function calculateReorderPoint(
  workspaceId: string,
  sku: string,
  leadTimeDays: number = 14
): Promise<ReorderPoint | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('calculate_reorder_point', {
    p_workspace_id: workspaceId,
    p_sku: sku,
    p_lead_time_days: leadTimeDays
  });

  if (error) {
    console.error('Error calculating reorder point:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Generate demand forecast for a SKU
 */
export async function generateDemandForecast(
  workspaceId: string,
  sku: string,
  channel: string,
  forecastDays: number = 30
): Promise<DemandForecast[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('generate_demand_forecast', {
    p_workspace_id: workspaceId,
    p_sku: sku,
    p_channel: channel,
    p_forecast_days: forecastDays
  });

  if (error) {
    console.error('Error generating forecast:', error);
    return [];
  }

  return data || [];
}

/**
 * Get inventory snapshots
 */
export async function getInventorySnapshots(
  workspaceId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    sku?: string;
    category?: string;
    limit?: number;
  }
): Promise<InventorySnapshot[]> {
  if (!supabase) return [];

  let query = supabase
    .from('inventory_snapshots')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (options?.startDate) {
    query = query.gte('snapshot_date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('snapshot_date', options.endDate);
  }
  if (options?.sku) {
    query = query.eq('sku', options.sku);
  }
  if (options?.category) {
    query = query.eq('category', options.category);
  }

  query = query.order('snapshot_date', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching inventory snapshots:', error);
    return [];
  }

  return data || [];
}

/**
 * Get reorder recommendations
 */
export async function getReorderRecommendations(
  workspaceId: string,
  status?: 'pending' | 'approved' | 'ordered' | 'rejected'
): Promise<ReorderRecommendation[]> {
  if (!supabase) return [];

  let query = supabase
    .from('reorder_recommendations')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('generated_at', { ascending: false });

  if (error) {
    console.error('Error fetching reorder recommendations:', error);
    return [];
  }

  return data || [];
}

/**
 * Create or update reorder recommendation
 */
export async function upsertReorderRecommendation(
  workspaceId: string,
  recommendation: Partial<ReorderRecommendation>
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase.from('reorder_recommendations').upsert({
    workspace_id: workspaceId,
    ...recommendation
  });

  if (error) {
    console.error('Error upserting reorder recommendation:', error);
    return false;
  }

  return true;
}

/**
 * Get inventory alerts
 */
export async function getInventoryAlerts(
  workspaceId: string,
  options?: {
    unresolvedOnly?: boolean;
    unacknowledgedOnly?: boolean;
    alertType?: string;
  }
): Promise<InventoryAlert[]> {
  if (!supabase) return [];

  let query = supabase
    .from('inventory_alerts')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (options?.unresolvedOnly) {
    query = query.eq('resolved', false);
  }
  if (options?.unacknowledgedOnly) {
    query = query.eq('acknowledged', false);
  }
  if (options?.alertType) {
    query = query.eq('alert_type', options.alertType);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching inventory alerts:', error);
    return [];
  }

  return data || [];
}

/**
 * Acknowledge an inventory alert
 */
export async function acknowledgeAlert(
  alertId: string,
  userId: string
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('inventory_alerts')
    .update({
      acknowledged: true,
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString()
    })
    .eq('id', alertId);

  return !error;
}

/**
 * Get suppliers
 */
export async function getSuppliers(
  workspaceId: string,
  activeOnly: boolean = true
): Promise<Supplier[]> {
  if (!supabase) return [];

  let query = supabase
    .from('suppliers')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (activeOnly) {
    query = query.eq('active', true);
  }

  const { data, error } = await query.order('name');

  if (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }

  return data || [];
}

/**
 * Create or update supplier
 */
export async function upsertSupplier(
  workspaceId: string,
  supplier: Partial<Supplier>
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase.from('suppliers').upsert({
    workspace_id: workspaceId,
    ...supplier
  });

  return !error;
}

/**
 * Get inventory health summary
 */
export async function getInventoryHealthSummary(workspaceId: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('inventory_health_summary')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('Error fetching inventory health summary:', error);
    return null;
  }

  return data || [];
}

/**
 * Record inventory snapshot
 */
export async function recordInventorySnapshot(
  workspaceId: string,
  snapshot: Omit<InventorySnapshot, 'id' | 'created_at'>
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase.from('inventory_snapshots').upsert({
    workspace_id: workspaceId,
    ...snapshot
  });

  return !error;
}

/**
 * Create inventory alert
 */
export async function createInventoryAlert(
  workspaceId: string,
  alert: Omit<InventoryAlert, 'id' | 'created_at' | 'acknowledged' | 'resolved'>
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase.from('inventory_alerts').insert({
    workspace_id: workspaceId,
    ...alert
  });

  return !error;
}

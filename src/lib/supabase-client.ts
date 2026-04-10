/**
 * Supabase Client Library for Opptra Inventory Planning
 * Production-ready client with full inventory management capabilities
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pxttfmdfmucxnzosmfcm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ghxZwYgWkFBiI8n5mJh1ZQ_YB1C1dHF';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  workspace_id: string;
  role: 'admin' | 'viewer';
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface InventorySnapshot {
  id: string;
  workspace_id: string;
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
  days_of_supply?: number;
  created_at: string;
}

export interface DemandForecast {
  id: string;
  workspace_id: string;
  forecast_date: string;
  forecast_horizon_days: number;
  sku: string;
  product_name: string;
  category: string;
  brand: string;
  channel: string;
  predicted_demand: number;
  confidence_interval_lower?: number;
  confidence_interval_upper?: number;
  confidence_score?: number;
  model_version?: string;
  features_used?: Record<string, any>;
  created_at: string;
}

export interface ReorderRecommendation {
  id: string;
  workspace_id: string;
  generated_at: string;
  sku: string;
  product_name: string;
  category: string;
  brand: string;
  supplier_name?: string;
  current_stock: number;
  recommended_order_qty: number;
  reorder_point: number;
  safety_stock: number;
  lead_time_days?: number;
  estimated_cost?: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  status: 'pending' | 'approved' | 'ordered' | 'rejected';
  approved_by?: string;
  approved_at?: string;
}

export interface Supplier {
  id: string;
  workspace_id: string;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  lead_time_days?: number;
  minimum_order_qty?: number;
  payment_terms?: string;
  rating?: number;
  active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface InventoryAlert {
  id: string;
  workspace_id: string;
  alert_type: 'low_stock' | 'overstock' | 'expiring' | 'dead_stock' | 'forecast_anomaly';
  severity: 'critical' | 'warning' | 'info';
  sku?: string;
  product_name?: string;
  category?: string;
  brand?: string;
  channel?: string;
  current_value?: number;
  threshold_value?: number;
  message: string;
  recommended_action?: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

export interface SalesHistory {
  id: string;
  workspace_id: string;
  sale_date: string;
  sku: string;
  product_name: string;
  category: string;
  brand: string;
  channel: string;
  quantity_sold: number;
  revenue: number;
  unit_price: number;
  promotion_flag: boolean;
  day_of_week?: number;
  is_holiday: boolean;
  season?: string;
  created_at: string;
}

// Inventory Service
export class InventoryService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient = supabase) {
    this.client = client;
  }

  // Get current inventory snapshots
  async getInventorySnapshots(workspaceId: string, options?: {
    startDate?: string;
    endDate?: string;
    sku?: string;
    category?: string;
    limit?: number;
  }) {
    let query = this.client
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
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return await query.order('snapshot_date', { ascending: false });
  }

  // Create inventory snapshot
  async createSnapshot(snapshot: Omit<InventorySnapshot, 'id' | 'created_at'>) {
    return await this.client
      .from('inventory_snapshots')
      .insert(snapshot)
      .select()
      .single();
  }

  // Get demand forecasts
  async getDemandForecasts(workspaceId: string, options?: {
    sku?: string;
    horizonDays?: number;
    limit?: number;
  }) {
    let query = this.client
      .from('demand_forecasts')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (options?.sku) {
      query = query.eq('sku', options.sku);
    }
    if (options?.horizonDays) {
      query = query.eq('forecast_horizon_days', options.horizonDays);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return await query.order('forecast_date', { ascending: false });
  }

  // Create demand forecast
  async createForecast(forecast: Omit<DemandForecast, 'id' | 'created_at'>) {
    return await this.client
      .from('demand_forecasts')
      .insert(forecast)
      .select()
      .single();
  }

  // Get reorder recommendations
  async getReorderRecommendations(workspaceId: string, options?: {
    status?: string;
    priority?: string;
    sku?: string;
  }) {
    let query = this.client
      .from('reorder_recommendations')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (options?.status) {
      query = query.eq('status', options.status);
    }
    if (options?.priority) {
      query = query.eq('priority', options.priority);
    }
    if (options?.sku) {
      query = query.eq('sku', options.sku);
    }

    return await query.order('generated_at', { ascending: false });
  }

  // Approve reorder recommendation
  async approveReorder(recommendationId: string, approverId: string) {
    return await this.client
      .from('reorder_recommendations')
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString()
      })
      .eq('id', recommendationId)
      .select()
      .single();
  }

  // Get inventory alerts
  async getInventoryAlerts(workspaceId: string, options?: {
    unresolvedOnly?: boolean;
    alertType?: string;
    severity?: string;
  }) {
    let query = this.client
      .from('inventory_alerts')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (options?.unresolvedOnly) {
      query = query.eq('resolved', false);
    }
    if (options?.alertType) {
      query = query.eq('alert_type', options.alertType);
    }
    if (options?.severity) {
      query = query.eq('severity', options.severity);
    }

    return await query.order('created_at', { ascending: false });
  }

  // Acknowledge alert
  async acknowledgeAlert(alertId: string, userId: string) {
    return await this.client
      .from('inventory_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();
  }

  // Resolve alert
  async resolveAlert(alertId: string) {
    return await this.client
      .from('inventory_alerts')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();
  }

  // Get suppliers
  async getSuppliers(workspaceId: string, options?: {
    activeOnly?: boolean;
  }) {
    let query = this.client
      .from('suppliers')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (options?.activeOnly) {
      query = query.eq('active', true);
    }

    return await query.order('name');
  }

  // Create supplier
  async createSupplier(supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) {
    return await this.client
      .from('suppliers')
      .insert(supplier)
      .select()
      .single();
  }

  // Get sales history
  async getSalesHistory(workspaceId: string, options?: {
    startDate?: string;
    endDate?: string;
    sku?: string;
    limit?: number;
  }) {
    let query = this.client
      .from('sales_history')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (options?.startDate) {
      query = query.gte('sale_date', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('sale_date', options.endDate);
    }
    if (options?.sku) {
      query = query.eq('sku', options.sku);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return await query.order('sale_date', { ascending: false });
  }

  // Get inventory health summary
  async getInventoryHealthSummary(workspaceId: string) {
    return await this.client
      .rpc('inventory_health_summary', { p_workspace_id: workspaceId });
  }

  // Generate reorder recommendation using database function
  async generateReorderRecommendation(
    workspaceId: string,
    sku: string,
    currentStock: number,
    leadTimeDays: number = 14,
    safetyStockDays: number = 7
  ) {
    return await this.client.rpc('generate_reorder_recommendation', {
      p_workspace_id: workspaceId,
      p_sku: sku,
      p_current_stock: currentStock,
      p_lead_time_days: leadTimeDays,
      p_safety_stock_days: safetyStockDays
    });
  }
}

// Auth Service
export class AuthService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient = supabase) {
    this.client = client;
  }

  async signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    return { data, error };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    return { error };
  }

  async getCurrentUser() {
    const { data: { user } } = await this.client.auth.getUser();
    return user;
  }

  async getSession() {
    const { data: { session } } = await this.client.auth.getSession();
    return session;
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.client.auth.onAuthStateChange(callback);
  }
}

// Workspace Service
export class WorkspaceService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient = supabase) {
    this.client = client;
  }

  async createWorkspace(name: string, userId: string, fullName?: string) {
    return await this.client.rpc('create_workspace', {
      workspace_name: name,
      user_id: userId,
      user_full_name: fullName
    });
  }

  async getUserProfile(userId: string) {
    return await this.client
      .from('profiles')
      .select('*, workspaces(*)')
      .eq('id', userId)
      .single();
  }

  async getWorkspacesForUser(userId: string) {
    return await this.client
      .from('profiles')
      .select('workspace_id, role, workspaces(*)')
      .eq('id', userId);
  }
}

// Export instances
export const inventoryService = new InventoryService();
export const authService = new AuthService();
export const workspaceService = new WorkspaceService();

export default supabase;

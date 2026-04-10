-- Migration: Enable Inventory Planning System
-- Run this in your Supabase SQL Editor

-- Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Core tables (workspaces, profiles, data_sources, analytics_records, etc.)
-- See full schema in /supabase/schema.sql

-- INVENTORY PLANNING TABLES

-- Daily inventory snapshots
create table if not exists inventory_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  snapshot_date date not null,
  sku text not null,
  product_name text not null,
  category text not null,
  brand text not null,
  channel text not null,
  quantity_on_hand numeric not null default 0,
  quantity_reserved numeric not null default 0,
  quantity_available numeric not null default 0,
  unit_cost numeric not null default 0,
  total_value numeric not null default 0,
  days_of_supply numeric,
  created_at timestamptz not null default now(),
  unique (workspace_id, snapshot_date, sku, channel)
);

-- AI demand forecasts
create table if not exists demand_forecasts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  forecast_date date not null,
  forecast_horizon_days integer not null,
  sku text not null,
  product_name text not null,
  category text not null,
  brand text not null,
  channel text not null,
  predicted_demand numeric not null default 0,
  confidence_interval_lower numeric,
  confidence_interval_upper numeric,
  confidence_score numeric,
  model_version text,
  features_used jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, forecast_date, sku, channel)
);

-- Reorder recommendations
create table if not exists reorder_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  generated_at timestamptz not null default now(),
  sku text not null,
  product_name text not null,
  category text not null,
  brand text not null,
  supplier_name text,
  current_stock numeric not null default 0,
  recommended_order_qty numeric not null default 0,
  reorder_point numeric not null default 0,
  safety_stock numeric not null default 0,
  lead_time_days integer,
  estimated_cost numeric,
  priority text check (priority in ('critical', 'high', 'medium', 'low')),
  reason text,
  status text check (status in ('pending', 'approved', 'ordered', 'rejected')) default 'pending',
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  unique (workspace_id, sku)
);

-- Supplier management
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  contact_email text,
  contact_phone text,
  lead_time_days integer,
  minimum_order_qty numeric,
  payment_terms text,
  rating numeric,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- SKU-Supplier relationships
create table if not exists sku_suppliers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  sku text not null,
  supplier_id uuid not null references suppliers(id) on delete cascade,
  is_primary boolean not null default false,
  unit_cost numeric not null default 0,
  minimum_order_qty numeric,
  lead_time_days integer,
  created_at timestamptz not null default now(),
  unique (workspace_id, sku, supplier_id)
);

-- Inventory alerts
create table if not exists inventory_alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  alert_type text not null check (alert_type in ('low_stock', 'overstock', 'expiring', 'dead_stock', 'forecast_anomaly')),
  severity text check (severity in ('critical', 'warning', 'info')) not null,
  sku text,
  product_name text,
  category text,
  brand text,
  channel text,
  current_value numeric,
  threshold_value numeric,
  message text not null,
  recommended_action text,
  acknowledged boolean not null default false,
  acknowledged_by uuid references profiles(id),
  acknowledged_at timestamptz,
  resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Sales history for ML training
create table if not exists sales_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  sale_date date not null,
  sku text not null,
  product_name text not null,
  category text not null,
  brand text not null,
  channel text not null,
  quantity_sold numeric not null default 0,
  revenue numeric not null default 0,
  unit_price numeric not null default 0,
  promotion_flag boolean not null default false,
  day_of_week integer,
  is_holiday boolean not null default false,
  season text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_inventory_snapshots_workspace_date on inventory_snapshots(workspace_id, snapshot_date);
create index if not exists idx_demand_forecasts_workspace_date on demand_forecasts(workspace_id, forecast_date);
create index if not exists idx_reorder_recommendations_status on reorder_recommendations(status);
create index if not exists idx_inventory_alerts_workspace_resolved on inventory_alerts(workspace_id, resolved);
create index if not exists idx_sales_history_workspace_date on sales_history(workspace_id, sale_date);

-- Enable RLS
alter table inventory_snapshots enable row level security;
alter table demand_forecasts enable row level security;
alter table reorder_recommendations enable row level security;
alter table suppliers enable row level security;
alter table sku_suppliers enable row level security;
alter table inventory_alerts enable row level security;
alter table sales_history enable row level security;

-- RLS Policies
create policy "workspace members read inventory" on inventory_snapshots for select using (true);
create policy "workspace members read forecasts" on demand_forecasts for select using (true);
create policy "workspace members read recommendations" on reorder_recommendations for select using (true);
create policy "workspace members read alerts" on inventory_alerts for select using (true);
create policy "workspace members read suppliers" on suppliers for select using (true);
create policy "workspace members read sales" on sales_history for select using (true);

-- Enhanced schema with inventory planning tables
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Core workspace and auth tables
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  role text not null check (role in ('admin', 'viewer')),
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists data_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_type text not null check (source_type in ('google_sheet', 'excel_upload', 'notion')),
  sheet_id text,
  tab_name text,
  sheet_range text,
  notion_database_id text,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists raw_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_id uuid references data_sources(id) on delete set null,
  file_name text,
  imported_at timestamptz not null default now(),
  row_count integer not null default 0,
  payload jsonb not null default '[]'::jsonb
);

create table if not exists analytics_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_id uuid references data_sources(id) on delete set null,
  source_row_hash text not null,
  date date not null,
  sku text not null,
  product_name text not null,
  category text not null,
  brand text not null,
  channel text not null,
  sales_qty numeric not null default 0,
  sales_amount numeric not null default 0,
  returns_qty numeric not null default 0,
  inventory_on_hand numeric not null default 0,
  cost_amount numeric not null default 0,
  discount_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_row_hash)
);

create table if not exists sync_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_id uuid references data_sources(id) on delete set null,
  status text not null check (status in ('queued', 'running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  message text,
  error_details jsonb
);

create table if not exists ai_insights (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  insight_type text not null check (insight_type in ('dashboard', 'inventory', 'forecast', 'alert')),
  range_key text not null,
  generated_at timestamptz not null default now(),
  payload jsonb not null,
  expires_at timestamptz
);

create table if not exists automation_configs (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  schedule_minutes integer not null default 15,
  notion_database_id text,
  notion_config jsonb not null default '{}'::jsonb,
  claude_config jsonb not null default '{}'::jsonb,
  inventory_planning_enabled boolean not null default false,
  auto_reorder_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists notion_context_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  notion_page_id text not null,
  title text not null,
  category text not null,
  priority text not null,
  notes text not null,
  synced_at timestamptz not null default now(),
  unique (workspace_id, notion_page_id)
);

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  trigger_source text not null check (trigger_source in ('manual', 'scheduled')),
  status text not null check (status in ('queued', 'running', 'success', 'failed')),
  sheets_synced_at timestamptz,
  notion_synced_at timestamptz,
  claude_ran_at timestamptz,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============ INVENTORY PLANNING TABLES ============

-- Inventory snapshots (daily historical data)
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

-- Demand forecasts (AI-generated predictions)
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
  confidence_score numeric, -- 0-1 score
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
  rating numeric, -- 1-5 scale
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
  day_of_week integer, -- 0-6
  is_holiday boolean not null default false,
  season text,
  created_at timestamptz not null default now()
);

create or replace view analytics_snapshot as
select
  workspace_id,
  date,
  sum(sales_amount) as revenue,
  sum(sales_qty) as units_sold,
  sum(cost_amount) as cost_total,
  sum(discount_amount) as discount_total,
  sum(returns_qty) as returns_qty,
  sum(inventory_on_hand) as inventory_units,
  case
    when sum(sales_amount) = 0 then 0
    else round(((sum(sales_amount) - sum(cost_amount) - sum(discount_amount)) / sum(sales_amount)) * 100, 2)
  end as gross_margin_pct
from analytics_records
group by workspace_id, date;

-- Inventory health summary view
create or replace view inventory_health_summary as
select
  workspace_id,
  category,
  brand,
  count(distinct sku) as total_skus,
  sum(quantity_available) as total_available,
  sum(total_value) as total_value,
  avg(days_of_supply) as avg_days_supply,
  sum(case when days_of_supply < 7 then 1 else 0 end) as low_stock_skus,
  sum(case when days_of_supply > 90 then 1 else 0 end) as overstock_skus
from inventory_snapshots
group by workspace_id, category, brand;

-- Active alerts summary view
create or replace view active_alerts_summary as
select
  workspace_id,
  alert_type,
  severity,
  count(*) as alert_count,
  array_agg(distinct sku) as affected_skus
from inventory_alerts
where not resolved and not acknowledged
group by workspace_id, alert_type, severity;

-- ============ BRANDS TABLE ============

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  brand_id text unique not null,
  brand_name text not null,
  category text,
  market text,
  pipeline_stage text check (pipeline_stage in ('Lead', 'MQL', 'SQL', 'Commercials', 'Signed', 'Live', 'Hold', 'Reject')),
  owner text,
  confirmed_revenue_usd numeric default 0,
  pipeline_potential_usd numeric default 0,
  deal_close_date date,
  notes text,
  google_drive_folder text,
  last_updated timestamptz default now(),
  last_synced timestamptz,
  workspace_id uuid not null references workspaces(id) on delete cascade default '00000000-0000-0000-0000-000000000000'::uuid
);

-- Indexes for brands table
create index if not exists idx_brands_workspace_id on brands(workspace_id);
create index if not exists idx_brands_pipeline_stage on brands(pipeline_stage);
create index if not exists idx_brands_category on brands(category);
create index if not exists idx_brands_market on brands(market);
create index if not exists idx_brands_owner on brands(owner);
create index if not exists idx_brands_brand_id on brands(brand_id);

-- Enable RLS
alter table brands enable row level security;

-- RLS Policies for brands
create policy "workspace members read brands"
  on brands for select
  using (is_workspace_member(workspace_id));

create policy "admins manage brands"
  on brands for all
  using (is_workspace_admin(workspace_id))
  with check (is_workspace_admin(workspace_id));

-- Trigger to update last_updated
create trigger update_brands_last_updated before update on brands
  for each row execute function update_updated_at_column();

-- ============ INDEXES ============

create index if not exists idx_analytics_records_workspace_date on analytics_records(workspace_id, date);
create index if not exists idx_analytics_records_sku on analytics_records(sku);
create index if not exists idx_inventory_snapshots_workspace_date on inventory_snapshots(workspace_id, snapshot_date);
create index if not exists idx_inventory_snapshots_sku on inventory_snapshots(sku);
create index if not exists idx_demand_forecasts_workspace_date on demand_forecasts(workspace_id, forecast_date);
create index if not exists idx_reorder_recommendations_status on reorder_recommendations(status);
create index if not exists idx_inventory_alerts_workspace_resolved on inventory_alerts(workspace_id, resolved);
create index if not exists idx_sales_history_workspace_date on sales_history(workspace_id, sale_date);
create index if not exists idx_profiles_workspace on profiles(workspace_id);

-- ============ TRIGGERS ============

-- Updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger update_workspaces_updated_at before update on workspaces
  for each row execute function update_updated_at_column();

create trigger update_profiles_updated_at before update on profiles
  for each row execute function update_updated_at_column();

create trigger update_data_sources_updated_at before update on data_sources
  for each row execute function update_updated_at_column();

create trigger update_analytics_records_updated_at before update on analytics_records
  for each row execute function update_updated_at_column();

create trigger update_automation_configs_updated_at before update on automation_configs
  for each row execute function update_updated_at_column();

create trigger update_suppliers_updated_at before update on suppliers
  for each row execute function update_updated_at_column();

alter table profiles enable row level security;
alter table data_sources enable row level security;
alter table raw_imports enable row level security;
alter table analytics_records enable row level security;
alter table sync_jobs enable row level security;
alter table ai_insights enable row level security;
alter table automation_configs enable row level security;
alter table notion_context_items enable row level security;
alter table automation_runs enable row level security;

create policy "workspace members read profiles"
on profiles for select
using (
  workspace_id in (
    select workspace_id from profiles where id = auth.uid()
  )
);

create policy "workspace members read data_sources"
on data_sources for select
using (
  workspace_id in (
    select workspace_id from profiles where id = auth.uid()
  )
);

create policy "admins manage data_sources"
on data_sources for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.workspace_id = data_sources.workspace_id
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.workspace_id = data_sources.workspace_id
      and profiles.role = 'admin'
  )
);

create policy "workspace members read analytics"
on analytics_records for select
using (
  workspace_id in (
    select workspace_id from profiles where id = auth.uid()
  )
);

create policy "admins manage analytics"
on analytics_records for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.workspace_id = analytics_records.workspace_id
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.workspace_id = analytics_records.workspace_id
      and profiles.role = 'admin'
  )
);

create policy "workspace members read automation_configs"
on automation_configs for select
using (
  workspace_id in (
    select workspace_id from profiles where id = auth.uid()
  )
);

create policy "admins manage automation_configs"
on automation_configs for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.workspace_id = automation_configs.workspace_id
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.workspace_id = automation_configs.workspace_id
      and profiles.role = 'admin'
  )
);

create policy "workspace members read notion_context_items"
on notion_context_items for select
using (
  workspace_id in (
    select workspace_id from profiles where id = auth.uid()
  )
);

create policy "admins manage notion_context_items"
on notion_context_items for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.workspace_id = notion_context_items.workspace_id
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.workspace_id = notion_context_items.workspace_id
      and profiles.role = 'admin'
  )
);

create policy "workspace members read automation_runs"
on automation_runs for select
using (
  workspace_id in (
    select workspace_id from profiles where id = auth.uid()
  )
);

create policy "admins manage automation_runs"
on automation_runs for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.workspace_id = automation_runs.workspace_id
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.workspace_id = automation_runs.workspace_id
      and profiles.role = 'admin'
  )
);

-- Enable RLS on new inventory planning tables
alter table inventory_snapshots enable row level security;
alter table demand_forecasts enable row level security;
alter table reorder_recommendations enable row level security;
alter table suppliers enable row level security;
alter table sku_suppliers enable row level security;
alter table inventory_alerts enable row level security;
alter table sales_history enable row level security;

-- Helper functions for RLS
create or replace function is_workspace_member(target_workspace_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.workspace_id = target_workspace_id
  );
end;
$$ language plpgsql security definer;

create or replace function is_workspace_admin(target_workspace_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.workspace_id = target_workspace_id
      and profiles.role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Inventory snapshots policies
create policy "workspace members read inventory"
  on inventory_snapshots for select
  using (is_workspace_member(workspace_id));

create policy "admins manage inventory"
  on inventory_snapshots for all
  using (is_workspace_admin(workspace_id))
  with check (is_workspace_admin(workspace_id));

-- Demand forecasts policies
create policy "workspace members read forecasts"
  on demand_forecasts for select
  using (is_workspace_member(workspace_id));

create policy "admins manage forecasts"
  on demand_forecasts for all
  using (is_workspace_admin(workspace_id))
  with check (is_workspace_admin(workspace_id));

-- Reorder recommendations policies
create policy "workspace members read reorder"
  on reorder_recommendations for select
  using (is_workspace_member(workspace_id));

create policy "workspace members update reorder status"
  on reorder_recommendations for update
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

create policy "admins create reorder"
  on reorder_recommendations for insert
  with check (is_workspace_admin(workspace_id));

-- Suppliers policies
create policy "workspace members read suppliers"
  on suppliers for select
  using (is_workspace_member(workspace_id));

create policy "admins manage suppliers"
  on suppliers for all
  using (is_workspace_admin(workspace_id))
  with check (is_workspace_admin(workspace_id));

-- SKU suppliers policies
create policy "workspace members read sku_suppliers"
  on sku_suppliers for select
  using (is_workspace_member(workspace_id));

create policy "admins manage sku_suppliers"
  on sku_suppliers for all
  using (is_workspace_admin(workspace_id))
  with check (is_workspace_admin(workspace_id));

-- Inventory alerts policies
create policy "workspace members read alerts"
  on inventory_alerts for select
  using (is_workspace_member(workspace_id));

create policy "workspace members acknowledge alerts"
  on inventory_alerts for update
  using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

create policy "admins create alerts"
  on inventory_alerts for insert
  with check (is_workspace_admin(workspace_id));

-- Sales history policies
create policy "workspace members read sales_history"
  on sales_history for select
  using (is_workspace_member(workspace_id));

create policy "admins manage sales_history"
  on sales_history for all
  using (is_workspace_admin(workspace_id))
  with check (is_workspace_admin(workspace_id));

-- ============ DATABASE FUNCTIONS ============

-- Function to get dashboard metrics
create or replace function get_dashboard_metrics(p_workspace_id uuid, p_days_back integer default 30)
returns table (
  total_revenue numeric,
  total_units_sold numeric,
  total_orders numeric,
  avg_order_value numeric,
  gross_margin_pct numeric,
  inventory_turnover numeric,
  top_category text,
  top_brand text
) as $$
begin
  return query
  select
    sum(ar.sales_amount) as total_revenue,
    sum(ar.sales_qty) as total_units_sold,
    count(distinct ar.date) as total_orders,
    case 
      when count(distinct ar.date) > 0 then sum(ar.sales_amount) / count(distinct ar.date)
      else 0
    end as avg_order_value,
    case
      when sum(ar.sales_amount) = 0 then 0
      else ((sum(ar.sales_amount) - sum(ar.cost_amount) - sum(ar.discount_amount)) / sum(ar.sales_amount)) * 100
    end as gross_margin_pct,
    case
      when avg(inv.total_value) > 0 then sum(ar.cost_amount) / avg(inv.total_value)
      else 0
    end as inventory_turnover,
    (select category from analytics_records ar2 where ar2.workspace_id = p_workspace_id group by category order by sum(ar2.sales_amount) desc limit 1) as top_category,
    (select brand from analytics_records ar3 where ar3.workspace_id = p_workspace_id group by brand order by sum(ar3.sales_amount) desc limit 1) as top_brand
  from analytics_records ar
  left join lateral (
    select sum(total_value) as total_value
    from inventory_snapshots inv
    where inv.workspace_id = ar.workspace_id
      and inv.sku = ar.sku
  ) inv on true
  where ar.workspace_id = p_workspace_id
    and ar.date >= (current_date - p_days_back);
end;
$$ language plpgsql security definer;

-- Function to calculate reorder point
create or replace function calculate_reorder_point(
  p_workspace_id uuid,
  p_sku text,
  p_lead_time_days integer default 14,
  p_service_level numeric default 0.95
)
returns table (
  reorder_point numeric,
  safety_stock numeric,
  avg_daily_demand numeric,
  demand_std_dev numeric
) as $$
begin
  return query
  with demand_stats as (
    select
      avg(daily_demand) as avg_demand,
      stddev(daily_demand) as std_dev
    from (
      select date, sum(quantity_sold) as daily_demand
      from sales_history
      where workspace_id = p_workspace_id
        and sku = p_sku
        and sale_date >= (current_date - 90)
      group by date
    ) daily
  )
  select
    (avg_demand * p_lead_time_days) + (coalesce(std_dev, 0) * 1.65 * sqrt(p_lead_time_days)) as reorder_point,
    coalesce(std_dev, 0) * 1.65 * sqrt(p_lead_time_days) as safety_stock,
    avg_demand as avg_daily_demand,
    coalesce(std_dev, 0) as demand_std_dev
  from demand_stats;
end;
$$ language plpgsql security definer;

-- Function to generate demand forecast
create or replace function generate_demand_forecast(
  p_workspace_id uuid,
  p_sku text,
  p_channel text,
  p_forecast_days integer default 30
)
returns table (
  forecast_date date,
  predicted_demand numeric,
  confidence_lower numeric,
  confidence_upper numeric,
  confidence_score numeric
) as $$
begin
  return query
  with historical_avg as (
    select
      avg(quantity_sold) as avg_demand,
      stddev(quantity_sold) as std_dev,
      count(*) as sample_size
    from sales_history
    where workspace_id = p_workspace_id
      and sku = p_sku
      and channel = p_channel
      and sale_date >= (current_date - 90)
  ),
  trend as (
    select
      (max(quantity_sold) - min(quantity_sold)) / nullif(count(*), 0) as daily_trend
    from sales_history
    where workspace_id = p_workspace_id
      and sku = p_sku
      and channel = p_channel
      and sale_date >= (current_date - 30)
    group by sku, channel
  )
  select
    (current_date + (n || ' days')::interval)::date as forecast_date,
    greatest(0, (avg_demand + (n * coalesce(daily_trend, 0)))) as predicted_demand,
    greatest(0, (avg_demand + (n * coalesce(daily_trend, 0))) - (1.96 * std_dev)) as confidence_lower,
    greatest(0, (avg_demand + (n * coalesce(daily_trend, 0))) + (1.96 * std_dev)) as confidence_upper,
    case 
      when sample_size >= 30 then 0.95
      when sample_size >= 14 then 0.85
      when sample_size >= 7 then 0.70
      else 0.50
    end as confidence_score
  from historical_avg
  cross join trend
  cross join generate_series(1, p_forecast_days) n;
end;
$$ language plpgsql security definer;

-- ============ INITIAL DATA TRIGGERS ============

-- Create default workspace on user signup
create or replace function create_default_workspace()
returns trigger as $$
declare
  default_workspace_id uuid;
begin
  -- Create default workspace
  insert into workspaces (name)
  values (concat('Workspace_', substring(new.email from 1 for 10)))
  returning id into default_workspace_id;
  
  -- Create profile
  insert into profiles (id, workspace_id, role, full_name)
  values (new.id, default_workspace_id, 'admin', new.raw_user_meta_data->>'full_name');
  
  -- Create default automation config
  insert into automation_configs (workspace_id)
  values (default_workspace_id);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create workspace on user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function create_default_workspace();

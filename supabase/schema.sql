create extension if not exists "pgcrypto";

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  role text not null check (role in ('admin', 'viewer')),
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists data_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_type text not null check (source_type in ('google_sheet', 'excel_upload')),
  sheet_id text,
  tab_name text,
  sheet_range text,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
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
  unique (workspace_id, source_row_hash)
);

create table if not exists sync_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_id uuid references data_sources(id) on delete set null,
  status text not null check (status in ('queued', 'running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  message text
);

create table if not exists ai_insights (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  range_key text not null,
  generated_at timestamptz not null default now(),
  payload jsonb not null
);

create table if not exists automation_configs (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  schedule_minutes integer not null default 15,
  notion_database_id text,
  notion_config jsonb not null default '{}'::jsonb,
  claude_config jsonb not null default '{}'::jsonb,
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

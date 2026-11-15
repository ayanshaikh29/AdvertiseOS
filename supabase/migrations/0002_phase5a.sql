-- Phase 5A: new tables + org-isolation RLS policies.
-- NOTE: policies reference auth.jwt() app_metadata org_id; service_role bypasses RLS.
-- Not yet verified against a live project (no Supabase credentials in this env).

create table if not exists prompt_versions (
  id text primary key,
  agent text not null,
  version int not null,
  system text not null,
  created_by text,
  created_at timestamptz default now(),
  unique (agent, version)
);

create table if not exists hr_proposals (
  id text primary key,
  agent text not null,
  change text not null,
  reason text not null,
  status text default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now()
);

create table if not exists reports (
  id text primary key,
  payload jsonb default '{}',
  totals jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists leads (
  id text primary key,
  name text default '',
  contact text default '',
  source text default '',
  utm jsonb default '{}',
  status text default 'new' check (status in ('new','contacted','won')),
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists integrations (
  id text primary key,
  provider text not null,
  status text default 'disconnected' check (status in ('connected','needs_attention','disconnected')),
  account_label text default '',
  scopes text[] default '{}',
  encrypted_tokens text default '',
  last_health_at timestamptz,
  last_error text default '',
  created_at timestamptz default now()
);

create table if not exists integration_events (
  id text primary key,
  provider text not null,
  kind text not null,
  payload jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists automations (
  id text primary key,
  trigger text not null,
  conditions jsonb default '{}',
  actions jsonb default '{}',
  enabled boolean default true,
  created_at timestamptz default now()
);

create table if not exists automation_runs (
  id text primary key,
  automation_id text references automations(id) on delete cascade,
  result jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists notifications (
  id text primary key,
  kind text not null,
  title text not null,
  body text default '',
  link text default '',
  read boolean default false,
  created_at timestamptz default now()
);

alter table prompt_versions enable row level security;
alter table hr_proposals enable row level security;
alter table reports enable row level security;
alter table leads enable row level security;
alter table integrations enable row level security;
alter table integration_events enable row level security;
alter table automations enable row level security;
alter table automation_runs enable row level security;
alter table notifications enable row level security;

-- Org isolation: members can read/write org-scoped rows of their org.
create or replace function is_org_member(check_org text) returns boolean
  language sql stable as
  $$ select exists (select 1 from members m
      where m.org_id = check_org
        and m.user_id = coalesce(auth.jwt()->>'sub', '')) $$;

drop policy if exists "org members read brands" on brands;
create policy "org members read brands" on brands for select using (is_org_member(org_id));
drop policy if exists "org admins write brands" on brands;
create policy "org admins write brands" on brands for all using (
  is_org_member(org_id) and exists (select 1 from members m
    where m.org_id = brands.org_id and m.user_id = coalesce(auth.jwt()->>'sub', '')
      and m.role in ('owner','admin')));

drop policy if exists "org members read memory" on brand_memory;
create policy "org members read memory" on brand_memory for select using (
  exists (select 1 from brands b where b.id = brand_memory.brand_id and is_org_member(b.org_id)));

drop policy if exists "org members all briefs" on briefs;
create policy "org members all briefs" on briefs for all using (
  exists (select 1 from brands b where b.id = briefs.brand_id and is_org_member(b.org_id)));
drop policy if exists "org members all campaigns" on campaigns;
create policy "org members all campaigns" on campaigns for all using (true);
drop policy if exists "org members all items" on content_items;
create policy "org members all items" on content_items for all using (true);
drop policy if exists "org members all assets" on assets;
create policy "org members all assets" on assets for all using (true);
drop policy if exists "org members all metrics" on metrics;
create policy "org members all metrics" on metrics for all using (true);
drop policy if exists "org members all runs" on agent_runs;
create policy "org members all runs" on agent_runs for all using (true);
drop policy if exists "org members all audit" on audit_log;
create policy "org members all audit" on audit_log for all using (true);
drop policy if exists "org members all prompts" on prompt_versions;
create policy "org members all prompts" on prompt_versions for select using (true);
drop policy if exists "org admins write prompts" on prompt_versions;
create policy "org admins write prompts" on prompt_versions for insert with check (
  exists (select 1 from members m where m.user_id = coalesce(auth.jwt()->>'sub', '')
    and m.role in ('owner','admin')));
drop policy if exists "org members all proposals" on hr_proposals;
create policy "org members all proposals" on hr_proposals for all using (true);
drop policy if exists "org members all reports" on reports;
create policy "org members all reports" on reports for all using (true);
drop policy if exists "org members all leads" on leads;
create policy "org members all leads" on leads for all using (true);
drop policy if exists "org members all integrations" on integrations;
create policy "org members all integrations" on integrations for all using (true);
drop policy if exists "org members all automation" on automations;
create policy "org members all automation" on automations for all using (true);
drop policy if exists "org members all notifications" on notifications;
create policy "org members all notifications" on notifications for select using (true);

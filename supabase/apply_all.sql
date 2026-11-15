-- AdvertiseOS: full schema in one paste (0001 + 0002 + 0003 + seed).
-- Run once in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Idempotent: create table/index if not exists; policies use drop-if-exists then create
-- (Postgres has NO "create policy if not exists"); seeds use on conflict do nothing.
-- Safe to re-run any number of times.

-- ======== supabase\migrations\0001_init.sql ========
-- AdvertiseOS schema v2. Text IDs (app-generated, e.g. cmp-..., item-...) so the
-- repository layer maps 1:1 without translation. Org isolation via RLS (see 0002).

create table if not exists orgs (
  id text primary key,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists members (
  user_id text not null,
  org_id text not null references orgs(id) on delete cascade,
  role text not null check (role in ('owner','admin','approver','viewer')),
  created_at timestamptz default now(),
  primary key (user_id, org_id)
);

create table if not exists brands (
  id text primary key,
  org_id text not null references orgs(id) on delete cascade,
  name text not null,
  logo_url text,
  colors jsonb default '{}',
  fonts jsonb default '{}',
  tone text default '',
  languages text[] default '{English}',
  audience text default '',
  products jsonb default '[]',
  usp text default '',
  competitors jsonb default '[]',
  dos text[] default '{}',
  donts text[] default '{}',
  compliance_notes text default '',
  sample boolean default false,
  created_at timestamptz default now()
);

create table if not exists brand_memory (
  id text primary key,
  brand_id text not null references brands(id) on delete cascade,
  kind text not null check (kind in ('approved_example','rejected_example','rule','insight')),
  content text not null,
  source_item_id text,
  created_at timestamptz default now()
);

create table if not exists briefs (
  id text primary key,
  brand_id text not null references brands(id) on delete cascade,
  month text not null,
  goal text not null,
  budget numeric,
  offers text default '',
  festivals text default '',
  notes text default '',
  status text default 'new',
  created_at timestamptz default now()
);

create table if not exists campaigns (
  id text primary key,
  brief_id text references briefs(id) on delete cascade,
  status text default 'queued',
  plan jsonb default '{}',
  cost_usd numeric default 0,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  agent text not null,
  depends_on text[] default '{}',
  status text default 'queued',
  input jsonb default '{}',
  output jsonb default '{}',
  revision_count int default 0
);

create table if not exists content_items (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  type text not null,
  platform text not null,
  scheduled_for date,
  copy jsonb default '{}',
  design_id text,
  video_plan jsonb,
  ceo_score int,
  status text default 'draft' check (status in ('draft','ceo_review','pending_human','approved','rejected','scheduled','published')),
  rejection_reason text,
  created_at timestamptz default now()
);

create table if not exists assets (
  id text primary key,
  brand_id text references brands(id) on delete cascade,
  type text not null,
  url text not null,
  meta jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists metrics (
  id text primary key,
  content_item_id text references content_items(id) on delete set null,
  platform text not null,
  date date not null,
  impressions int default 0,
  reach int default 0,
  clicks int default 0,
  leads int default 0,
  spend numeric default 0,
  revenue numeric default 0,
  source text default 'manual'
);

create table if not exists agent_runs (
  id text primary key,
  task_id text references tasks(id) on delete set null,
  agent text not null,
  model text,
  input_tokens int default 0,
  output_tokens int default 0,
  cost_usd numeric default 0,
  latency_ms int default 0,
  status text default 'ok',
  error text,
  created_at timestamptz default now()
);

create table if not exists agent_scores (
  id text primary key,
  agent text not null,
  week text not null,
  avg_ceo_score numeric,
  approval_rate numeric,
  avg_revisions numeric,
  total_cost numeric
);

create table if not exists audit_log (
  id text primary key,
  org_id text references orgs(id) on delete cascade,
  user_id text,
  action text not null,
  entity text not null,
  entity_id text not null,
  diff jsonb default '{}',
  created_at timestamptz default now()
);

alter table orgs enable row level security;
alter table members enable row level security;
alter table brands enable row level security;
alter table brand_memory enable row level security;
alter table briefs enable row level security;
alter table campaigns enable row level security;
alter table tasks enable row level security;
alter table content_items enable row level security;
alter table assets enable row level security;
alter table metrics enable row level security;
alter table agent_runs enable row level security;
alter table agent_scores enable row level security;
alter table audit_log enable row level security;


-- ======== supabase\migrations\0002_phase5a.sql ========
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


-- ======== supabase\migrations\0003_phase6.sql ========
-- Phase 6: settings, connector accounts, sync jobs.
-- RLS is enabled on every table. Policies follow the 0002 pattern (org membership is
-- enforced app-side via the service-role client; policy hardening with real JWT org
-- claims is tracked in docs/DECISIONS.md).

create table if not exists settings (
  id text primary key,
  org_id text references orgs(id) on delete cascade,
  values jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists channel_accounts (
  id text primary key,
  org_id text not null references orgs(id) on delete cascade,
  provider text not null,
  label text not null,
  status text not null default 'unconfigured'
    check (status in ('connected', 'needs_attention', 'disconnected', 'unconfigured', 'sample')),
  scopes text[] not null default '{}',
  is_sample boolean not null default false,
  encrypted_tokens text,
  last_test_at timestamptz,
  last_test_ok boolean,
  last_test_message text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists channel_accounts_org_idx on channel_accounts (org_id, provider);

create table if not exists sync_jobs (
  id text primary key,
  org_id text not null references orgs(id) on delete cascade,
  channel_account_id text references channel_accounts(id) on delete cascade,
  kind text not null,
  status text not null check (status in ('running', 'ok', 'failed')),
  rows_synced integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists sync_jobs_org_idx on sync_jobs (org_id, started_at desc);

alter table settings enable row level security;
alter table channel_accounts enable row level security;
alter table sync_jobs enable row level security;

drop policy if exists "service role full settings" on settings;
create policy "service role full settings" on settings for all using (true) with check (true);
drop policy if exists "service role full channel_accounts" on channel_accounts;
create policy "service role full channel_accounts" on channel_accounts for all using (true) with check (true);
drop policy if exists "service role full sync_jobs" on sync_jobs;
create policy "service role full sync_jobs" on sync_jobs for all using (true) with check (true);


-- ======== supabase\seed.sql ========
-- Seed: clearly labeled SAMPLE brand + org for demo. Apply after 0001_init.sql.
-- psql $DATABASE_URL -f supabase/seed.sql

insert into orgs (id, name) values ('00000000-0000-0000-0000-000000000001', 'Digital Advertise (Sample)')
on conflict (id) do nothing;

insert into brands (id, org_id, name, tone, languages, audience, products, usp, dos, donts, compliance_notes)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Sample Brand (Sample data)',
  'confident, helpful, premium',
  '{English,Hinglish}',
  'Small business owners in India looking for digital marketing help',
  '["SEO", "social media", "performance ads", "web development"]',
  'Senior team, transparent reporting',
  '{Use clear CTAs,Mention city/service explicitly}',
  '{No fake awards,No invented statistics,No guaranteed results}',
  'Never invent client names, awards, testimonials, or numbers.'
)
on conflict (id) do nothing;



-- ========== 0004 catalog (Phase 6B) ==========

-- Phase 6B: structured catalog (products & services) + connector sync dedupe key.
-- Append-safe (idempotent); also included in supabase/apply_all.sql.

create table if not exists catalog_items (
  id text primary key,
  org_id text not null references orgs(id) on delete cascade,
  brand_id text not null references brands(id) on delete cascade,
  kind text not null default 'product' check (kind in ('product','service')),
  name text not null,
  description text not null default '',
  price numeric,
  currency text not null default 'INR',
  tags text[] not null default '{}',
  features text[] not null default '{}',
  status text not null default 'active' check (status in ('active','draft','archived')),
  source text not null default 'manual' check (source in ('manual','connector')),
  external_id text,
  provider text,
  sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_items_brand_idx on catalog_items (brand_id);
create index if not exists catalog_items_external_idx on catalog_items (external_id) where external_id is not null;

alter table catalog_items enable row level security;
drop policy if exists "catalog_items all" on catalog_items;
create policy "catalog_items all" on catalog_items for all using (true) with check (true);


-- ========== 0005 trends (Phase 6C) ==========

-- Phase 6C: Trend Radar (real Google News RSS headlines, source-linked).
-- Append-safe (idempotent); also included in supabase/apply_all.sql.

create table if not exists trends (
  id text primary key,
  org_id text not null references orgs(id) on delete cascade,
  title text not null,
  url text not null,
  source text not null default '',
  published_at text not null default '',
  query text not null default '',
  fetched_at timestamptz not null default now()
);

create index if not exists trends_fetched_idx on trends (fetched_at desc);

alter table trends enable row level security;
drop policy if exists "trends all" on trends;
create policy "trends all" on trends for all using (true) with check (true);


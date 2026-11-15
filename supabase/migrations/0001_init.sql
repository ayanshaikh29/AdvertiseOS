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

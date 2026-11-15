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

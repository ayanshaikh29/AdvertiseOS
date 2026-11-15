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

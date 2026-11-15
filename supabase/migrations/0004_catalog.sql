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

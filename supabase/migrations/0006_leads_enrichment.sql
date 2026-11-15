-- Phase 6: enrich the existing leads table (additive only).
alter table leads add column if not exists brand_id text default '';
alter table leads add column if not exists company text default '';
alter table leads add column if not exists channel text default 'other';
alter table leads add column if not exists value numeric;
alter table leads add column if not exists follow_up_at date;
alter table leads add column if not exists updated_at timestamptz default now();

-- Widen status lifecycle: new | contacted | qualified | won | lost
alter table leads drop constraint if exists leads_status_check;
alter table leads add constraint leads_status_check check (status in ('new','contacted','qualified','won','lost'));

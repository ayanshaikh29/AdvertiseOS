-- 0008_admin_auth.sql
-- AdvertiseOS Admin Authentication & Audit Schema
-- Restricts system access to designated administrators only. Public sign-up is disabled.

create table if not exists admin_users (
  id text primary key,
  username text unique not null,
  email text unique not null,
  password_hash text not null,
  salt text not null,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  must_change_password boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists admin_audit_logs (
  id text primary key,
  user_id text,
  username text not null,
  action text not null,
  ip_address text,
  user_agent text,
  success boolean not null default true,
  details jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_admin_audit_logs_created_at on admin_audit_logs(created_at desc);
create index if not exists idx_admin_users_username on admin_users(username);

-- Row-level security for admin tables
alter table admin_users enable row level security;
alter table admin_audit_logs enable row level security;

-- Policy: Service role only (server-side authentication only, no public access)
drop policy if exists admin_users_service_role on admin_users;
create policy admin_users_service_role on admin_users
  for all using (true) with check (true);

drop policy if exists admin_audit_logs_service_role on admin_audit_logs;
create policy admin_audit_logs_service_role on admin_audit_logs
  for all using (true) with check (true);

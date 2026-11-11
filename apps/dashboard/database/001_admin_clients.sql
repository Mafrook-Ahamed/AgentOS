-- Run this in the SQL editor of the dedicated AgentOS Supabase project.
-- Admin membership is driven by the server-side AGENTOS_ADMIN_EMAILS allowlist.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  company text not null check (length(trim(company)) between 1 and 160),
  email text not null,
  phone text,
  notes text,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clients_created_by_created_at_idx on public.clients(created_by, created_at desc);
alter table public.clients enable row level security;
revoke all on public.clients from anon, authenticated;
grant select, insert, update, delete on public.clients to authenticated;
drop policy if exists "AgentOS admins manage clients" on public.clients;
create policy "AgentOS admins manage clients"
on public.clients for all to authenticated
using (
  lower(coalesce((select auth.jwt()->>'email'),'')) = any (
    string_to_array(lower(current_setting('app.settings.agentos_admin_emails', true)), ',')
  )
)
with check (
  lower(coalesce((select auth.jwt()->>'email'),'')) = any (
    string_to_array(lower(current_setting('app.settings.agentos_admin_emails', true)), ',')
  )
);
-- Set app.settings.agentos_admin_emails as a database-level setting to the same
-- comma-separated administrator allowlist used by the dashboard. Until configured,
-- the RLS policy denies access. Use ALTER DATABASE postgres SET app.settings.agentos_admin_emails = 'admin@example.com';

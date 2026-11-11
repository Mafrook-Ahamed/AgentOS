-- AgentOS admin identity and client CRM.
create table if not exists public.agentos_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
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
alter table public.agentos_admins enable row level security;
alter table public.clients enable row level security;
revoke all on public.agentos_admins from anon, authenticated;
revoke all on public.clients from anon, authenticated;
grant select on public.agentos_admins to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
create or replace function public.is_agentos_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.agentos_admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.is_agentos_admin() from public, anon, authenticated;
grant execute on function public.is_agentos_admin() to authenticated;
drop policy if exists "Admins can read own admin membership" on public.agentos_admins;
create policy "Admins can read own admin membership" on public.agentos_admins for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "AgentOS admins manage clients" on public.clients;
create policy "AgentOS admins manage clients" on public.clients for all to authenticated using ((select public.is_agentos_admin())) with check ((select public.is_agentos_admin()));

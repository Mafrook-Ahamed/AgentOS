-- Billing plans, subscriptions, invoices and Razorpay payment-link metadata.
-- Safe to apply after the core client and admin migrations.
create table if not exists public.service_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 80),
  description text not null default '',
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  billing_interval text not null default 'monthly' check (billing_interval in ('monthly','yearly','one_time')),
  monthly_request_limit integer not null default 1000 check (monthly_request_limit between 1 and 1000000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  plan_id uuid references public.service_plans(id) on delete set null,
  status text not null default 'trial' check (status in ('trial','active','past_due','cancelled','expired')),
  started_at date not null default current_date,
  current_period_start date not null default current_date,
  current_period_end date,
  auto_renew boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  subscription_id uuid references public.client_subscriptions(id) on delete set null,
  invoice_number text not null unique,
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (status in ('draft','issued','paid','overdue','void')),
  issued_at date not null default current_date,
  due_at date,
  paid_at timestamptz,
  description text not null default '',
  payment_reference text,
  created_at timestamptz not null default now()
);

alter table public.billing_invoices
  add column if not exists razorpay_payment_link_id text,
  add column if not exists razorpay_payment_link_url text,
  add column if not exists razorpay_payment_id text,
  add column if not exists payment_provider text;

create unique index if not exists billing_invoices_razorpay_payment_link_id_key
  on public.billing_invoices(razorpay_payment_link_id)
  where razorpay_payment_link_id is not null;
create index if not exists billing_invoices_razorpay_payment_link_idx
  on public.billing_invoices(razorpay_payment_link_id);
create index if not exists client_subscriptions_client_created_idx
  on public.client_subscriptions(client_id, created_at desc);
create index if not exists billing_invoices_client_created_idx
  on public.billing_invoices(client_id, created_at desc);

alter table public.service_plans enable row level security;
alter table public.client_subscriptions enable row level security;
alter table public.billing_invoices enable row level security;

revoke all on public.service_plans, public.client_subscriptions, public.billing_invoices from anon, authenticated;
grant select, insert, update, delete on public.service_plans, public.client_subscriptions, public.billing_invoices to authenticated;

drop policy if exists "Admins manage service plans" on public.service_plans;
create policy "Admins manage service plans" on public.service_plans
  for all to authenticated using ((select public.is_agentos_admin()))
  with check ((select public.is_agentos_admin()));

drop policy if exists "Admins manage client subscriptions" on public.client_subscriptions;
create policy "Admins manage client subscriptions" on public.client_subscriptions
  for all to authenticated using ((select public.is_agentos_admin()))
  with check ((select public.is_agentos_admin()));

drop policy if exists "Admins manage billing invoices" on public.billing_invoices;
create policy "Admins manage billing invoices" on public.billing_invoices
  for all to authenticated using ((select public.is_agentos_admin()))
  with check ((select public.is_agentos_admin()));

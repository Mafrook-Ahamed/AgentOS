-- AgentOS agent builder and chat runtime.
-- Administrator membership is provisioned separately in public.agentos_admins.
create or replace function public.is_agentos_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (select 1 from public.agentos_admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.is_agentos_admin() from public, anon;
grant execute on function public.is_agentos_admin() to authenticated;

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  description text not null default '',
  system_prompt text not null default 'You are a helpful AI assistant. Be accurate, concise, and honest.',
  provider text not null default 'openai' check (provider in ('openai','gemini')),
  model text not null default 'gpt-4.1-mini',
  temperature numeric(2,1) not null default 0.7 check (temperature between 0 and 2),
  max_output_tokens integer not null default 1024 check (max_output_tokens between 64 and 8192),
  welcome_message text not null default 'Hello! How can I help you today?',
  status text not null default 'draft' check (status in ('draft','active','paused')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agents_client_created_idx on public.agents(client_id, created_at desc);

create table if not exists public.agent_conversations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null default 'New conversation',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agent_conversations_agent_updated_idx on public.agent_conversations(agent_id, updated_at desc);

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.agent_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (length(content) between 1 and 20000),
  provider text,
  model text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);
create index if not exists agent_messages_conversation_created_idx on public.agent_messages(conversation_id, created_at);

create table if not exists public.agent_usage (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  conversation_id uuid not null references public.agent_conversations(id) on delete cascade,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists agent_usage_agent_created_idx on public.agent_usage(agent_id, created_at desc);

alter table public.agents enable row level security;
alter table public.agent_conversations enable row level security;
alter table public.agent_messages enable row level security;
alter table public.agent_usage enable row level security;
revoke all on public.agents, public.agent_conversations, public.agent_messages, public.agent_usage from anon, authenticated;
grant select, insert, update, delete on public.agents to authenticated;
grant select, insert, update, delete on public.agent_conversations to authenticated;
grant select, insert, update, delete on public.agent_messages to authenticated;
grant select, insert on public.agent_usage to authenticated;

drop policy if exists "AgentOS admins manage agents" on public.agents;
create policy "AgentOS admins manage agents" on public.agents for all to authenticated
using ((select public.is_agentos_admin())) with check ((select public.is_agentos_admin()));
drop policy if exists "AgentOS admins manage conversations" on public.agent_conversations;
create policy "AgentOS admins manage conversations" on public.agent_conversations for all to authenticated
using ((select public.is_agentos_admin())) with check ((select public.is_agentos_admin()));
drop policy if exists "AgentOS admins manage messages" on public.agent_messages;
create policy "AgentOS admins manage messages" on public.agent_messages for all to authenticated
using ((select public.is_agentos_admin())) with check ((select public.is_agentos_admin()));
drop policy if exists "AgentOS admins read usage" on public.agent_usage;
create policy "AgentOS admins read usage" on public.agent_usage for select to authenticated
using ((select public.is_agentos_admin()));
drop policy if exists "AgentOS admins insert usage" on public.agent_usage;
create policy "AgentOS admins insert usage" on public.agent_usage for insert to authenticated
with check ((select public.is_agentos_admin()));

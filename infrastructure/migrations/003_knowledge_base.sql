create extension if not exists vector with schema extensions;

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 240),
  file_name text not null,
  mime_type text not null,
  storage_path text not null unique,
  status text not null default 'uploaded' check (status in ('uploaded','processing','ready','failed')),
  chunk_count integer not null default 0,
  error_message text,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists knowledge_documents_client_created_idx
  on public.knowledge_documents(client_id, created_at desc);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  chunk_index integer not null,
  content text not null check (length(content) between 1 and 12000),
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);
create index if not exists knowledge_chunks_client_idx on public.knowledge_chunks(client_id);
create index if not exists knowledge_chunks_embedding_idx
  on public.knowledge_chunks using hnsw (embedding extensions.vector_cosine_ops);

alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
revoke all on public.knowledge_documents, public.knowledge_chunks from anon, authenticated;
grant select, insert, update, delete on public.knowledge_documents to authenticated;
grant select, insert, update, delete on public.knowledge_chunks to authenticated;

drop policy if exists "AgentOS admins manage knowledge documents" on public.knowledge_documents;
create policy "AgentOS admins manage knowledge documents" on public.knowledge_documents
for all to authenticated using ((select public.is_agentos_admin()))
with check ((select public.is_agentos_admin()));

drop policy if exists "AgentOS admins manage knowledge chunks" on public.knowledge_chunks;
create policy "AgentOS admins manage knowledge chunks" on public.knowledge_chunks
for all to authenticated using ((select public.is_agentos_admin()))
with check ((select public.is_agentos_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agentos-knowledge', 'agentos-knowledge', false, 20971520,
  array['application/pdf','text/plain','text/markdown','text/csv'])
on conflict (id) do update set public = false, file_size_limit = 20971520,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "AgentOS admins upload knowledge files" on storage.objects;
create policy "AgentOS admins upload knowledge files" on storage.objects
for insert to authenticated with check (bucket_id = 'agentos-knowledge' and (select public.is_agentos_admin()));

drop policy if exists "AgentOS admins read knowledge files" on storage.objects;
create policy "AgentOS admins read knowledge files" on storage.objects
for select to authenticated using (bucket_id = 'agentos-knowledge' and (select public.is_agentos_admin()));

drop policy if exists "AgentOS admins delete knowledge files" on storage.objects;
create policy "AgentOS admins delete knowledge files" on storage.objects
for delete to authenticated using (bucket_id = 'agentos-knowledge' and (select public.is_agentos_admin()));

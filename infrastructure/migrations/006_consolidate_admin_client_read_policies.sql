-- Consolidate overlapping SELECT policies while preserving admin and client access.
drop policy if exists "AgentOS admins manage conversations" on public.agent_conversations;
drop policy if exists "Client users read own conversations" on public.agent_conversations;
create policy "Admins and assigned clients read conversations" on public.agent_conversations
for select to authenticated using (
  (select public.is_agentos_admin()) or (select public.is_client_member(client_id))
);
create policy "AgentOS admins insert conversations" on public.agent_conversations
for insert to authenticated with check ((select public.is_agentos_admin()));
create policy "AgentOS admins update conversations" on public.agent_conversations
for update to authenticated using ((select public.is_agentos_admin())) with check ((select public.is_agentos_admin()));
create policy "AgentOS admins delete conversations" on public.agent_conversations
for delete to authenticated using ((select public.is_agentos_admin()));

drop policy if exists "AgentOS admins manage messages" on public.agent_messages;
drop policy if exists "Client users read messages for assigned conversations" on public.agent_messages;
create policy "Admins and assigned clients read messages" on public.agent_messages
for select to authenticated using (
  (select public.is_agentos_admin()) or exists (
    select 1 from public.agent_conversations c
    where c.id=agent_messages.conversation_id and (select public.is_client_member(c.client_id))
  )
);
create policy "AgentOS admins insert messages" on public.agent_messages
for insert to authenticated with check ((select public.is_agentos_admin()));
create policy "AgentOS admins update messages" on public.agent_messages
for update to authenticated using ((select public.is_agentos_admin())) with check ((select public.is_agentos_admin()));
create policy "AgentOS admins delete messages" on public.agent_messages
for delete to authenticated using ((select public.is_agentos_admin()));

drop policy if exists "AgentOS admins read usage" on public.agent_usage;
drop policy if exists "Client users read assigned usage" on public.agent_usage;
create policy "Admins and assigned clients read usage" on public.agent_usage
for select to authenticated using (
  (select public.is_agentos_admin()) or exists (
    select 1 from public.agent_conversations c
    where c.id=agent_usage.conversation_id and (select public.is_client_member(c.client_id))
  )
);

drop policy if exists "AgentOS admins manage agents" on public.agents;
drop policy if exists "Client users read assigned agents" on public.agents;
create policy "Admins and assigned clients read agents" on public.agents
for select to authenticated using (
  (select public.is_agentos_admin()) or
  (status='active' and (select public.is_client_member(client_id)))
);
create policy "AgentOS admins insert agents" on public.agents
for insert to authenticated with check ((select public.is_agentos_admin()));
create policy "AgentOS admins update agents" on public.agents
for update to authenticated using ((select public.is_agentos_admin())) with check ((select public.is_agentos_admin()));
create policy "AgentOS admins delete agents" on public.agents
for delete to authenticated using ((select public.is_agentos_admin()));

drop policy if exists "AgentOS admins manage clients" on public.clients;
drop policy if exists "Client users read assigned client" on public.clients;
create policy "Admins and assigned users read clients" on public.clients
for select to authenticated using (
  (select public.is_agentos_admin()) or id in (
    select cm.client_id from public.client_memberships cm where cm.user_id=(select auth.uid())
  )
);
create policy "AgentOS admins insert clients" on public.clients
for insert to authenticated with check ((select public.is_agentos_admin()));
create policy "AgentOS admins update clients" on public.clients
for update to authenticated using ((select public.is_agentos_admin())) with check ((select public.is_agentos_admin()));
create policy "AgentOS admins delete clients" on public.clients
for delete to authenticated using ((select public.is_agentos_admin()));

drop policy if exists "AgentOS admins manage knowledge documents" on public.knowledge_documents;
drop policy if exists "Client users read assigned knowledge documents" on public.knowledge_documents;
create policy "Admins and assigned clients read knowledge documents" on public.knowledge_documents
for select to authenticated using (
  (select public.is_agentos_admin()) or (select public.is_client_member(client_id))
);
create policy "AgentOS admins insert knowledge documents" on public.knowledge_documents
for insert to authenticated with check ((select public.is_agentos_admin()));
create policy "AgentOS admins update knowledge documents" on public.knowledge_documents
for update to authenticated using ((select public.is_agentos_admin())) with check ((select public.is_agentos_admin()));
create policy "AgentOS admins delete knowledge documents" on public.knowledge_documents
for delete to authenticated using ((select public.is_agentos_admin()));

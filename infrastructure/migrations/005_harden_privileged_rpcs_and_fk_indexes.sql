-- Tighten privileged RPC access and remove unindexed foreign keys.
-- SECURITY DEFINER functions are callable only with the service-role key from trusted server code.
create or replace function public.admin_link_client_user(p_client_id uuid, p_email text, p_role text default 'member')
returns uuid language plpgsql security definer set search_path = ''
as $$
declare target_user uuid;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role'
     and not coalesce((select public.is_agentos_admin()), false) then
    raise exception 'Administrator access required';
  end if;
  if p_role not in ('owner','member') then raise exception 'Invalid client role'; end if;
  if not exists (select 1 from public.clients c where c.id=p_client_id and c.status='active') then
    raise exception 'Active client not found';
  end if;
  select u.id into target_user from auth.users u
    where lower(u.email)=lower(trim(p_email)) limit 1;
  if target_user is null then
    raise exception 'No registered user found for this email. Ask the client to create their account first.';
  end if;
  insert into public.client_memberships(client_id,user_id,role)
    values(p_client_id,target_user,p_role)
    on conflict(client_id,user_id) do update set role=excluded.role;
  return target_user;
end;
$$;
revoke all on function public.admin_link_client_user(uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_link_client_user(uuid,text,text) to service_role;

create or replace function public.reserve_client_agent_request(p_client_id uuid)
returns table(allowed boolean,used integer,request_limit integer,resets_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_month date := date_trunc('month',now() at time zone 'UTC')::date;
  v_limit integer;
  v_enabled boolean;
  v_used integer;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role'
     and not coalesce((select public.is_agentos_admin()),false) then
    raise exception 'Administrator access is required';
  end if;
  if not exists(select 1 from public.clients c where c.id=p_client_id and c.status='active') then
    raise exception 'Active client not found';
  end if;
  select l.monthly_request_limit,l.enabled into v_limit,v_enabled
    from public.client_usage_limits l where l.client_id=p_client_id;
  if not found then v_limit:=1000; v_enabled:=true; end if;
  if not v_enabled then
    return query select true,0,v_limit,(v_month+interval '1 month')::timestamptz;
    return;
  end if;
  insert into public.client_monthly_request_usage as u(client_id,month_start,request_count)
    values(p_client_id,v_month,1)
    on conflict(client_id,month_start)
    do update set request_count=u.request_count+1,updated_at=now()
    where u.request_count<v_limit
    returning u.request_count into v_used;
  if v_used is null then
    select u.request_count into v_used from public.client_monthly_request_usage u
      where u.client_id=p_client_id and u.month_start=v_month;
    return query select false,coalesce(v_used,0),v_limit,(v_month+interval '1 month')::timestamptz;
  else
    return query select true,v_used,v_limit,(v_month+interval '1 month')::timestamptz;
  end if;
end;
$$;
revoke all on function public.reserve_client_agent_request(uuid) from public,anon,authenticated;
grant execute on function public.reserve_client_agent_request(uuid) to service_role;

create or replace function public.admin_assign_client_subscription(
  p_client_id uuid,p_plan_id uuid,p_status text,p_period_end date,p_notes text
)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare new_subscription_id uuid; plan_limit integer;
begin
  if not coalesce((select public.is_agentos_admin()),false) then
    raise exception 'Administrator access required';
  end if;
  if p_status not in ('trial','active','past_due','cancelled','expired') then
    raise exception 'Invalid subscription status';
  end if;
  if not exists(select 1 from public.clients c where c.id=p_client_id and c.status='active') then
    raise exception 'Active client not found';
  end if;
  if p_plan_id is not null then
    select sp.monthly_request_limit into plan_limit from public.service_plans sp
      where sp.id=p_plan_id and sp.active=true;
    if plan_limit is null then raise exception 'Active service plan not found'; end if;
  end if;
  insert into public.client_subscriptions(client_id,plan_id,status,current_period_end,notes)
    values(p_client_id,p_plan_id,p_status,p_period_end,coalesce(p_notes,''))
    returning id into new_subscription_id;
  if p_plan_id is not null then
    insert into public.client_usage_limits(client_id,monthly_request_limit,enabled,updated_at)
      values(p_client_id,plan_limit,true,now())
      on conflict(client_id) do update set monthly_request_limit=excluded.monthly_request_limit,
        enabled=true,updated_at=now();
  end if;
  return new_subscription_id;
end;
$$;
revoke all on function public.admin_assign_client_subscription(uuid,uuid,text,date,text) from public,anon;
grant execute on function public.admin_assign_client_subscription(uuid,uuid,text,date,text) to authenticated;

create index if not exists agent_conversations_client_id_idx on public.agent_conversations(client_id);
create index if not exists agent_conversations_created_by_idx on public.agent_conversations(created_by);
create index if not exists agent_usage_conversation_id_idx on public.agent_usage(conversation_id);
create index if not exists agent_widgets_created_by_idx on public.agent_widgets(created_by);
create index if not exists agents_created_by_idx on public.agents(created_by);
create index if not exists billing_invoices_subscription_id_idx on public.billing_invoices(subscription_id);
create index if not exists client_subscriptions_plan_id_idx on public.client_subscriptions(plan_id);
create index if not exists knowledge_documents_uploaded_by_idx on public.knowledge_documents(uploaded_by);

comment on table public.agent_widget_rate_limits is
  'Internal rate-limit state. RLS is enabled, no client policies exist, and only service_role has table privileges.';

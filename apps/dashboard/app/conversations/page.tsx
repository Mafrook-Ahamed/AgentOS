import Link from "next/link";
import { MessageSquare, Search, Bot, Users, ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import WorkspaceNav from "@/components/workspace-nav";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; agent?: string; conversation?: string };

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: agents, error: agentsError }, { data: agentOptions, error: optionsError }] = await Promise.all([
    (() => {
      let query = supabase.from("agent_conversations")
        .select("id,title,created_at,updated_at,agent_id,client_id,agents(name,provider,model),clients(company)")
        .order("updated_at", { ascending: false }).limit(100);
      if (params.q?.trim()) query = query.ilike("title", `%${params.q.trim().replace(/[%_]/g, "")}%`);
      if (params.agent) query = query.eq("agent_id", params.agent);
      return query;
    })(),
    supabase.from("agents").select("id,name").order("name"),
  ]);
  if (agentsError) throw new Error(agentsError.message);
  if (optionsError) throw new Error(optionsError.message);

  const selectedId = params.conversation;
  const selected = (agents ?? []).find((item: any) => item.id === selectedId) ?? null;
  const { data: messages, error: messagesError } = selectedId
    ? await supabase.from("agent_messages").select("id,role,content,provider,model,input_tokens,output_tokens,created_at")
        .eq("conversation_id", selectedId).order("created_at", { ascending: true })
    : { data: [], error: null };
  if (messagesError) throw new Error(messagesError.message);

  return <main className="conversations-page">
    <WorkspaceNav />
    <header className="conversations-header">
      <div><div className="eyebrow"><MessageSquare size={13}/> CUSTOMER ACTIVITY</div><h1>Conversations</h1><p>Review agent chats, inspect transcripts and understand client interactions.</p></div>
      <div className="conversation-count"><b>{agents?.length ?? 0}</b><span>Recent conversations</span></div>
    </header>
    <form className="conversation-filters" action="/conversations">
      <label className="conversation-search"><Search size={15}/><input name="q" defaultValue={params.q ?? ""} placeholder="Search conversation titles"/></label>
      <select name="agent" defaultValue={params.agent ?? ""}><option value="">All agents</option>{(agentOptions ?? []).map((agent: any)=><option key={agent.id} value={agent.id}>{agent.name}</option>)}</select>
      <button type="submit" className="primary-button">Apply filters</button>
      <Link href="/conversations" className="conversation-clear">Clear</Link>
    </form>
    <div className="conversation-layout">
      <section className="conversation-list panel">
        <div className="conversation-list-head"><div><h2>Recent activity</h2><p>Showing up to 100 latest conversations</p></div></div>
        {(agents ?? []).length ? (agents ?? []).map((item: any) => {
          const agent = item.agents as {name:string;provider:string;model:string}|null;
          const client = item.clients as {company:string}|null;
          return <Link key={item.id} href={{pathname:"/conversations",query:{...(params.q?{q:params.q}:{}),...(params.agent?{agent:params.agent}:{}),conversation:item.id}}}
            className={"conversation-item " + (selectedId === item.id ? "selected" : "")}>
            <span className="conversation-item-icon"><MessageSquare size={16}/></span>
            <span className="conversation-item-copy"><b>{item.title || "New conversation"}</b><small><Bot size={11}/> {agent?.name ?? "Agent"} <span>·</span> <Users size={11}/> {client?.company ?? "Client"}</small><time>{new Date(item.updated_at).toLocaleString()}</time></span>
          </Link>;
        }) : <div className="conversation-empty">No conversations match these filters.</div>}
      </section>
      <section className="conversation-transcript panel">
        {selected ? <>
          <div className="transcript-head"><div><Link href="/conversations" className="back-link"><ChevronLeft size={14}/> All conversations</Link><h2>{selected.title || "New conversation"}</h2><p>{(selected.agents as any)?.name ?? "Agent"} · {(selected.clients as any)?.company ?? "Client"}</p></div><span className="transcript-date">{new Date(selected.created_at).toLocaleString()}</span></div>
          <div className="transcript-messages">{(messages ?? []).length ? (messages ?? []).map((message: any)=><article key={message.id} className={"transcript-message " + message.role}><div className="transcript-role">{message.role === "assistant" ? "Agent" : "Customer"}</div><p>{message.content}</p><time>{new Date(message.created_at).toLocaleString()}</time>{message.role === "assistant" && <small>{message.provider ?? "Provider"} · {message.model ?? "Model"} · {(message.input_tokens ?? 0) + (message.output_tokens ?? 0)} tokens</small>}</article>) : <div className="conversation-empty">No messages were saved for this conversation.</div>}</div>
        </> : <div className="transcript-placeholder"><MessageSquare size={30}/><b>Select a conversation</b><span>Choose an item from the list to inspect its full transcript.</span></div>}
      </section>
    </div>
  </main>;
}

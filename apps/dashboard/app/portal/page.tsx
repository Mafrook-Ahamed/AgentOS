import Link from "next/link";
import { Bot, FileText, MessageSquare, ShieldCheck } from "lucide-react";
import { requireClient } from "@/lib/auth/client";
import { signOut } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage() {
  const { supabase, memberships } = await requireClient();
  const clientIds = memberships.map((m: any) => m.client_id);
  const [{ data: agents }, { data: conversations }, { data: docs }] = await Promise.all([
    supabase.from("agents").select("id,name,description,provider,model,status,created_at,client_id").in("client_id",clientIds).eq("status","active").order("created_at",{ascending:false}),
    supabase.from("agent_conversations").select("id,title,updated_at,client_id,agent_id,agents(name)").in("client_id",clientIds).order("updated_at",{ascending:false}).limit(8),
    supabase.from("knowledge_documents").select("id,title,file_name,status,chunk_count,client_id").in("client_id",clientIds).order("created_at",{ascending:false})
  ]);
  const companyNames = memberships.map((m:any)=>m.clients.company).join(", ");
  return <main className="client-portal">
    <header className="portal-header"><div><div className="eyebrow"><ShieldCheck size={13}/> CLIENT WORKSPACE</div><h1>Welcome to your workspace</h1><p>{companyNames} · Your assigned AgentOS services</p></div><form action={signOut}><button className="portal-signout" type="submit">Sign out</button></form></header>
    <section className="portal-stats"><article><Bot/><span>Active agents</span><b>{agents?.length ?? 0}</b></article><article><MessageSquare/><span>Conversations</span><b>{conversations?.length ?? 0}</b></article><article><FileText/><span>Knowledge files</span><b>{docs?.length ?? 0}</b></article></section>
    <section className="portal-section"><div className="portal-section-head"><div><h2>Your AI agents</h2><p>Agents configured and activated for your business.</p></div></div>
      {agents?.length ? <div className="portal-agent-grid">{agents.map((agent:any)=><article className="portal-agent" key={agent.id}><span className="portal-agent-icon"><Bot size={19}/></span><h3>{agent.name}</h3><p>{agent.description || "Your AI assistant is ready to help."}</p><small>{agent.provider} · {agent.model}</small><span className="portal-active">Active</span></article>)}</div> : <div className="portal-empty">No active agents have been assigned yet.</div>}
    </section>
    <section className="portal-section"><div className="portal-section-head"><div><h2>Recent conversations</h2><p>Recent activity from your assigned agents.</p></div></div>
      {conversations?.length ? <div className="portal-table">{conversations.map((item:any)=><div className="portal-conversation" key={item.id}><MessageSquare size={16}/><b>{item.title}</b><span>{item.agents?.name ?? "AI agent"}</span><time>{new Date(item.updated_at).toLocaleDateString()}</time></div>)}</div> : <div className="portal-empty">Your conversations will appear here.</div>}
    </section>
    <section className="portal-section"><div className="portal-section-head"><div><h2>Knowledge base</h2><p>Documents currently indexed for your agents.</p></div></div>
      {docs?.length ? <div className="portal-table">{docs.map((doc:any)=><div className="portal-conversation" key={doc.id}><FileText size={16}/><b>{doc.title || doc.file_name}</b><span>{doc.chunk_count} indexed sections</span><span className={"knowledge-status "+doc.status}>{doc.status}</span></div>)}</div> : <div className="portal-empty">No knowledge documents are available yet.</div>}
    </section>
    <footer className="portal-footer">Powered by AgentOS · Your workspace data is private to your organisation.</footer>
  </main>;
}

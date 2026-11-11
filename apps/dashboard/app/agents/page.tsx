import Link from "next/link";
import { Bot, Plus, Sparkles, Users, ArrowUpRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { createAgentRecord } from "./actions";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: clients, error: clientsError }, { data: agents, error: agentsError }] = await Promise.all([
    supabase.from("clients").select("id,name,company").order("company"),
    supabase.from("agents").select("id,name,description,provider,model,status,created_at,clients(company)")
      .order("created_at", { ascending: false }),
  ]);
  if (clientsError) throw new Error(clientsError.message);
  if (agentsError) throw new Error(agentsError.message);

  return <main className="agents-page">
    <header className="agents-header">
      <div><div className="eyebrow"><Sparkles size={13}/> AGENT STUDIO</div><h1>AI Agents</h1>
        <p>Create, configure and test AI assistants for each client.</p></div>
      <Link href="/" className="back-link">← Overview</Link>
    </header>
    <section className="agent-builder-card">
      <div className="agent-builder-title"><div className="agent-builder-icon"><Plus size={18}/></div>
        <div><h2>Create an agent</h2><p>Choose a client, model and instructions. Test it before activation.</p></div></div>
      {clients?.length ? <form action={createAgentRecord} className="agent-builder-form">
        <label>Agent name<input name="name" required maxLength={120} placeholder="e.g. Customer Support Assistant"/></label>
        <label>Client<select name="client_id" required defaultValue=""><option value="" disabled>Select a client</option>
          {clients.map(client=><option key={client.id} value={client.id}>{client.company} — {client.name}</option>)}
        </select></label>
        <label>AI provider<select name="provider" defaultValue="openai"><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option></select></label>
        <label>Model<select name="model" defaultValue="gpt-4.1-mini">
          <optgroup label="OpenAI"><option value="gpt-4.1-mini">GPT-4.1 mini</option><option value="gpt-4.1">GPT-4.1</option><option value="gpt-4o-mini">GPT-4o mini</option></optgroup>
          <optgroup label="Google Gemini"><option value="gemini-2.5-flash">Gemini 2.5 Flash</option><option value="gemini-2.5-pro">Gemini 2.5 Pro</option><option value="gemini-2.0-flash">Gemini 2.0 Flash</option></optgroup>
        </select></label>
        <label className="agent-full">Short description<input name="description" placeholder="What should this agent help the client with?"/></label>
        <label className="agent-full">System instructions<textarea name="system_prompt" required rows={5} defaultValue="You are a helpful AI assistant. Be accurate, concise, and honest. Answer using the client's business context when it is provided. If you do not know an answer, say so instead of inventing information."/></label>
        <label>Welcome message<input name="welcome_message" defaultValue="Hello! How can I help you today?"/></label>
        <label>Temperature<input name="temperature" type="number" min="0" max="2" step="0.1" defaultValue="0.7"/></label>
        <label>Maximum output tokens<input name="max_output_tokens" type="number" min="64" max="8192" step="64" defaultValue="1024"/></label>
        <div className="agent-submit"><button className="primary-button" type="submit"><Plus size={16}/> Create agent</button><span>New agents start as drafts. The model defaults to the selected provider if needed.</span></div>
      </form> : <div className="agent-no-clients"><Users size={22}/><b>Add a client before creating an agent.</b><Link href="/clients">Open client management <ArrowUpRight size={14}/></Link></div>}
    </section>
    <section className="agent-directory">
      <div className="agent-directory-head"><div><h2>Your agents</h2><p>{agents?.length ?? 0} configured agents</p></div><span className="agent-directory-count">{agents?.length ?? 0} total</span></div>
      {agents?.length ? <div className="agent-directory-grid">{agents.map(agent=>{
        const client = agent.clients as unknown as {company:string}|null;
        return <Link href={"/agents/" + agent.id} className="agent-directory-card" key={agent.id}>
          <div className="agent-card-top"><span className="agent-card-icon"><Bot size={19}/></span><span className={"agent-state " + agent.status}>{agent.status}</span></div>
          <h3>{agent.name}</h3><p>{agent.description || "No description added yet."}</p>
          <div className="agent-card-meta"><span>{client?.company ?? "Client"}</span><span>{agent.provider} · {agent.model}</span></div>
          <div className="agent-card-open">Configure agent <ArrowUpRight size={15}/></div>
        </Link>;
      })}</div> : <div className="agent-empty"><Bot size={26}/><b>No AI agents created</b><span>Create your first agent above. It will be saved to AgentOS and linked to a client.</span></div>}
    </section>
  </main>;
}

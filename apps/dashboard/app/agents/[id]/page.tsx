import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, ChevronLeft, MessageSquare, Sparkles } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { updateAgentRecord, updateAgentStatus } from "../actions";
import AgentChat from "@/components/agent-chat";
import PublicWidgetSettings from "@/components/public-widget-settings";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: agent, error }, { data: clients, error: clientsError }, { data: widget }] = await Promise.all([
    supabase.from("agents").select("*,clients(company,name)").eq("id", id).maybeSingle(),
    supabase.from("clients").select("id,company").order("company"),
    supabase.from("agent_widgets").select("enabled,allowed_origins").eq("agent_id", id).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  if (clientsError) throw new Error(clientsError.message);
  if (!agent) notFound();
  const client = agent.clients as unknown as {company:string;name:string}|null;

  return <main className="agent-detail-page">
    <header className="agent-detail-header"><div><Link href="/agents" className="back-link"><ChevronLeft size={15}/> All agents</Link>
      <div className="eyebrow"><Sparkles size={13}/> AGENT CONFIGURATION</div><h1>{agent.name}</h1><p>{client?.company ?? "Client"} · {agent.provider} · {agent.model}</p></div>
      <form action={updateAgentStatus} className="agent-status-form"><input type="hidden" name="id" value={agent.id}/>
        <select name="status" defaultValue={agent.status}><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option></select>
        <button type="submit">Update status</button></form>
    </header>
    {query.status && ["active", "paused", "draft"].includes(query.status) && <div className="agent-status-confirmation" role="status">Agent status saved: <strong>{query.status}</strong></div>}
    <div className="agent-detail-grid">
      <section className="agent-config-card"><div className="agent-config-heading"><span className="agent-card-icon"><Bot size={19}/></span><div><h2>Agent settings</h2><p>Changes are saved to your AgentOS database.</p></div></div>
        <form action={updateAgentRecord} className="agent-edit-form">
          <input type="hidden" name="id" value={agent.id}/>
          <label>Agent name<input name="name" required defaultValue={agent.name}/></label>
          <label>Description<input name="description" defaultValue={agent.description}/></label>
          <label>Provider<select name="provider" defaultValue={agent.provider}><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option></select></label>
          <label>Model<select name="model" defaultValue={agent.model}>
            <optgroup label="OpenAI"><option value="gpt-4.1-mini">GPT-4.1 mini</option><option value="gpt-4.1">GPT-4.1</option><option value="gpt-4o-mini">GPT-4o mini</option></optgroup>
            <optgroup label="Google Gemini"><option value="gemini-2.5-flash">Gemini 2.5 Flash</option><option value="gemini-2.5-pro">Gemini 2.5 Pro</option><option value="gemini-2.0-flash">Gemini 2.0 Flash</option></optgroup>
          </select></label>
          <label className="agent-full">System instructions<textarea name="system_prompt" rows={9} required defaultValue={agent.system_prompt}/></label>
          <label className="agent-full">Welcome message<input name="welcome_message" defaultValue={agent.welcome_message}/></label>
          <label>Temperature<input name="temperature" type="number" min="0" max="2" step="0.1" defaultValue={agent.temperature}/></label>
          <label>Max output tokens<input name="max_output_tokens" type="number" min="64" max="8192" step="64" defaultValue={agent.max_output_tokens}/></label>
          <button type="submit" className="primary-button">Save agent settings</button>
        </form>
      </section>
      <section className="agent-test-card"><div className="agent-config-heading"><span className="agent-chat-icon"><MessageSquare size={18}/></span><div><h2>Test your agent</h2><p>Send messages to verify its instructions and model.</p></div></div>
        <AgentChat agentId={agent.id} welcomeMessage={agent.welcome_message}/>
      </section>
    </div>
  </main>;
}

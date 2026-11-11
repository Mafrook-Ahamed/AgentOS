import { requireAdmin } from "@/lib/auth/admin";
import DashboardClient from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase } = await requireAdmin();
  const [clients, agents, activeAgents, conversations, recentAgents] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("agents").select("id", { count: "exact", head: true }),
    supabase.from("agents").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("agent_conversations").select("id", { count: "exact", head: true }),
    supabase.from("agents").select("id,name,provider,model,status,clients(company)")
      .order("created_at", { ascending: false }).limit(5),
  ]);
  for (const result of [clients, agents, activeAgents, conversations, recentAgents]) {
    if (result.error) throw new Error(result.error.message);
  }
  const recent = (recentAgents.data ?? []).map((agent) => ({
    id: agent.id, name: agent.name, provider: agent.provider, model: agent.model, status: agent.status,
    company: (agent.clients as unknown as {company:string}|null)?.company ?? "Client",
  }));
  return <DashboardClient stats={{
    clients: clients.count ?? 0, agents: agents.count ?? 0,
    activeAgents: activeAgents.count ?? 0, conversations: conversations.count ?? 0,
    recentAgents: recent,
  }}/>;
}

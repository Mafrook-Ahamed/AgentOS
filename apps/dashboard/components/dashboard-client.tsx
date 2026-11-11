"use client";

import { Activity, Bot, CircleHelp, Command, CreditCard, FileText, Gauge, LayoutDashboard, LifeBuoy, Menu, MessageSquare, Settings, ShieldCheck, Sparkles, Users, Workflow, Plus } from "lucide-react";
import Link from "next/link";
import { signOut } from "../app/login/actions";

type DashboardStats = {
  clients: number;
  agents: number;
  activeAgents: number;
  conversations: number;
  recentAgents: Array<{ id: string; name: string; provider: string; model: string; status: string; company: string }>;
};
function NavItem({ icon: Icon, label, active = false, href = "/" }: { icon: any; label: string; active?: boolean; href?: string }) {
  return <Link href={href} className={"nav-item " + (active ? "active" : "")}><Icon size={17}/><span>{label}</span></Link>;
}
function StatCard({ label, value, icon: Icon, detail }: { label: string; value: string; icon: any; detail: string }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={17}/></span></div><div className="stat-value">{value}</div><div className="stat-foot"><span>{detail}</span></div></article>;
}
export default function DashboardClient({ stats }: { stats: DashboardStats }) {
  return <main className="shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><Command size={21}/></div><div><b>AgentOS</b><span>AGENT CONTROL CENTER</span></div></div>
      <div className="workspace"><div className="workspace-avatar">A</div><div><b>AgentOS workspace</b><span>Platform administrator</span></div><ShieldCheck size={15}/></div>
      <div className="nav-label">WORKSPACE</div><nav><NavItem icon={LayoutDashboard} label="Overview" active/><NavItem icon={Bot} label="AI Agents" href="/agents"/><NavItem icon={Users} label="Clients" href="/clients"/><NavItem icon={MessageSquare} label="Conversations"/><NavItem icon={FileText} label="Knowledge base"/><NavItem icon={Workflow} label="Workflows"/></nav>
      <div className="nav-label nav-label-spaced">MANAGEMENT</div><nav><NavItem icon={Gauge} label="Usage & analytics"/><NavItem icon={CreditCard} label="Billing"/><NavItem icon={ShieldCheck} label="Security"/></nav>
      <div className="sidebar-bottom"><nav><NavItem icon={Settings} label="Settings"/><NavItem icon={LifeBuoy} label="Help & support"/></nav><form action={signOut} className="profile"><div className="profile-avatar">AD</div><div><b>Administrator</b><span>Sign out securely</span></div><button className="signout" type="submit">↗</button></form></div>
    </aside>
    <section className="main-area"><header className="topbar"><div className="crumb"><button className="mobile-menu"><Menu size={19}/></button><span>Workspace</span><span className="slash">/</span><b>Overview</b></div><div className="top-actions"><div className="system-status"><i/> Admin session secured</div><button className="icon-button"><CircleHelp size={18}/></button><div className="top-avatar">AD</div></div></header>
      <div className="content"><div className="page-heading"><div><div className="eyebrow"><Sparkles size={13}/> YOUR AI OPERATIONS</div><h1>Welcome to AgentOS</h1><p>Manage clients, configure AI agents and monitor conversations.</p></div><Link className="primary-button" href="/agents"><Plus size={16}/> Create agent</Link></div>
        <div className="notice"><div className="notice-icon"><Bot size={17}/></div><div><b>Agent Studio is ready</b><span>Create an agent for a client, configure its model and instructions, then test it in a private chat.</span></div></div>
        <div className="stats-grid"><StatCard label="Total clients" value={String(stats.clients).padStart(2,"0")} icon={Users} detail="Registered client records"/><StatCard label="Active agents" value={String(stats.activeAgents).padStart(2,"0")} icon={Bot} detail={stats.agents + " agents configured"}/><StatCard label="Conversations" value={String(stats.conversations).padStart(2,"0")} icon={MessageSquare} detail="Saved test conversations"/><StatCard label="AI usage" value="Tracked" icon={Activity} detail="Token counts recorded per response"/></div>
        <div className="section-grid"><section className="panel agent-panel"><div className="panel-heading"><div><h2>Recently configured agents</h2><p>Open an agent to edit its instructions or test it.</p></div><Link href="/agents" className="back-link">View all →</Link></div>
          <div className="agent-list">{stats.recentAgents.length ? stats.recentAgents.map(agent=><Link className="agent-row" href={"/agents/" + agent.id} key={agent.id}><div className="agent-symbol blue"><Bot size={19}/></div><div className="agent-info"><b>{agent.name}</b><span>{agent.company} · {agent.provider} · {agent.model}</span></div><div className={"status " + agent.status}><i/>{agent.status}</div><span className="agent-open">Open →</span></Link>) : <div className="agent-empty compact"><Bot size={23}/><b>No agents yet</b><span>Create your first client agent to get started.</span><Link href="/agents" className="primary-button">Create agent</Link></div>}</div>
        </section>
        <section className="panel usage-panel"><div className="panel-heading"><div><h2>Platform readiness</h2><p>Current implementation</p></div></div><div className="readiness"><div><span>Admin authentication</span><b>Connected</b></div><div><span>Client management</span><b>Live database</b></div><div><span>Agent builder</span><b>Implemented</b></div><div><span>AI chat runtime</span><b>Provider key required</b></div></div></section></div>
        <footer className="footer"><span>© 2026 AgentOS</span><span><i/> Administrator area</span><span>Secure operations console</span></footer>
      </div>
    </section>
  </main>;
}

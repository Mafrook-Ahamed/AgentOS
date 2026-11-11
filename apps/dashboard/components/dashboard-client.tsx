"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Bot, ChevronDown, CircleHelp, Command, CreditCard, FileText, Gauge, LayoutDashboard, LifeBuoy, Menu, MessageSquare, MoreHorizontal, Plus, Search, Settings, ShieldCheck, Sparkles, Users, Workflow, Zap } from "lucide-react";
import Link from "next/link";
import { signOut } from "./login/actions";

const initialAgents = [
  { name: "Travel Enquiry Assistant", client: "Client deployment", type: "Customer support", status: "Active", conversations: 0, model: "OpenAI", color: "blue" },
  { name: "Clinic Appointment Agent", client: "Client deployment", type: "Appointment booking", status: "Active", conversations: 0, model: "OpenAI", color: "violet" },
];
function NavItem({ icon: Icon, label, active = false, href = "/" }: { icon: any; label: string; active?: boolean; href?: string }) {
  return <Link href={href} className={`nav-item ${active ? "active" : ""}`}><Icon size={17}/><span>{label}</span></Link>;
}
function StatCard({ label, value, icon: Icon, detail }: { label: string; value: string; icon: any; detail: string }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={17}/></span></div><div className="stat-value">{value}</div><div className="stat-foot"><span>{detail}</span></div></article>;
}
export default function DashboardClient() {
  const [query, setQuery] = useState("");
  const [agents, setAgents] = useState(initialAgents);
  const filtered = useMemo(() => agents.filter(a => [a.name,a.client,a.type].join(" ").toLowerCase().includes(query.toLowerCase())), [agents,query]);
  const toggleAgent = (name: string) => setAgents(current => current.map(a => a.name === name ? {...a,status:a.status === "Active" ? "Paused" : "Active"} : a));
  return <main className="shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><Command size={21}/></div><div><b>AgentOS</b><span>AGENT CONTROL CENTER</span></div></div>
      <div className="workspace"><div className="workspace-avatar">A</div><div><b>AgentOS workspace</b><span>Platform administrator</span></div><ShieldCheck size={15}/></div>
      <div className="nav-label">WORKSPACE</div><nav><NavItem icon={LayoutDashboard} label="Overview" active/><NavItem icon={Bot} label="AI Agents"/><NavItem icon={Users} label="Clients" href="/clients"/><NavItem icon={MessageSquare} label="Conversations"/><NavItem icon={FileText} label="Knowledge base"/><NavItem icon={Workflow} label="Workflows"/></nav>
      <div className="nav-label nav-label-spaced">MANAGEMENT</div><nav><NavItem icon={Gauge} label="Usage & analytics"/><NavItem icon={CreditCard} label="Billing"/><NavItem icon={ShieldCheck} label="Security"/></nav>
      <div className="sidebar-bottom"><nav><NavItem icon={Settings} label="Settings"/><NavItem icon={LifeBuoy} label="Help & support"/></nav><form action={signOut} className="profile"><div className="profile-avatar">AD</div><div><b>Administrator</b><span>Sign out securely</span></div><button className="signout" type="submit">↗</button></form></div>
    </aside>
    <section className="main-area"><header className="topbar"><div className="crumb"><button className="mobile-menu"><Menu size={19}/></button><span>Workspace</span><span className="slash">/</span><b>Overview</b></div><div className="top-actions"><div className="system-status"><i/> Admin session secured</div><button className="icon-button"><CircleHelp size={18}/></button><div className="top-avatar">AD</div></div></header>
      <div className="content"><div className="page-heading"><div><div className="eyebrow"><Sparkles size={13}/> YOUR AI OPERATIONS</div><h1>Welcome to AgentOS</h1><p>Manage clients and your AI operations from one workspace.</p></div><Link className="primary-button" href="/clients"><Plus size={16}/> Add client</Link></div>
        <div className="notice"><div className="notice-icon"><Zap size={17}/></div><div><b>Admin workspace secured</b><span>Client management is ready. Connect an active AgentOS Supabase project to enable live records.</span></div></div>
        <div className="stats-grid"><StatCard label="Total clients" value="—" icon={Users} detail="Live count appears after database setup"/><StatCard label="Active agents" value={agents.filter(a=>a.status==="Active").length.toString().padStart(2,"0")} icon={Bot} detail="Demo agent controls only"/><StatCard label="Conversations" value="—" icon={MessageSquare} detail="Connect the agent runtime next"/><StatCard label="AI usage" value="—" icon={Activity} detail="Usage metering not connected"/></div>
        <div className="section-grid"><section className="panel agent-panel"><div className="panel-heading"><div><h2>Agent workspace preview</h2><p>Agent runtime integration is the next milestone.</p></div></div><div className="table-toolbar"><div className="search-box"><Search size={15}/><input placeholder="Search preview agents..." value={query} onChange={e=>setQuery(e.target.value)}/></div></div><div className="agent-list">{filtered.map(agent=><div className="agent-row" key={agent.name}><div className={`agent-symbol ${agent.color}`}><Bot size={19}/></div><div className="agent-info"><b>{agent.name}</b><span>{agent.client} · {agent.type}</span></div><div className="agent-model">{agent.model}</div><div className={`status ${agent.status.toLowerCase()}`}><i/>{agent.status}</div><button className="dots" onClick={()=>toggleAgent(agent.name)} title="Toggle preview status"><MoreHorizontal size={18}/></button></div>)}</div></section>
        <section className="panel usage-panel"><div className="panel-heading"><div><h2>Platform readiness</h2><p>Implementation status</p></div></div><div className="readiness"><div><span>Admin auth UI</span><b>Implemented</b></div><div><span>Client CRUD UI</span><b>Implemented</b></div><div><span>Live Supabase DB</span><b>Awaiting project</b></div><div><span>Agent runtime</span><b>Next milestone</b></div></div></section></div>
        <footer className="footer"><span>© 2026 AgentOS</span><span><i/> Administrator area</span><span>Secure operations console</span></footer>
      </div>
    </section>
  </main>;
}

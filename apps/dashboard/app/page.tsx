"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Bot, ChevronDown, CircleHelp, Command, CreditCard, FileText, Gauge, LayoutDashboard, LifeBuoy, Menu, MessageSquare, MoreHorizontal, Plus, Search, Settings, ShieldCheck, Sparkles, Users, Workflow, Zap } from "lucide-react";

const initialAgents = [
  { name: "Travel Enquiry Assistant", client: "Lock-in Air Travels", type: "Customer support", status: "Active", conversations: 284, model: "GPT-4.1 mini", color: "blue" },
  { name: "Clinic Appointment Agent", client: "Demo Dental Clinic", type: "Appointment booking", status: "Active", conversations: 196, model: "GPT-4.1 mini", color: "violet" },
  { name: "Bridal Studio Assistant", client: "NILA Bridal Studio", type: "Lead qualification", status: "Paused", conversations: 82, model: "Gemini (planned)", color: "orange" },
];
const activity = [
  { initials: "LA", name: "Lock-in Air Travels", action: "New flight enquiry captured", time: "2 min ago", tone: "blue" },
  { initials: "DC", name: "Demo Dental Clinic", action: "Appointment request submitted", time: "18 min ago", tone: "violet" },
  { initials: "LA", name: "Lock-in Air Travels", action: "Human handoff requested", time: "42 min ago", tone: "orange" },
  { initials: "NB", name: "NILA Bridal Studio", action: "Conversation resolved", time: "1 hr ago", tone: "green" },
];

function NavItem({ icon: Icon, label, active = false, badge }: { icon: any; label: string; active?: boolean; badge?: string }) { return <button className={`nav-item ${active ? "active" : ""}`}><Icon size={17}/><span>{label}</span>{badge && <small>{badge}</small>}</button>; }
function StatCard({ label, value, change, icon: Icon, positive = true, detail }: { label: string; value: string; change: string; icon: any; positive?: boolean; detail: string }) { return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={17}/></span></div><div className="stat-value">{value}</div><div className="stat-foot"><span className={positive ? "trend up" : "trend down"}>{positive ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>} {change}</span><span>{detail}</span></div></article>; }

export default function DashboardPage() {
  const [section, setSection] = useState("Overview");
  const [query, setQuery] = useState("");
  const [agents, setAgents] = useState(initialAgents);
  const [showNotice, setShowNotice] = useState(true);
  const filtered = useMemo(() => agents.filter(a => [a.name, a.client, a.type].join(" ").toLowerCase().includes(query.toLowerCase())), [agents, query]);
  const toggleAgent = (name: string) => setAgents(current => current.map(a => a.name === name ? { ...a, status: a.status === "Active" ? "Paused" : "Active" } : a));
  const nav = (name: string) => setSection(name);
  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Command size={21}/></div><div><b>AgentOS</b><span>AGENT CONTROL CENTER</span></div></div>
      <div className="workspace"><div className="workspace-avatar">M</div><div><b>My workspace</b><span>Platform owner</span></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav><NavItem icon={LayoutDashboard} label="Overview" active={section === "Overview"}/><NavItem icon={Bot} label="AI Agents" badge="3" active={section === "AI Agents"}/><NavItem icon={Users} label="Clients" active={section === "Clients"}/><NavItem icon={MessageSquare} label="Conversations" active={section === "Conversations"}/><NavItem icon={FileText} label="Knowledge base" active={section === "Knowledge base"}/><NavItem icon={Workflow} label="Workflows" active={section === "Workflows"}/></nav>
      <div className="nav-label nav-label-spaced">MANAGEMENT</div>
      <nav><NavItem icon={Gauge} label="Usage & analytics" active={section === "Usage & analytics"}/><NavItem icon={CreditCard} label="Billing" active={section === "Billing"}/><NavItem icon={ShieldCheck} label="Security" active={section === "Security"}/></nav>
      <div className="sidebar-bottom"><nav><NavItem icon={Settings} label="Settings" active={section === "Settings"}/><NavItem icon={LifeBuoy} label="Help & support"/></nav><div className="profile"><div className="profile-avatar">MK</div><div><b>Platform Owner</b><span>owner@agentos.dev</span></div><MoreHorizontal size={17}/></div></div>
    </aside>
    <section className="main-area">
      <header className="topbar"><div className="crumb"><button className="mobile-menu"><Menu size={19}/></button><span>Workspace</span><span className="slash">/</span><b>{section}</b></div><div className="top-actions"><div className="system-status"><i/> All systems operational</div><button className="icon-button"><CircleHelp size={18}/></button><div className="top-avatar">MK</div></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow"><Sparkles size={13}/> YOUR AI OPERATIONS</div><h1>{section === "Overview" ? "Good morning, MK" : section}</h1><p>Here's what's happening across your AgentOS workspace.</p></div><button className="primary-button" onClick={() => nav("AI Agents")}><Plus size={16}/> Create agent</button></div>
        {showNotice && <div className="notice"><div className="notice-icon"><Zap size={17}/></div><div><b>Your workspace is taking shape</b><span>Connect your first client and publish an agent to start handling real conversations.</span></div><button onClick={() => setShowNotice(false)} aria-label="Dismiss">×</button></div>}
        <div className="stats-grid"><StatCard label="Total clients" value="03" change="+1 this month" icon={Users} detail="across workspace"/><StatCard label="Active agents" value={agents.filter(a => a.status === "Active").length.toString().padStart(2,"0")} change="2 providers planned" icon={Bot} detail="currently published"/><StatCard label="Conversations" value="562" change="+18.6%" icon={MessageSquare} detail="vs. previous 30 days"/><StatCard label="Estimated AI usage" value="$12.84" change="+6.2%" icon={Activity} positive={false} detail="this billing period"/></div>
        <div className="section-grid"><section className="panel agent-panel"><div className="panel-heading"><div><h2>Your agents</h2><p>Manage agents across all client workspaces.</p></div><button className="text-button" onClick={() => nav("AI Agents")}>View all <ArrowUpRight size={14}/></button></div><div className="table-toolbar"><div className="search-box"><Search size={15}/><input placeholder="Search agents or clients..." value={query} onChange={e => setQuery(e.target.value)}/></div><button className="filter-button">All agents <ChevronDown size={14}/></button></div><div className="agent-list">{filtered.map(agent => <div className="agent-row" key={agent.name}><div className={`agent-symbol ${agent.color}`}><Bot size={19}/></div><div className="agent-info"><b>{agent.name}</b><span>{agent.client} · {agent.type}</span></div><div className="agent-model">{agent.model}</div><div className={`status ${agent.status.toLowerCase()}`}><i/>{agent.status}</div><div className="agent-count">{agent.conversations}<span>chats</span></div><button className="dots" onClick={() => toggleAgent(agent.name)} title="Toggle agent status"><MoreHorizontal size={18}/></button></div>)}{filtered.length === 0 && <div className="empty">No agents match your search.</div>}</div><div className="panel-footer"><span>Showing {filtered.length} of {agents.length} agents</span><button onClick={() => nav("AI Agents")}>Manage agents <ArrowUpRight size={13}/></button></div></section>
        <section className="panel usage-panel"><div className="panel-heading"><div><h2>Usage overview</h2><p>AI requests over the last 7 days.</p></div><button className="dots"><MoreHorizontal size={18}/></button></div><div className="usage-total"><b>1,284</b><span><i/> Requests this week</span></div><div className="chart"><div className="chart-y"><span>400</span><span>300</span><span>200</span><span>100</span><span>0</span></div><div className="chart-main"><div className="grid-lines"><i/><i/><i/><i/><i/></div><svg viewBox="0 0 420 160" preserveAspectRatio="none" role="img" aria-label="AI requests trend chart"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8275f5" stopOpacity=".24"/><stop offset="100%" stopColor="#8275f5" stopOpacity="0"/></linearGradient></defs><path d="M0 128 C25 120 32 96 60 103 S95 116 120 83 S155 94 180 76 S220 88 240 58 S280 75 300 47 S340 66 360 32 S400 46 420 15 L420 160 L0 160Z" fill="url(#fill)"/><path d="M0 128 C25 120 32 96 60 103 S95 116 120 83 S155 94 180 76 S220 88 240 58 S280 75 300 47 S340 66 360 32 S400 46 420 15" fill="none" stroke="#8275f5" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg><div className="chart-x"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></div><div className="usage-legend"><span><i/> OpenAI</span><span><i/> Gemini <small>planned</small></span></div><div className="usage-bottom"><span>Monthly budget</span><b>$12.84 <small>/ $100.00</small></b></div><div className="budget-track"><i/></div></section></div>
        <section className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest events from your client agents.</p></div><button className="text-button" onClick={() => nav("Conversations")}>View activity <ArrowUpRight size={14}/></button></div><div className="activity-list">{activity.map((item, index) => <div className="activity-row" key={index}><div className={`activity-avatar ${item.tone}`}>{item.initials}</div><div className="activity-copy"><b>{item.name}</b><span>{item.action}</span></div><time>{item.time}</time><span className="activity-dot"/></div>)}</div></section>
        <footer className="footer"><span>© 2026 AgentOS</span><span><i/> Platform preview · Sample data</span><span>Built for teams that build with AI</span></footer>
      </div>
    </section>
  </main>;
}

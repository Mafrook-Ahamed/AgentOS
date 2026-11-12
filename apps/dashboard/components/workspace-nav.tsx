"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bot, FileText, LayoutDashboard, Users, MessageSquare, CreditCard } from "lucide-react";

const items = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/agents", label: "AI Agents", icon: Bot },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/usage", label: "Usage & analytics", icon: Activity },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/knowledge-base", label: "Knowledge base", icon: FileText },
];
export default function WorkspaceNav() {
  const pathname = usePathname();
  return <nav className="workspace-nav" aria-label="Workspace navigation">
    {items.map(({href,label,icon:Icon}) => {
      const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
      return <Link key={href} href={href} prefetch className={active ? "active" : ""}><Icon size={15}/><span>{label}</span></Link>;
    })}
  </nav>;
}

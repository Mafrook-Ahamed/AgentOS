import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "AgentOS — Agent Control Center", description: "Manage AI agents, clients, conversations and usage from one workspace." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

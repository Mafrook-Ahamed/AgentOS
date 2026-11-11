import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "AgentOS — Admin Console", description: "Secure platform administration for AI client workspaces." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

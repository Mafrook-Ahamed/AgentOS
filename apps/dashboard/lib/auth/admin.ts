import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function allowedAdminEmails() {
  return (process.env.AGENTOS_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email) redirect("/login");
  const allowlist = allowedAdminEmails();
  if (allowlist.length === 0 || !allowlist.includes(user.email.toLowerCase())) {
    await supabase.auth.signOut();
    redirect("/login?error=not-admin");
  }
  return { supabase, user };
}

export async function isAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const allowlist = allowedAdminEmails();
  return Boolean(user?.email && allowlist.length && allowlist.includes(user.email.toLowerCase()));
}

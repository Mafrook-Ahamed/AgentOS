"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=missing");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=invalid");
  const { data: isAdmin } = await supabase.rpc("is_agentos_admin");
  if (isAdmin === true) redirect("/");
  const { data: memberships } = await supabase.from("client_memberships").select("client_id").limit(1);
  if (memberships?.length) redirect("/portal");
  await supabase.auth.signOut();
  redirect("/login?error=no-client-access");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

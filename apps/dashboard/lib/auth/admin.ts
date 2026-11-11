import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { claims }, error } = await supabase.auth.getClaims();
  if (error || !claims?.sub) redirect("/login");
  const { data: allowed, error: adminError } = await supabase.rpc("is_agentos_admin");
  if (adminError || allowed !== true) {
    await supabase.auth.signOut();
    redirect("/login?error=not-admin");
  }
  return { supabase, userId: claims.sub };
}
export async function isAdminUser() {
  const supabase = await createClient();
  const { data: { claims }, error } = await supabase.auth.getClaims();
  if (error || !claims?.sub) return false;
  const { data, error: adminError } = await supabase.rpc("is_agentos_admin");
  return !adminError && data === true;
}

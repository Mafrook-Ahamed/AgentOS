import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const requireClient = cache(async function requireClient() {
  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  const userId = claims.data?.claims?.sub;
  if (claims.error || !userId) redirect("/login");
  const { data: admin } = await supabase.rpc("is_agentos_admin");
  if (admin === true) redirect("/");
  const { data: memberships, error } = await supabase.from("client_memberships")
    .select("client_id,role,clients(id,company,name,status)")
    .eq("user_id", userId);
  if (error || !memberships?.length) redirect("/login?error=no-client-access");
  const active = memberships.filter((item: any) => item.clients?.status === "active");
  if (!active.length) redirect("/login?error=no-client-access");
  return { supabase, userId, memberships: active };
});

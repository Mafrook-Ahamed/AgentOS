"use server";
import { createHash, randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

export async function createWidgetCredential(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const agentId = String(formData.get("agent_id") ?? "");
  const rawOrigins = String(formData.get("allowed_origins") ?? "");
  const origins = [...new Set(rawOrigins.split(/[\n,]/).map(value => value.trim()).filter(Boolean))];
  if (!agentId) throw new Error("Agent ID is required.");
  if (origins.length === 0) throw new Error("Add at least one allowed website origin.");
  if (origins.length > 20) throw new Error("Maximum 20 allowed origins.");
  for (const origin of origins) {
    let parsed: URL;
    try { parsed = new URL(origin); } catch { throw new Error("Invalid origin: " + origin); }
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin || parsed.pathname !== "/" || parsed.search || parsed.hash) {
      throw new Error("Enter origins only, such as https://example.com (no paths).");
    }
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      throw new Error("Production website origins must use HTTPS.");
    }
  }
  const { data: agent, error: agentError } = await supabase.from("agents").select("id,status").eq("id", agentId).single();
  if (agentError || !agent) throw new Error("Agent not found.");
  if (agent.status !== "active") throw new Error("Set this agent to Active before enabling its website widget.");
  const token = "aos_" + randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error } = await supabase.from("agent_widgets").upsert({
    agent_id: agentId, token_hash: tokenHash, allowed_origins: origins, enabled: true,
    created_by: userId, updated_at: new Date().toISOString(),
  }, { onConflict: "agent_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/agents/" + agentId);
  return { token, origins };
}

export async function disableWidget(formData: FormData) {
  const { supabase } = await requireAdmin();
  const agentId = String(formData.get("agent_id") ?? "");
  const { error } = await supabase.from("agent_widgets").update({ enabled: false, updated_at: new Date().toISOString() }).eq("agent_id", agentId);
  if (error) throw new Error(error.message);
  revalidatePath("/agents/" + agentId);
}

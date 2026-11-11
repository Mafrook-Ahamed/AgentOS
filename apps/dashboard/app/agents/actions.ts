"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}
const allowedModels: Record<string, string[]> = {
  openai: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"],
  gemini: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
};
function selectedModel(provider: string, model: string) {
  return allowedModels[provider]?.includes(model) ? model : allowedModels[provider]?.[0];
}

export async function createAgentRecord(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const clientId = value(formData, "client_id");
  const name = value(formData, "name");
  const description = value(formData, "description");
  const provider = value(formData, "provider");
  const model = selectedModel(provider, value(formData, "model"));
  const systemPrompt = value(formData, "system_prompt");
  const welcomeMessage = value(formData, "welcome_message");
  const temperature = Number(value(formData, "temperature") || "0.7");
  const maxTokens = Number(value(formData, "max_output_tokens") || "1024");
  if (!clientId || !name || !systemPrompt || !model) throw new Error("Complete the required fields and select a supported model.");
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2 ||
      !Number.isInteger(maxTokens) || maxTokens < 64 || maxTokens > 8192) {
    throw new Error("Temperature or output token limit is outside the allowed range.");
  }
  const { data, error } = await supabase.from("agents").insert({
    client_id: clientId, name, description, provider, model, system_prompt: systemPrompt,
    welcome_message: welcomeMessage || "Hello! How can I help you today?",
    temperature, max_output_tokens: maxTokens, created_by: userId,
  }).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/agents");
  redirect("/agents/" + data.id);
}

export async function updateAgentRecord(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = value(formData, "id");
  const name = value(formData, "name");
  const description = value(formData, "description");
  const provider = value(formData, "provider");
  const model = selectedModel(provider, value(formData, "model"));
  const systemPrompt = value(formData, "system_prompt");
  const welcomeMessage = value(formData, "welcome_message");
  const temperature = Number(value(formData, "temperature"));
  const maxTokens = Number(value(formData, "max_output_tokens"));
  if (!id || !name || !systemPrompt || !model) throw new Error("Complete the required fields and select a supported model.");
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2 ||
      !Number.isInteger(maxTokens) || maxTokens < 64 || maxTokens > 8192) {
    throw new Error("Temperature or output token limit is outside the allowed range.");
  }
  const { error } = await supabase.from("agents").update({
    name, description, provider, model, system_prompt: systemPrompt,
    welcome_message: welcomeMessage, temperature, max_output_tokens: maxTokens,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/agents");
  revalidatePath("/agents/" + id);
}

export async function updateAgentStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = value(formData, "id");
  const status = value(formData, "status");
  if (!id || !["draft", "active", "paused"].includes(status)) throw new Error("Invalid agent status.");
  const { error } = await supabase.from("agents").update({
    status, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/agents");
  revalidatePath("/agents/" + id);
}

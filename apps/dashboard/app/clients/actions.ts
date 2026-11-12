"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createClientRecord(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const name = field(formData, "name");
  const email = field(formData, "email").toLowerCase();
  const company = field(formData, "company");
  const phone = field(formData, "phone");
  const notes = field(formData, "notes");
  if (!name || !email || !company) throw new Error("Name, email and company are required.");
  const { error } = await supabase.from("clients").insert({
    name, email, company, phone: phone || null, notes: notes || null, created_by: userId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
  revalidatePath("/");
}

export async function updateClientRecord(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = field(formData, "id");
  const name = field(formData, "name");
  const email = field(formData, "email").toLowerCase();
  const company = field(formData, "company");
  const phone = field(formData, "phone");
  const notes = field(formData, "notes");
  const status = field(formData, "status");
  if (!id || !name || !email || !company || !["active", "paused", "archived"].includes(status)) {
    throw new Error("Invalid client details.");
  }
  const { error } = await supabase.from("clients").update({
    name, email, company, phone: phone || null, notes: notes || null, status,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
}

export async function deleteClientRecord(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = field(formData, "id");
  if (!id) throw new Error("Client id is required.");
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
}

export async function updateClientUsageLimit(formData: FormData) {
  const { supabase } = await requireAdmin();
  const clientId = field(formData, "client_id");
  const rawLimit = field(formData, "monthly_request_limit");
  const enabled = field(formData, "usage_limit_enabled") === "on";
  const limit = Number(rawLimit);
  if (!clientId || !Number.isInteger(limit) || limit < 1 || limit > 1000000) {
    throw new Error("Monthly request limit must be a whole number between 1 and 1,000,000.");
  }
  const { error } = await supabase.from("client_usage_limits").upsert({
    client_id: clientId, monthly_request_limit: limit, enabled, updated_at: new Date().toISOString(),
  }, { onConflict: "client_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
  revalidatePath("/usage");
}

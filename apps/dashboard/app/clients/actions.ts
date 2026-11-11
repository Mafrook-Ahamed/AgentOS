"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createClientRecord(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const name = field(formData, "name");
  const email = field(formData, "email").toLowerCase();
  const company = field(formData, "company");
  const phone = field(formData, "phone");
  const notes = field(formData, "notes");
  if (!name || !email || !company) throw new Error("Name, email and company are required.");
  const { error } = await supabase.from("clients").insert({
    name, email, company, phone: phone || null, notes: notes || null, created_by: user.id,
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

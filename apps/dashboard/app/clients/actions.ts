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

export async function createServicePlan(formData: FormData) {
  const { supabase } = await requireAdmin();
  const name = field(formData,"name");
  const description = field(formData,"description");
  const amount = Number(field(formData,"amount"));
  const currency = field(formData,"currency").toUpperCase() || "INR";
  const interval = field(formData,"billing_interval");
  const requestLimit = Number(field(formData,"monthly_request_limit"));
  if (!name || !Number.isFinite(amount) || amount < 0 || !/^[A-Z]{3}$/.test(currency) ||
      !["monthly","yearly","one_time"].includes(interval) || !Number.isInteger(requestLimit) || requestLimit < 1 || requestLimit > 1000000) {
    throw new Error("Check the plan details and try again.");
  }
  const { error } = await supabase.from("service_plans").insert({
    name,description,amount_minor:Math.round(amount*100),currency,billing_interval:interval,monthly_request_limit:requestLimit,
  });
  if(error) throw new Error(error.message);
  revalidatePath("/billing");
}
export async function assignClientSubscription(formData: FormData) {
  const { supabase } = await requireAdmin();
  const clientId=field(formData,"client_id"), planId=field(formData,"plan_id");
  const status=field(formData,"status"), end=field(formData,"current_period_end");
  if(!clientId || !["trial","active","past_due","cancelled","expired"].includes(status)) throw new Error("Invalid subscription details.");
  const {error}=await supabase.from("client_subscriptions").insert({
    client_id:clientId,plan_id:planId || null,status,current_period_end:end || null,notes:field(formData,"notes"),
  });
  if(error) throw new Error(error.message);
  if(planId) {
    const {data:plan}=await supabase.from("service_plans").select("monthly_request_limit").eq("id",planId).maybeSingle();
    if(plan) await supabase.from("client_usage_limits").upsert({client_id:clientId,monthly_request_limit:plan.monthly_request_limit,enabled:true},{onConflict:"client_id"});
  }
  revalidatePath("/billing"); revalidatePath("/clients"); revalidatePath("/usage");
}
export async function createBillingInvoice(formData: FormData) {
  const { supabase } = await requireAdmin();
  const clientId=field(formData,"client_id"), amount=Number(field(formData,"amount"));
  const currency=field(formData,"currency").toUpperCase() || "INR";
  if(!clientId || !Number.isFinite(amount) || amount<0 || !/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid invoice details.");
  const invoiceNumber="AG-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+crypto.randomUUID().slice(0,8).toUpperCase();
  const {error}=await supabase.from("billing_invoices").insert({
    client_id:clientId,invoice_number:invoiceNumber,amount_minor:Math.round(amount*100),currency,
    status:"issued",due_at:field(formData,"due_at") || null,description:field(formData,"description"),
  });
  if(error) throw new Error(error.message);
  revalidatePath("/billing");
}
export async function updateInvoiceStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id=field(formData,"id"), status=field(formData,"status"), reference=field(formData,"payment_reference");
  if(!id || !["paid","overdue","void","issued"].includes(status)) throw new Error("Invalid invoice status.");
  const {error}=await supabase.from("billing_invoices").update({
    status,paid_at:status==="paid"?new Date().toISOString():null,payment_reference:reference || null,
  }).eq("id",id);
  if(error) throw new Error(error.message);
  revalidatePath("/billing");
}

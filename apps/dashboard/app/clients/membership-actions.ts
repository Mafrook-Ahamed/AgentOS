"use server";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";
export async function linkClientUser(formData: FormData) {
 const {supabase}=await requireAdmin();
 const clientId=String(formData.get("client_id")??"").trim();
 const email=String(formData.get("email")??"").trim().toLowerCase();
 const role=String(formData.get("role")??"member");
 if(!clientId || !email || !email.includes("@")) throw new Error("Enter a valid client email.");
 const {error}=await supabase.rpc("admin_link_client_user",{p_client_id:clientId,p_email:email,p_role:role});
 if(error) throw new Error(error.message);
 revalidatePath("/clients");
 revalidatePath("/portal");
}

"use server";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";
export async function linkClientUser(formData: FormData) {
 const {supabase}=await requireAdmin();
 const clientId=String(formData.get("client_id")??"").trim();
 const email=String(formData.get("email")??"").trim().toLowerCase();
 const role=String(formData.get("role")??"member");
 if(!clientId || !email || !email.includes("@")) throw new Error("Enter a valid client email.");
 const {data,error}=await supabase.functions.invoke("client-link",{body:{client_id:clientId,email,role}});
 if(error) throw new Error(error.message);
 if(data?.error) throw new Error(data.error);
 revalidatePath("/clients");
 revalidatePath("/portal");
}

export async function inviteClientUser(formData: FormData) {
 const {supabase}=await requireAdmin();
 const clientId=String(formData.get("client_id")??"").trim();
 const email=String(formData.get("email")??"").trim().toLowerCase();
 const role=String(formData.get("role")??"member");
 if(!clientId || !email || !email.includes("@")) throw new Error("Enter a valid client email.");
 const {data,error}=await supabase.functions.invoke("client-invite",{body:{client_id:clientId,email,role}});
 if(error) throw new Error(error.message);
 if(data?.error) throw new Error(data.error);
 revalidatePath("/clients");
 revalidatePath("/portal");
}

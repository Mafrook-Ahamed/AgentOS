import { createClient } from "npm:@supabase/supabase-js@2";
const headers={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS", "Content-Type":"application/json" };
const reply=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers});
 if(req.method!=="POST") return reply({error:"Method not allowed."},405);
 const authHeader=req.headers.get("Authorization");
 if(!authHeader?.startsWith("Bearer ")) return reply({error:"Sign in required."},401);
 const url=Deno.env.get("SUPABASE_URL"), serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!serviceKey) return reply({error:"Invitation service is not configured. Check Supabase Edge Function secrets."},503);
 const adminClient=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const callerClient=createClient(url,Deno.env.get("SUPABASE_ANON_KEY")??serviceKey,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const [user,admin]=await Promise.all([callerClient.auth.getUser(),callerClient.rpc("is_agentos_admin")]);
  if(user.error||!user.data.user) return reply({error:"Session expired. Sign in again."},401);
  if(admin.error||admin.data!==true) return reply({error:"Administrator access required."},403);
  const body=await req.json();
  const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
  const clientId=typeof body.client_id==="string"?body.client_id:"";
  const role=body.role==="owner"?"owner":"member";
  if(!email||!email.includes("@")||!clientId) return reply({error:"Valid email and client are required."},400);
  const {data:client,error:clientError}=await adminClient.from("clients").select("id,company,status").eq("id",clientId).single();
  if(clientError||!client) return reply({error:"Client not found."},404);
  if(client.status!=="active") return reply({error:"Activate this client before inviting a user."},400);
  const redirectTo=Deno.env.get("CLIENT_INVITE_REDIRECT_URL");
  if(!redirectTo) return reply({error:"Set CLIENT_INVITE_REDIRECT_URL in Supabase Edge Function secrets to your deployed dashboard /auth/callback URL."},503);
  const {data:invite,error:inviteError}=await adminClient.auth.admin.inviteUserByEmail(email,{redirectTo,data:{agentos_client_id:clientId,agentos_client_role:role,agentos_company:client.company}});
  if(inviteError) {
    const alreadyExists=/already|registered|exists/i.test(inviteError.message);
    return reply({error:alreadyExists?"This email already has an account. Use Grant portal access for existing users.":inviteError.message},alreadyExists?409:400);
  }
  const invitedUser=invite.user;
  if(!invitedUser) return reply({error:"Invitation was created but no user record was returned."},500);
  const {error:membershipError}=await adminClient.from("client_memberships").upsert({client_id:clientId,user_id:invitedUser.id,role},{onConflict:"client_id,user_id"});
  if(membershipError) return reply({error:"Invitation sent, but membership linking failed. Retry granting access after the user accepts: "+membershipError.message},500);
  return reply({success:true,email,company:client.company,message:"Invitation email sent. The user can accept it and sign in to the client portal."});
 }catch(error){console.error("client-invite error",error);return reply({error:"Unexpected invitation error."},500);}
});

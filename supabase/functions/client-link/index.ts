import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in first." }, 401);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    const publishableKey = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !publishableKey || !serviceKey) return json({ error: "Function environment is incomplete." }, 500);
    const userClient = createClient(url, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const [authResult, adminResult] = await Promise.all([
      userClient.auth.getUser(),
      userClient.rpc("is_agentos_admin"),
    ]);
    if (authResult.error || !authResult.data.user) return json({ error: "Your session is invalid." }, 401);
    if (adminResult.error || adminResult.data !== true) return json({ error: "Administrator access is required." }, 403);
    const body = await request.json();
    const clientId = typeof body.client_id === "string" ? body.client_id : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = body.role === "owner" ? "owner" : body.role === "member" ? "member" : "";
    if (!clientId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !role) {
      return json({ error: "Provide a valid client, email and role." }, 400);
    }
    const serviceClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await serviceClient.rpc("admin_link_client_user", {
      p_client_id: clientId, p_email: email, p_role: role,
    });
    if (error) {
      const known = error.message.includes("No registered user") || error.message.includes("Active client not found") ||
        error.message.includes("Invalid client role");
      return json({ error: known ? error.message : "Could not grant client access." }, known ? 400 : 500);
    }
    return json({ success: true, user_id: data });
  } catch (error) {
    console.error("client-link failed", error);
    return json({ error: "Could not grant client access." }, 500);
  }
});

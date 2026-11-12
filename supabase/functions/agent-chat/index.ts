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
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in to use AgentOS." }, 401);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    const publishableKey = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !publishableKey) return json({ error: "Supabase function environment is incomplete." }, 500);

    const supabase = createClient(url, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const [authResult, adminResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.rpc("is_agentos_admin"),
    ]);
    if (authResult.error || !authResult.data.user) return json({ error: "Your session is invalid. Sign in again." }, 401);
    if (adminResult.error || adminResult.data !== true) return json({ error: "Administrator access is required." }, 403);
    const userId = authResult.data.user.id;

    const body = await request.json();
    const agentId = typeof body.agent_id === "string" ? body.agent_id : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const requestedConversationId = typeof body.conversation_id === "string" ? body.conversation_id : null;
    if (!agentId || !message || message.length > 4000) {
      return json({ error: "Provide an agent and a message under 4,000 characters." }, 400);
    }

    const { data: agent, error: agentError } = await supabase.from("agents")
      .select("id,client_id,name,system_prompt,provider,model,temperature,max_output_tokens,status")
      .eq("id", agentId).single();
    if (agentError || !agent) return json({ error: "Agent not found or access denied." }, 404);
    if (agent.status === "paused") return json({ error: "This agent is paused. Set it to draft or active to test it." }, 409);

    let conversationId = requestedConversationId;
    if (conversationId) {
      const { data: conversation, error: conversationError } = await supabase.from("agent_conversations")
        .select("id,agent_id").eq("id", conversationId).eq("agent_id", agent.id).maybeSingle();
      if (conversationError || !conversation) return json({ error: "Conversation not found." }, 404);
    } else {
      const { data: conversation, error: conversationError } = await supabase.from("agent_conversations")
        .insert({ agent_id: agent.id, client_id: agent.client_id, created_by: userId, title: message.slice(0, 80) })
        .select("id").single();
      if (conversationError || !conversation) return json({ error: "Could not start a conversation." }, 500);
      conversationId = conversation.id;
    }

    const { error: userMessageError } = await supabase.from("agent_messages")
      .insert({ conversation_id: conversationId, role: "user", content: message });
    if (userMessageError) return json({ error: "Could not save your message." }, 500);
    const { data: history, error: historyError } = await supabase.from("agent_messages")
      .select("role,content").eq("conversation_id", conversationId)
      .order("created_at", { ascending: false }).limit(12);
    if (historyError) return json({ error: "Could not load conversation history." }, 500);
    const messages = (history ?? []).reverse();

    let reply = "";
    let inputTokens = 0;
    let outputTokens = 0;
    if (agent.provider === "openai") {
      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) return json({ error: "OpenAI is selected but OPENAI_API_KEY is missing in Supabase Edge Function secrets." }, 503);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: agent.model,
          messages: [
            { role: "system", content: agent.system_prompt },
            ...messages.map((item: { role: string; content: string }) => ({ role: item.role, content: item.content })),
          ],
          temperature: Number(agent.temperature),
          max_completion_tokens: agent.max_output_tokens,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error("OpenAI request failed", response.status, result?.error?.type);
        return json({ error: result?.error?.message ?? "OpenAI could not generate a response." }, 502);
      }
      reply = result.choices?.[0]?.message?.content ?? "";
      inputTokens = result.usage?.prompt_tokens ?? 0;
      outputTokens = result.usage?.completion_tokens ?? 0;
    } else if (agent.provider === "gemini") {
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) return json({ error: "Gemini is selected but GEMINI_API_KEY is missing in Supabase Edge Function secrets." }, 503);
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(agent.model) + ":generateContent?key=" + encodeURIComponent(apiKey),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: agent.system_prompt }] },
            contents: messages.map((item: { role: string; content: string }) => ({
              role: item.role === "assistant" ? "model" : "user",
              parts: [{ text: item.content }],
            })),
            generationConfig: { temperature: Number(agent.temperature), maxOutputTokens: agent.max_output_tokens },
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        console.error("Gemini request failed", response.status, result?.error?.status);
        return json({ error: result?.error?.message ?? "Gemini could not generate a response." }, 502);
      }
      reply = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
      inputTokens = result.usageMetadata?.promptTokenCount ?? 0;
      outputTokens = result.usageMetadata?.candidatesTokenCount ?? 0;
    } else {
      return json({ error: "This AI provider is not supported." }, 400);
    }

    if (!reply.trim()) return json({ error: "The AI provider returned an empty response." }, 502);
    const { error: saveError } = await supabase.from("agent_messages").insert({
      conversation_id: conversationId, role: "assistant", content: reply,
      provider: agent.provider, model: agent.model, input_tokens: inputTokens, output_tokens: outputTokens,
    });
    if (saveError) return json({ error: "The response was generated but could not be saved." }, 500);

    const [usageResult, conversationResult] = await Promise.all([
      supabase.from("agent_usage").insert({
        agent_id: agent.id, conversation_id: conversationId, provider: agent.provider,
        model: agent.model, input_tokens: inputTokens, output_tokens: outputTokens,
      }),
      supabase.from("agent_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId),
    ]);
    if (usageResult.error) console.error("Usage record failed", usageResult.error.message);
    if (conversationResult.error) console.error("Conversation timestamp update failed", conversationResult.error.message);
    return json({ conversation_id: conversationId, reply, usage: { input_tokens: inputTokens, output_tokens: outputTokens } });
  } catch (error) {
    console.error("agent-chat failed", error);
    return json({ error: "Agent runtime failed unexpectedly. Check the Edge Function logs." }, 500);
  }
});

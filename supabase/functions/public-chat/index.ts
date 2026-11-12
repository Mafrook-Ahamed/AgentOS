import { createClient } from "npm:@supabase/supabase-js@2";

const cors = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json",
});
const response = (body: Record<string, unknown>, status: number, origin: string) =>
  new Response(JSON.stringify(body), { status, headers: cors(origin) });
const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (request: Request) => {
  const requestOrigin = request.headers.get("Origin") ?? "";
  if (request.method === "OPTIONS") return new Response("ok", { status: 204, headers: {
    "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "86400",
  }});
  if (request.method !== "POST") return response({ error: "Method not allowed." }, 405, requestOrigin || "null");
  if (!requestOrigin) return response({ error: "Website origin is required." }, 403, "null");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return response({ error: "Public chat is not configured on the server." }, 503, requestOrigin);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const body = await request.json();
    const token = typeof body.widget_token === "string" ? body.widget_token : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const requestedConversation = typeof body.conversation_id === "string" ? body.conversation_id : "";
    if (!token.startsWith("aos_") || token.length > 100 || !message || message.length > 2000) {
      return response({ error: "A valid widget token and message under 2,000 characters are required." }, 400, requestOrigin);
    }
    const tokenHash = await sha256(token);
    const { data: widget, error: widgetError } = await supabase.from("agent_widgets")
      .select("id,agent_id,allowed_origins,enabled").eq("token_hash", tokenHash).eq("enabled", true).maybeSingle();
    if (widgetError || !widget) return response({ error: "This website chat widget is invalid or disabled." }, 401, requestOrigin);
    if (!(widget.allowed_origins as string[]).includes(requestOrigin)) return response({ error: "This website is not allowed to use this widget." }, 403, "null");

    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rateKey = await sha256(tokenHash + ":" + forwarded);
    const { data: allowed, error: rateError } = await supabase.rpc("consume_agent_widget_rate_limit", {
      p_bucket_key: rateKey, p_limit: 30, p_window_seconds: 60,
    });
    if (rateError || allowed !== true) return response({ error: "Too many messages. Please wait a minute and try again." }, 429, requestOrigin);

    const { data: agent, error: agentError } = await supabase.from("agents")
      .select("id,client_id,name,system_prompt,provider,model,temperature,max_output_tokens,welcome_message,status")
      .eq("id", widget.agent_id).eq("status", "active").single();
    if (agentError || !agent) return response({ error: "This AI agent is not currently available." }, 404, requestOrigin);

    let conversationId = requestedConversation;
    if (conversationId) {
      const { data: conversation } = await supabase.from("agent_conversations").select("id")
        .eq("id", conversationId).eq("agent_id", agent.id).maybeSingle();
      if (!conversation) return response({ error: "Conversation not found." }, 404, requestOrigin);
    } else {
      const { data: conversation, error } = await supabase.from("agent_conversations")
        .insert({ agent_id: agent.id, client_id: agent.client_id, title: message.slice(0, 80) })
        .select("id").single();
      if (error || !conversation) return response({ error: "Could not start a conversation." }, 500, requestOrigin);
      conversationId = conversation.id;
    }
    const { error: saveUserError } = await supabase.from("agent_messages").insert({
      conversation_id: conversationId, role: "user", content: message,
    });
    if (saveUserError) return response({ error: "Could not save your message." }, 500, requestOrigin);

    const { data: history, error: historyError } = await supabase.from("agent_messages")
      .select("role,content").eq("conversation_id", conversationId)
      .order("created_at", { ascending: false }).limit(10);
    if (historyError) return response({ error: "Could not load conversation history." }, 500, requestOrigin);
    const messages = (history ?? []).reverse();

    let knowledge = "";
    const { count: docsCount } = await supabase.from("knowledge_documents").select("id", { count: "exact", head: true })
      .eq("client_id", agent.client_id).eq("status", "ready");
    if ((docsCount ?? 0) > 0 && Deno.env.get("OPENAI_API_KEY")) {
      const key = Deno.env.get("OPENAI_API_KEY")!;
      const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "text-embedding-3-small", input: message, dimensions: 1536 }),
      });
      const embeddingData = await embeddingResponse.json();
      if (embeddingResponse.ok && embeddingData.data?.[0]?.embedding) {
        const vector = embeddingData.data[0].embedding as number[];
        const { data: matches } = await supabase.rpc("match_knowledge_chunks", {
          query_embedding: "[" + vector.join(",") + "]", match_client_id: agent.client_id, match_count: 4,
        });
        const relevant = (matches ?? []).filter((item: { similarity: number }) => item.similarity >= 0.25);
        knowledge = relevant.map((item: { content: string }) => item.content).join("\n\n");
      }
    }
    const systemPrompt = agent.system_prompt + (knowledge ? "\n\nRelevant client knowledge. Use it when helpful and do not invent facts beyond it:\n" + knowledge : "");
    let reply = "";
    let inputTokens = 0;
    let outputTokens = 0;
    if (agent.provider === "openai") {
      const key = Deno.env.get("OPENAI_API_KEY");
      if (!key) return response({ error: "The AI provider is not configured." }, 503, requestOrigin);
      const resultResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ model: agent.model, messages: [{ role: "system", content: systemPrompt }, ...messages],
          temperature: Number(agent.temperature), max_completion_tokens: agent.max_output_tokens }),
      });
      const result = await resultResponse.json();
      if (!resultResponse.ok) return response({ error: result.error?.message ?? "AI provider request failed." }, 502, requestOrigin);
      reply = result.choices?.[0]?.message?.content ?? "";
      inputTokens = result.usage?.prompt_tokens ?? 0; outputTokens = result.usage?.completion_tokens ?? 0;
    } else if (agent.provider === "gemini") {
      const key = Deno.env.get("GEMINI_API_KEY");
      if (!key) return response({ error: "The AI provider is not configured." }, 503, requestOrigin);
      const resultResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(agent.model) + ":generateContent?key=" + encodeURIComponent(key), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: messages.map((item: { role: string; content: string }) => ({ role: item.role === "assistant" ? "model" : "user", parts: [{ text: item.content }] })),
          generationConfig: { temperature: Number(agent.temperature), maxOutputTokens: agent.max_output_tokens } }),
      });
      const result = await resultResponse.json();
      if (!resultResponse.ok) return response({ error: result.error?.message ?? "AI provider request failed." }, 502, requestOrigin);
      reply = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
      inputTokens = result.usageMetadata?.promptTokenCount ?? 0; outputTokens = result.usageMetadata?.candidatesTokenCount ?? 0;
    } else return response({ error: "Unsupported AI provider." }, 400, requestOrigin);

    if (!reply.trim()) return response({ error: "The AI provider returned an empty response." }, 502, requestOrigin);
    const { error: saveAssistantError } = await supabase.from("agent_messages").insert({
      conversation_id: conversationId, role: "assistant", content: reply, provider: agent.provider, model: agent.model,
      input_tokens: inputTokens, output_tokens: outputTokens,
    });
    if (saveAssistantError) return response({ error: "Could not save the AI response." }, 500, requestOrigin);
    await Promise.all([
      supabase.from("agent_usage").insert({ agent_id: agent.id, conversation_id: conversationId, provider: agent.provider, model: agent.model, input_tokens: inputTokens, output_tokens: outputTokens }),
      supabase.from("agent_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId),
    ]);
    return response({ conversation_id: conversationId, reply, welcome_message: agent.welcome_message }, 200, requestOrigin);
  } catch (error) {
    console.error("public-chat failed", error);
    return response({ error: "The chat service encountered an unexpected error." }, 500, requestOrigin);
  }
});

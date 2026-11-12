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

    // Atomically reserve one monthly request against this client's configured limit.
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) return json({ error: "Usage limit service is not configured." }, 503);
    const quotaService = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: quotaRows, error: quotaError } = await quotaService.rpc("reserve_client_agent_request", {
      p_client_id: agent.client_id,
    });
    if (quotaError) {
      console.error("Client usage limit check failed", quotaError.message);
      return json({ error: "Could not verify this client's monthly usage limit." }, 500);
    }
    const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
    if (!quota?.allowed) {
      return json({
        error: "This client's monthly AI request limit has been reached. Contact your AgentOS administrator to increase the limit.",
        usage_limit: { used: quota?.used ?? 0, limit: quota?.request_limit ?? 0, resets_at: quota?.resets_at ?? null },
      }, 429);
    }

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

    // Retrieve only chunks belonging to this agent's client workspace.
    let knowledgeContext = "";
    const { count: knowledgeCount } = await supabase.from("knowledge_documents")
      .select("id", { count: "exact", head: true })
      .eq("client_id", agent.client_id).eq("status", "ready");
    if ((knowledgeCount ?? 0) > 0) {
      const embeddingKey = Deno.env.get("OPENAI_API_KEY");
      if (!embeddingKey) return json({ error: "Client knowledge is configured, but OPENAI_API_KEY is missing for embeddings." }, 503);
      const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: "Bearer " + embeddingKey, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "text-embedding-3-small", input: message, dimensions: 1536 }),
      });
      const embeddingResult = await embeddingResponse.json();
      if (!embeddingResponse.ok) {
        console.error("Query embedding failed", embeddingResponse.status);
        return json({ error: "Could not search this client's knowledge base." }, 502);
      }
      const queryVector = embeddingResult.data?.[0]?.embedding as number[] | undefined;
      if (queryVector?.length) {
        const { data: matches, error: matchError } = await supabase.rpc("match_knowledge_chunks", {
          query_embedding: "[" + queryVector.join(",") + "]",
          match_client_id: agent.client_id,
          match_count: 5,
        });
        if (matchError) {
          console.error("Knowledge retrieval failed", matchError.message);
          return json({ error: "Knowledge search failed. Check the vector search migration." }, 500);
        }
        const relevant = (matches ?? []).filter((item: { similarity: number }) => item.similarity >= 0.25);
        if (relevant.length) {
          const docIds = [...new Set(relevant.map((item: { document_id: string }) => item.document_id))];
          const { data: docs } = await supabase.from("knowledge_documents").select("id,title,file_name").in("id", docIds);
          const titles = new Map((docs ?? []).map((doc: { id: string; title: string; file_name: string }) => [doc.id, doc.title || doc.file_name]));
          knowledgeContext = "\\n\\nCLIENT KNOWLEDGE (use this information when relevant; if it does not answer the question, say so):\\n" +
            relevant.map((item: { document_id: string; content: string }) => "[Source: " + (titles.get(item.document_id) ?? "Client document") + "]\\n" + item.content).join("\\n\\n");
        }
      }
    }

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
            { role: "system", content: agent.system_prompt + knowledgeContext },
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
            systemInstruction: { parts: [{ text: agent.system_prompt + knowledgeContext }] },
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

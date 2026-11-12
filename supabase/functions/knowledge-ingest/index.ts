import { createClient } from "npm:@supabase/supabase-js@2";
import { getDocument } from "npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });
function splitText(text: string, size = 1100, overlap = 140) {
  const normalized = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + size, normalized.length);
    if (end < normalized.length) {
      const boundary = Math.max(normalized.lastIndexOf("\n", end), normalized.lastIndexOf(". ", end), normalized.lastIndexOf(" ", end - 100));
      if (boundary > start + size * 0.55) end = boundary + 1;
    }
    const part = normalized.slice(start, end).trim();
    if (part) chunks.push(part);
    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}
async function extractText(bytes: Uint8Array, fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const pdf = await getDocument({ data: bytes, useSystemFonts: true }).promise;
    const pages: string[] = [];
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: { str?: string }) => item.str ?? "").join(" "));
    }
    return pages.join("\n\n");
  }
  return new TextDecoder("utf-8").decode(bytes);
}
let processingDocumentId: string | null = null;
Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return reply({ error: "Sign in required." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const keyMap = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
  const key = keyMap.default ?? Deno.env.get("SUPABASE_ANON_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!url || !key || !openaiKey) return reply({ error: "Missing Supabase or OPENAI_API_KEY Edge Function secret." }, 503);
  const supabase = createClient(url, key, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const [auth, admin] = await Promise.all([supabase.auth.getUser(), supabase.rpc("is_agentos_admin")]);
    if (auth.error || !auth.data.user) return reply({ error: "Session expired. Sign in again." }, 401);
    if (admin.error || admin.data !== true) return reply({ error: "Administrator access required." }, 403);
    const { document_id } = await request.json();
    if (typeof document_id !== "string") return reply({ error: "document_id is required." }, 400);
    processingDocumentId = document_id;
    const { data: doc, error: docError } = await supabase.from("knowledge_documents").select("id,client_id,file_name,storage_path").eq("id", document_id).single();
    if (docError || !doc) return reply({ error: "Document not found." }, 404);
    await supabase.from("knowledge_documents").update({ status: "processing", error_message: null }).eq("id", doc.id);
    const { data: file, error: downloadError } = await supabase.storage.from("agentos-knowledge").download(doc.storage_path);
    if (downloadError || !file) throw new Error("Could not download the stored document.");
    const extracted = await extractText(new Uint8Array(await file.arrayBuffer()), doc.file_name);
    if (!extracted.trim()) throw new Error("No readable text was found. Scanned PDFs need OCR and are not supported yet.");
    const chunks = splitText(extracted);
    if (!chunks.length) throw new Error("No usable text chunks were extracted.");
    const embeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += 64) {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST", headers: { Authorization: "Bearer " + openaiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "text-embedding-3-small", input: chunks.slice(i, i + 64), dimensions: 1536 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message ?? "Embedding generation failed.");
      embeddings.push(...result.data.sort((a: { index: number }, b: { index: number }) => a.index - b.index).map((item: { embedding: number[] }) => item.embedding));
    }
    await supabase.from("knowledge_chunks").delete().eq("document_id", doc.id);
    const rows = chunks.map((content, index) => ({ document_id: doc.id, client_id: doc.client_id, chunk_index: index, content, embedding: embeddings[index] }));
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase.from("knowledge_chunks").insert(rows.slice(i, i + 100));
      if (error) throw new Error("Could not save indexed chunks: " + error.message);
    }
    await supabase.from("knowledge_documents").update({ status: "ready", chunk_count: chunks.length, error_message: null, updated_at: new Date().toISOString() }).eq("id", doc.id);
    return reply({ success: true, document_id: doc.id, chunk_count: chunks.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document processing failed.";
    console.error("knowledge-ingest failed", message);
    if (processingDocumentId) {
      const url = Deno.env.get("SUPABASE_URL");
      const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
      const key = keys.default ?? Deno.env.get("SUPABASE_ANON_KEY");
      const authorization = request.headers.get("Authorization");
      if (url && key && authorization) {
        const client = createClient(url, key, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
        await client.from("knowledge_documents").update({ status: "failed", error_message: message, updated_at: new Date().toISOString() }).eq("id", processingDocumentId);
      }
    }
    return reply({ error: message }, 500);
  }
});

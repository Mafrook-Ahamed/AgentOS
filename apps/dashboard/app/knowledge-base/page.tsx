import { requireAdmin } from "@/lib/auth/admin";
import KnowledgeBaseClient from "@/components/knowledge-base-client";

export const dynamic = "force-dynamic";

export default async function KnowledgeBasePage() {
  const { supabase } = await requireAdmin();
  const [{ data: clients, error: clientsError }, { data: documents, error: documentsError }] = await Promise.all([
    supabase.from("clients").select("id,company,name").order("company"),
    supabase.from("knowledge_documents").select("id,client_id,title,file_name,mime_type,status,chunk_count,error_message,created_at").order("created_at", { ascending: false }),
  ]);
  if (clientsError) throw new Error(clientsError.message);
  if (documentsError) throw new Error(documentsError.message);
  return <KnowledgeBaseClient clients={clients ?? []} documents={documents ?? []}/>;
}

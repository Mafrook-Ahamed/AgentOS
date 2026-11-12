"use client";

import { useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, UploadCloud, Trash2, RefreshCw, BookOpen, Search } from "lucide-react";

type Client = { id: string; company: string; name: string };
type Document = { id: string; client_id: string; title: string; file_name: string; mime_type: string; status: string; chunk_count: number; error_message: string | null; created_at: string };

export default function KnowledgeBaseClient({ clients, documents: initialDocuments }: { clients: Client[]; documents: Document[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploadClientId, setUploadClientId] = useState(clients[0]?.id ?? "");
  const [filterClientId, setFilterClientId] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const supabase = useMemo(() => createClient(), []);

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadClientId || !file) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const allowed = ["application/pdf", "text/plain", "text/markdown", "text/csv"];
      if (!allowed.includes(file.type) && !/\.(pdf|txt|md|csv)$/i.test(file.name)) throw new Error("Upload a PDF, TXT, Markdown or CSV file.");
      if (file.size > 20 * 1024 * 1024) throw new Error("Maximum file size is 20 MB.");
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = uploadClientId + "/" + crypto.randomUUID() + "-" + cleanName;
      const { error: storageError } = await supabase.storage.from("agentos-knowledge").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
      if (storageError) throw storageError;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Your session expired. Sign in again.");
      const { data: doc, error: insertError } = await supabase.from("knowledge_documents").insert({
        client_id: uploadClientId, title: title.trim() || file.name, file_name: file.name,
        mime_type: file.type || "application/octet-stream", storage_path: path, uploaded_by: userData.user.id,
        status: "uploaded",
      }).select("id").single();
      if (insertError) {
        await supabase.storage.from("agentos-knowledge").remove([path]);
        throw insertError;
      }
      const { data: processed, error: processError } = await supabase.functions.invoke("knowledge-ingest", { body: { document_id: doc.id } });
      if (processError || processed?.error) throw new Error(processed?.error || processError?.message || "Document processing failed.");
      setDocuments(current => [{ id: doc.id, client_id: uploadClientId, title: title.trim() || file.name, file_name: file.name, mime_type: file.type, status: "ready", chunk_count: processed.chunk_count ?? 0, error_message: null, created_at: new Date().toISOString() }, ...current]);
      setTitle(""); setFile(null);
      const input = document.getElementById("knowledge-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setNotice("Document uploaded and indexed successfully.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally { setBusy(false); }
  }

  async function deleteDocument(doc: Document) {
    if (!window.confirm("Delete this document and its indexed chunks?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      // The server-side function removes the storage object and cascaded database records.
      const { error: deleteError } = await supabase.functions.invoke("knowledge-delete", { body: { document_id: doc.id } });
      if (deleteError) throw deleteError;
      setDocuments(current => current.filter(item => item.id !== doc.id));
      setNotice("Document deleted.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Delete failed."); }
    finally { setBusy(false); }
  }

  const visible = documents.filter(doc => !filterClientId || doc.client_id === filterClientId);
  return <main className="knowledge-page">
    <div className="knowledge-header"><div><div className="eyebrow">WORKSPACE / KNOWLEDGE</div><h1>Knowledge base</h1><p>Upload client documents and make them searchable by their AI agents.</p></div><div className="knowledge-total"><BookOpen size={18}/><b>{documents.length}</b><span>documents</span></div></div>
    <section className="knowledge-upload panel"><div className="knowledge-section-title"><span className="knowledge-icon"><UploadCloud size={19}/></span><div><h2>Add knowledge</h2><p>Supported formats: PDF, TXT, Markdown and CSV · Maximum 20 MB</p></div></div>
      {clients.length ? <form onSubmit={uploadDocument} className="knowledge-form">
        <label>Client<select value={uploadClientId} onChange={e=>setUploadClientId(e.target.value)} required>{clients.map(c=><option key={c.id} value={c.id}>{c.company} — {c.name}</option>)}</select></label>
        <label>Document title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Product catalogue (optional)"/></label>
        <label className="knowledge-file-label">Choose document<input id="knowledge-file" type="file" accept=".pdf,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv" onChange={e=>setFile(e.target.files?.[0] ?? null)} required/><small>{file ? file.name + " · " + (file.size / 1024 / 1024).toFixed(2) + " MB" : "Choose a PDF, TXT, MD or CSV file"}</small></label>
        <button className="primary-button" type="submit" disabled={busy || !file}>{busy ? <><RefreshCw size={16} className="spin"/> Processing…</> : <><UploadCloud size={16}/> Upload and index</>}</button>
      </form> : <p className="knowledge-empty">Create a client first before uploading documents.</p>}
      {notice && <p className="knowledge-success">{notice}</p>}{error && <p className="knowledge-error">{error}</p>}
    </section>
    <section className="knowledge-documents panel"><div className="knowledge-documents-head"><div><h2>Client documents</h2><p>Documents are isolated by client workspace.</p></div><label className="knowledge-filter"><Search size={15}/><select value={filterClientId} onChange={e=>setFilterClientId(e.target.value)}><option value="">All clients</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company}</option>)}</select></label></div>
      {visible.length ? <div className="knowledge-list">{visible.map(doc=><article className="knowledge-row" key={doc.id}><span className="knowledge-file-icon"><FileText size={19}/></span><div className="knowledge-doc-info"><b>{doc.title}</b><span>{doc.file_name} · {doc.chunk_count} chunks</span>{doc.error_message && <small>{doc.error_message}</small>}</div><span className={"knowledge-status " + doc.status}>{doc.status}</span><button className="knowledge-delete" disabled={busy} onClick={()=>deleteDocument(doc)} aria-label="Delete document"><Trash2 size={16}/></button></article>)}</div> : <div className="knowledge-empty"><BookOpen size={24}/><b>No documents yet</b><span>Upload your first client document to build its knowledge base.</span></div>}
    </section>
  </main>;
}

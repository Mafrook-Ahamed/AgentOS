"use client";

import { useState } from "react";
import { Copy, Globe, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { createWidgetCredential, disableWidget } from "@/app/agents/widget-actions";

export default function PublicWidgetSettings({ agentId, enabled, origins: initialOrigins }: { agentId: string; enabled: boolean; origins: string[] }) {
  const [origins, setOrigins] = useState(initialOrigins.join("\n"));
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const embed = token ? `<script src="https://YOUR-AGENTOS-DOMAIN.vercel.app/widget.js" data-agentos-token="${token}" async></script>` : "";

  async function issueCredential() {
    setBusy(true); setError(""); setNotice(""); setToken("");
    try {
      const form = new FormData();
      form.set("agent_id", agentId);
      form.set("allowed_origins", origins);
      const result = await createWidgetCredential(form);
      setToken(result.token);
      setNotice("Widget enabled. Copy the embed code now; the secret is shown only once.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not configure widget.");
    } finally { setBusy(false); }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setNotice("Copied to clipboard.");
  }

  return <section className="widget-settings-card">
    <div className="agent-config-heading"><span className="agent-card-icon"><Globe size={19}/></span><div><h2>Website chat widget</h2><p>Embed this agent on an approved client website.</p></div><span className={"widget-state " + (enabled ? "enabled" : "")}>{enabled ? "Enabled" : "Disabled"}</span></div>
    <label className="widget-origins">Allowed website origins<textarea rows={3} value={origins} onChange={e=>setOrigins(e.target.value)} placeholder={"https://client.com\nhttps://www.client.com"}/><small>One origin per line. Use HTTPS in production. No page paths.</small></label>
    <div className="widget-actions"><button type="button" className="primary-button" disabled={busy} onClick={issueCredential}>{busy ? <><RefreshCw size={15} className="spin"/> Working…</> : <><KeyRound size={15}/> {enabled ? "Rotate key and update" : "Enable widget"}</>}</button>
      {enabled && <form action={disableWidget}><input type="hidden" name="agent_id" value={agentId}/><button className="widget-disable" type="submit">Disable widget</button></form>}</div>
    {token && <div className="widget-secret"><b><ShieldCheck size={15}/> New widget secret</b><p>This token is displayed once. Rotating it invalidates the previous embed code.</p><div className="widget-code"><code>{embed}</code><button type="button" onClick={()=>copy(embed)}><Copy size={14}/> Copy</button></div></div>}
    {notice && <p className="knowledge-success">{notice}</p>}{error && <p className="knowledge-error">{error}</p>}
  </section>;
}

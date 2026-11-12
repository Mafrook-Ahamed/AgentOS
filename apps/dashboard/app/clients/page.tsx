import Link from "next/link";
import WorkspaceNav from "@/components/workspace-nav";
import { requireAdmin } from "@/lib/auth/admin";
import { createClientRecord, deleteClientRecord, updateClientRecord, updateClientUsageLimit } from "./actions";
import { inviteClientUser, linkClientUser } from "./membership-actions";
import { Building2, Mail, Phone, Plus, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const { supabase } = await requireAdmin();
  const { data: clients, error } = await supabase.from("clients")
    .select("id,name,email,company,phone,notes,status,created_at,client_usage_limits(monthly_request_limit,enabled)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return <main className="clients-page"><WorkspaceNav/>
    <div className="clients-head"><div><div className="eyebrow">WORKSPACE / CRM</div><h1>Client management</h1><p>Keep your client relationships and agent deployments organised.</p></div><Link className="back-link" href="/">← Back to overview</Link></div>
    <div className="client-metrics"><div><Users/><span>All clients</span><b>{clients?.length ?? 0}</b></div><div><Building2/><span>Active clients</span><b>{clients?.filter((c) => c.status === "active").length ?? 0}</b></div><div><Mail/><span>Contact records</span><b>{clients?.filter((c) => c.email).length ?? 0}</b></div></div>
    <section className="client-panel"><div className="client-panel-head"><div><h2>Clients</h2><p>Only platform administrators can access this list.</p></div><span className="client-count">{clients?.length ?? 0} records</span></div>
    <form action={createClientRecord} className="client-form">
      <label>Contact name<input name="name" required placeholder="e.g. Priya Sharma"/></label>
      <label>Company<input name="company" required placeholder="Company name"/></label>
      <label>Email<input name="email" type="email" required placeholder="contact@company.com"/></label>
      <label>Phone <input name="phone" type="tel" placeholder="+91..."/></label>
      <label className="wide">Notes<input name="notes" placeholder="Project scope, preferences or support notes"/></label>
      <button type="submit"><Plus size={16}/> Add client</button>
    </form>
    <div className="client-list">{clients?.length ? clients.map((client) => <article className="client-row" key={client.id}>
      <div className="client-avatar">{client.company.slice(0,1).toUpperCase()}</div><div className="client-identity"><b>{client.company}</b><span>{client.name}</span></div>
      <div className="client-contact"><span><Mail size={13}/>{client.email}</span>{client.phone && <span><Phone size={13}/>{client.phone}</span>}</div>
      <span className={`client-status ${client.status}`}>{client.status}</span>
      <details className="client-edit"><summary>Edit</summary><form action={updateClientRecord}>
        <input type="hidden" name="id" value={client.id}/>
        <label>Contact name<input name="name" required defaultValue={client.name}/></label>
        <label>Company<input name="company" required defaultValue={client.company}/></label>
        <label>Email<input name="email" type="email" required defaultValue={client.email}/></label>
        <label>Phone<input name="phone" defaultValue={client.phone ?? ""}/></label>
        <label>Notes<input name="notes" defaultValue={client.notes ?? ""}/></label>
        <label>Status<select name="status" defaultValue={client.status}><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select></label>
        <button type="submit">Save changes</button>
      </form><form action={updateClientUsageLimit} className="client-access-form"><input type="hidden" name="client_id" value={client.id}/><b>Monthly AI usage limit</b><label>Maximum requests per month<input type="number" name="monthly_request_limit" min="1" max="1000000" defaultValue={(client.client_usage_limits as any)?.[0]?.monthly_request_limit ?? 1000} required/></label><label className="usage-limit-toggle"><input type="checkbox" name="usage_limit_enabled" defaultChecked={(client.client_usage_limits as any)?.[0]?.enabled ?? true}/> Enforce monthly request limit</label><button type="submit">Save usage limit</button><small>Default: 1,000 requests per UTC calendar month. Disabled limits allow requests without a monthly cap.</small></form><form action={inviteClientUser} className="client-access-form"><input type="hidden" name="client_id" value={client.id}/><b>Invite a new client user</b><label>Email address<input type="email" name="email" required placeholder="person@company.com"/></label><label>Role<select name="role"><option value="owner">Owner</option><option value="member">Member</option></select></label><button type="submit">Send invitation email</button><small>Creates an account invitation and grants access to this client workspace.</small></form><form action={linkClientUser} className="client-access-form"><input type="hidden" name="client_id" value={client.id}/><b>Portal access</b><label>Registered user email<input type="email" name="email" required placeholder="client@example.com"/></label><label>Role<select name="role"><option value="owner">Owner</option><option value="member">Member</option></select></label><button type="submit">Grant portal access</button><small>User must register and verify this email first.</small></form></details>
      <form action={deleteClientRecord}><input type="hidden" name="id" value={client.id}/><button className="delete-client" type="submit" aria-label={`Delete ${client.company}`}>Remove</button></form>
    </article>) : <div className="clients-empty"><Users size={24}/><b>No clients yet</b><span>Add your first client to start organising AI deployments.</span></div>}</div>
    </section>
  </main>;
}

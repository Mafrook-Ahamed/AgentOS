import { signIn } from "./actions";
import { isAdminUser } from "@/lib/auth/admin";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdminUser()) redirect("/");
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: session } = await supabase.auth.getUser();
  if (session.user) {
    const { data: memberships } = await supabase.from("client_memberships").select("client_id").limit(1);
    if (memberships?.length) redirect("/portal");
  }
  const params = await searchParams;
  const message = params.error === "not-admin"
    ? "This account is not on the AgentOS administrator allowlist."
    : params.error === "invalid"
      ? "Email or password is incorrect."
      : params.error === "missing"
        ? "Enter both email and password."
        : "";
  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand"><span className="auth-mark">A</span><div><b>AgentOS</b><small>SECURE CLIENT & ADMIN ACCESS</small></div></div>
    <div className="auth-eyebrow">SECURE WORKSPACE ACCESS</div><h1>Welcome back.</h1>
    <p>Sign in with the account assigned to your AgentOS workspace.</p>
    {message && <div className="auth-error" role="alert">{message}</div>}
    <form action={signIn} className="auth-form">
      <label>Email address<input type="email" name="email" autoComplete="username" required placeholder="admin@yourcompany.com"/></label>
      <label>Password<input type="password" name="password" autoComplete="current-password" required placeholder="Your password"/></label>
      <button type="submit">Sign in to AgentOS <span>→</span></button>
    </form>
    <small className="auth-foot">Administrator access only · Protected by Supabase Auth</small>
  </section></main>;
}

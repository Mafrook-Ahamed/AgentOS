import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: admin } = await supabase.rpc("is_agentos_admin");
      if (admin === true) return NextResponse.redirect(new URL("/", url.origin));
      const { data: memberships } = await supabase.from("client_memberships").select("client_id").limit(1);
      if (memberships?.length) return NextResponse.redirect(new URL("/portal", url.origin));
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=no-client-access", url.origin));
    }
  }
  return NextResponse.redirect(new URL(next && next.startsWith("/") ? next : "/login?error=invite-link-invalid", url.origin));
}

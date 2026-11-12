import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const { invoice_id } = await request.json();
    if (typeof invoice_id !== "string") return NextResponse.json({ error: "Invoice is required." }, { status: 400 });

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!keyId || !keySecret || !siteUrl) return NextResponse.json({ error: "Razorpay is not configured. Add the server environment variables." }, { status: 503 });

    const { data: invoice, error } = await supabase.from("billing_invoices")
      .select("id,invoice_number,amount_minor,currency,status,razorpay_payment_link_id,clients(company,email)")
      .eq("id", invoice_id).single();
    if (error || !invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    if (invoice.amount_minor <= 0) return NextResponse.json({ error: "Invoices must have a positive amount to create a payment link." }, { status: 400 });
    if (invoice.status === "paid" || invoice.status === "void") return NextResponse.json({ error: "This invoice cannot be paid." }, { status: 409 });

    if (invoice.razorpay_payment_link_id) {
      const existingUrl = (await supabase.from("billing_invoices").select("razorpay_payment_link_url").eq("id", invoice_id).single()).data?.razorpay_payment_link_url;
      if (existingUrl) return NextResponse.json({ payment_url: existingUrl });
    }

    const client = invoice.clients as unknown as { company?: string; email?: string } | null;
    const response = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: invoice.amount_minor,
        currency: invoice.currency,
        accept_partial: false,
        reference_id: invoice.invoice_number,
        description: "AgentOS invoice " + invoice.invoice_number,
        customer: { name: client?.company ?? "AgentOS client", email: client?.email ?? undefined },
        notify: { email: true, sms: false },
        reminder_enable: true,
        callback_url: siteUrl.replace(/\/$/, "") + "/billing/payment-result",
        callback_method: "get",
        notes: { agentos_invoice_id: invoice.id },
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Razorpay payment link creation failed", response.status, result?.error?.code);
      return NextResponse.json({ error: "Razorpay could not create the payment link." }, { status: 502 });
    }
    const { error: saveError } = await supabase.from("billing_invoices").update({
      razorpay_payment_link_id: result.id,
      razorpay_payment_link_url: result.short_url,
      payment_provider: "razorpay",
    }).eq("id", invoice.id);
    if (saveError) return NextResponse.json({ error: "Payment link was created but could not be saved. Contact support." }, { status: 500 });
    return NextResponse.json({ payment_url: result.short_url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create payment link.";
    return NextResponse.json({ error: message }, { status: message.includes("Sign in") ? 401 : 500 });
  }
}

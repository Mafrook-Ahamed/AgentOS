import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !serviceKey) return new Response("Webhook is not configured.", { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const supplied = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer)) {
    return new Response("Invalid signature.", { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(rawBody); } catch { return new Response("Invalid JSON.", { status: 400 }); }
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  if (event.event === "payment_link.paid") {
    const link = event.payload?.payment_link?.entity;
    const payment = event.payload?.payment?.entity;
    if (!link?.id || !payment?.id) return new Response("Missing payment data.", { status: 400 });

    const { data: invoice, error } = await db.from("billing_invoices")
      .select("id,client_id,subscription_id,status,amount_minor,currency")
      .eq("razorpay_payment_link_id", link.id).maybeSingle();
    if (error) return new Response("Database lookup failed.", { status: 500 });
    if (invoice) {
      if (payment.amount !== invoice.amount_minor || payment.currency !== invoice.currency || payment.status !== "captured") {
        return new Response("Payment does not match invoice.", { status: 409 });
      }
      if (invoice.status !== "paid") {
        const { error: updateError } = await db.from("billing_invoices").update({
          status: "paid", paid_at: new Date().toISOString(), razorpay_payment_id: payment.id, payment_provider: "razorpay",
        }).eq("id", invoice.id).neq("status", "paid");
        if (updateError) return new Response("Could not update invoice.", { status: 500 });
      } else if (invoice.status === "paid") {
        const { error: paymentRecordError } = await db.from("billing_invoices").update({
          razorpay_payment_id: payment.id, payment_provider: "razorpay",
        }).eq("id", invoice.id);
        if (paymentRecordError) return new Response("Could not record payment.", { status: 500 });
      }
      // Always retry subscription activation, even if a previous webhook marked the invoice paid.
      if (invoice.subscription_id) {
        const { error: subscriptionError } = await db.from("client_subscriptions").update({
          status: "active", updated_at: new Date().toISOString(),
        }).eq("id", invoice.subscription_id);
        if (subscriptionError) return new Response("Subscription activation failed; webhook retry required.", { status: 500 });
      }
    }
  }
  return new Response("ok", { status: 200 });
}

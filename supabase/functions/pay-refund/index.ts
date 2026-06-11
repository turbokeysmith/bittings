import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey", "Access-Control-Allow-Methods": "POST, OPTIONS" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
  try {
    const { paymentIntentId, amountCents, connectedAccountId } = await req.json();
    if (!paymentIntentId) return json(400, { error: "paymentIntentId required" });
    const q = await supa.from("payment_transactions").select("*").eq("stripe_payment_intent_id", paymentIntentId).limit(1);
    const t = q.data?.[0];
    if (!t) return json(404, { error: "transaction not found" });
    if (t.status !== "completed") return json(400, { error: "only completed transactions can be refunded (status: " + t.status + ")" });
    const opts: Stripe.RequestOptions | undefined = connectedAccountId ? { stripeAccount: connectedAccountId } : undefined;
    const params: Stripe.RefundCreateParams = { payment_intent: paymentIntentId, reason: "requested_by_customer" };
    if (amountCents) params.amount = Math.round(Number(amountCents));
    const refund = await stripe.refunds.create(params, opts);
    await supa.from("payment_transactions").update({ status: "refunded", stripe_refund_id: refund.id }).eq("stripe_payment_intent_id", paymentIntentId);
    return json(200, { ok: true, refund_id: refund.id, amount: refund.amount, status: refund.status });
  } catch (e) { return json(400, { error: String((e as any)?.message ?? e) }); }
});

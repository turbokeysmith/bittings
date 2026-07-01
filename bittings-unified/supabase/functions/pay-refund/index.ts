import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, requireRole } from "../_shared/auth.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

  // --- AUTH GATE (Stage 0): only a signed-in manager/owner may refund. ---
  let auth;
  try { auth = await requireRole(req, ["manager", "owner"]); }
  catch (e) { const a = e as { status?: number; error?: string }; return json(a.status ?? 403, { error: a.error ?? "forbidden" }); }

  try {
    const { paymentIntentId, amountCents, connectedAccountId } = await req.json();
    if (!paymentIntentId) return json(400, { error: "paymentIntentId required" });
    // Tenant scope: the transaction MUST belong to the caller's shop. A cross-shop
    // PI id simply resolves to "not found" — no Stripe refund is ever issued for it.
    const q = await supa.from("payment_transactions").select("*").eq("stripe_payment_intent_id", paymentIntentId).eq("shop_id", auth.shopId).limit(1);
    const t = q.data?.[0];
    if (!t) return json(404, { error: "transaction not found" });
    // A completed sale — or one already PARTIALLY refunded — can be (further) refunded.
    if (t.status !== "completed" && t.status !== "partially_refunded") return json(400, { error: "only completed transactions can be refunded (status: " + t.status + ")" });
    // Partial-refund aware: track the running refunded total; never refund past what
    // was captured. amountCents omitted = refund the remaining balance (full refund).
    const captured = Number(t.captured_cents ?? 0);
    const already = Number(t.refunded_cents ?? 0);
    const remaining = Math.max(0, captured - already);
    if (remaining <= 0) return json(400, { error: "transaction is already fully refunded" });
    const reqAmt = amountCents ? Math.round(Number(amountCents)) : remaining;
    if (reqAmt <= 0) return json(400, { error: "refund amount must be positive" });
    if (reqAmt > remaining) return json(400, { error: `refund exceeds refundable balance (${remaining} cents remaining)` });
    const opts: Stripe.RequestOptions | undefined = connectedAccountId ? { stripeAccount: connectedAccountId } : undefined;
    const params: Stripe.RefundCreateParams = { payment_intent: paymentIntentId, reason: "requested_by_customer", amount: reqAmt };
    const refund = await stripe.refunds.create(params, opts);
    const newRefunded = already + Number(refund.amount ?? reqAmt);
    const fully = newRefunded >= captured;
    await supa.from("payment_transactions")
      .update({ status: fully ? "refunded" : "partially_refunded", refunded_cents: newRefunded, stripe_refund_id: refund.id })
      .eq("stripe_payment_intent_id", paymentIntentId).eq("shop_id", auth.shopId);
    // NOTE: full audit_log write (who/what/when) is wired in Stage 1a once the
    // audit_log table exists. acting user = auth.user.id / role = auth.role.
    return json(200, { ok: true, refund_id: refund.id, amount: refund.amount, refunded_total_cents: newRefunded, captured_cents: captured, fully_refunded: fully, status: refund.status });
  } catch (e) { return json(400, { error: String((e as any)?.message ?? e) }); }
});

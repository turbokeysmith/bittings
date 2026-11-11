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
    // Connect (destination charge): the refund is issued on the PLATFORM account;
    // reverse_transfer pulls the money back from the shop's balance and
    // refund_application_fee returns Bittings' platform fee proportionally. For a
    // non-Connect charge these are simply omitted. Client connectedAccountId ignored.
    // (8z37) DIRECT charge: the refund is issued ON the shop's connected account (the money
    // comes back out of the shop's balance) and refund_application_fee returns Bittings'
    // fee proportionally — there is no transfer to reverse.
    const isConnect = !!t.connected_account_id;
    const isDirect = isConnect && t.charge_type === "direct";
    const params: Stripe.RefundCreateParams = { payment_intent: paymentIntentId, reason: "requested_by_customer", amount: reqAmt };
    if (isDirect) {
      // Stripe rejects refund_application_fee on a charge that never had one (a 0% Pro shop),
      // so only ask for it when this payment actually carried a Bittings fee.
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {}, { stripeAccount: t.connected_account_id as string });
      if (Number(pi.application_fee_amount ?? 0) > 0) params.refund_application_fee = true;
    }
    else if (isConnect) { params.reverse_transfer = true; params.refund_application_fee = true; }
    const ropts: Stripe.RequestOptions = { idempotencyKey: `refund_${paymentIntentId}_${already}_${reqAmt}` };
    if (isDirect) ropts.stripeAccount = t.connected_account_id as string;
    // (C5) Idempotency key: a timeout after Stripe already refunded + a retry must NOT refund twice.
    // Keyed on the PI + the refunded-so-far total + the requested amount, so a *different* later
    // partial refund still goes through.
    const refund = await stripe.refunds.create(params, ropts);
    const newRefunded = already + Number(refund.amount ?? reqAmt);
    const fully = newRefunded >= captured;
    const upd = await supa.from("payment_transactions")
      .update({ status: fully ? "refunded" : "partially_refunded", refunded_cents: newRefunded, stripe_refund_id: refund.id })
      .eq("stripe_payment_intent_id", paymentIntentId).eq("shop_id", auth.shopId);
    if (upd.error) {
      // Stripe DID refund; our ledger didn't record it. Say so explicitly instead of pretending success.
      console.error("refund recorded in Stripe but ledger update failed", paymentIntentId, upd.error.message);
      return json(500, { error: "Refund issued (" + refund.id + ") but the ledger could not be updated: " + upd.error.message + ". Check Transaction History before retrying.", refund_id: refund.id });
    }
    // NOTE: full audit_log write (who/what/when) is wired in Stage 1a once the
    // audit_log table exists. acting user = auth.user.id / role = auth.role.
    return json(200, { ok: true, refund_id: refund.id, amount: refund.amount, refunded_total_cents: newRefunded, captured_cents: captured, fully_refunded: fully, status: refund.status });
  } catch (e) { return json(400, { error: String((e as any)?.message ?? e) }); }
});

// billing-webhook — Stripe tells us a Bittings subscription changed → the shop's plan row follows.
// The ONLY writer of a shop's plan besides the daily check (billing-notices). Signature-verified
// (deploy with --no-verify-jwt). 8z136 rewrite:
//   • never trusts the copy of the subscription inside the report — it asks Stripe for the
//     subscription as it is NOW, so reports arriving out of order cannot leave a wrong plan
//   • the Lookup plan and the extra-user add-on are understood; the number of users follows the plan
//   • a failed payment starts the 7 days of grace (past_due_since) and emails the owner once
//   • the end date of the founder price is recorded for the 30-day notice
// Env: STRIPE_SECRET_KEY, STRIPE_BILLING_WEBHOOK_SECRET (this endpoint's own signing secret; falls
//      back to STRIPE_WEBHOOK_SECRET), STRIPE_PRICE_LOOKUP / _STARTER / _PRO / _SEAT,
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, MAIL_FROM / BILLING_MAIL_FROM, APP_URL.
import type Stripe from "npm:stripe@16";
import { GRACE_DAYS, paymentFailedEmail } from "../_shared/billing.ts";
import { admin, APP_URL, applySubscription, ownerEmail, sendBillingMail, shopName, stripe } from "../_shared/billing-io.ts";

const SECRETS = [Deno.env.get("STRIPE_BILLING_WEBHOOK_SECRET"), Deno.env.get("STRIPE_WEBHOOK_SECRET")].map((s) => (s || "").trim()).filter(Boolean);

// deno-lint-ignore no-explicit-any
const subIdOfInvoice = (inv: any): string => {
  const s = inv?.subscription ?? inv?.parent?.subscription_details?.subscription ?? inv?.subscription_details?.subscription;
  return typeof s === "string" ? s : String(s?.id ?? "");
};

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();
  let ev: Stripe.Event | null = null, lastErr = "no signing secret configured";
  for (const wh of SECRETS) {
    try { ev = await stripe.webhooks.constructEventAsync(body, sig, wh); break; }
    catch (e) { lastErr = String((e as Error).message); }
  }
  if (!ev) return new Response("bad signature: " + lastErr, { status: 400 });

  try {
    // deno-lint-ignore no-explicit-any
    const o = ev.data.object as any;
    if (ev.type === "customer.subscription.created" || ev.type === "customer.subscription.updated" || ev.type === "customer.subscription.deleted") {
      await applySubscription(String(o.id));
    } else if (ev.type === "checkout.session.completed") {
      if (o.mode === "subscription" && o.subscription) await applySubscription(String(typeof o.subscription === "string" ? o.subscription : o.subscription.id), o.metadata?.shop_id);
    } else if (ev.type === "invoice.paid" || ev.type === "invoice.payment_succeeded") {
      const sid = subIdOfInvoice(o); if (sid) await applySubscription(sid);
    } else if (ev.type === "invoice.payment_failed") {
      const sid = subIdOfInvoice(o);
      if (sid) {
        const r = await applySubscription(sid);
        const row = r.row;
        if (r.applied && r.shopId && row && row.status === "past_due" && !row.payment_notice_sent_at) {
          const lockAt = new Date(Date.parse(row.past_due_since || new Date().toISOString()) + GRACE_DAYS * 86_400_000).toISOString();
          const sent = await sendBillingMail(r.shopId, "payment_failed", await ownerEmail(r.shopId),
            paymentFailedEmail({ shopName: await shopName(r.shopId), lockAt, appUrl: APP_URL }));
          if (sent.ok) await admin.from("subscriptions").update({ payment_notice_sent_at: new Date().toISOString() }).eq("shop_id", r.shopId);
          else console.error("payment-failed email not sent", r.shopId, sent.error);   // the daily check tries again
        }
      }
    }
  } catch (e) {
    console.error("billing-webhook handler error", ev.type, String((e as Error).message));
    return new Response("handler error: " + String((e as Error).message), { status: 500 });   // Stripe sends it again
  }
  return new Response("ok");
});

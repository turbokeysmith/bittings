import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";
import { recordLinkPayment } from "../_shared/paylink.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
// (8z37) Card charges are DIRECT charges on the shops' connected accounts, so their events
// arrive through a second Stripe endpoint with the "Connected accounts" scope, which signs
// with its own secret. Both endpoints point at this same URL; accept either signature.
const whConnectSecret = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET") ?? "";

async function setTxn(piId: string, patch: Record<string, unknown>) {
  await supa.from("payment_transactions").update(patch).eq("stripe_payment_intent_id", piId);
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature") || "";
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    // MUST use the async variant in Deno (no sync crypto). Verifies the signature.
    let ev: Stripe.Event | null = null, lastErr: unknown = null;
    for (const sec of [whSecret, whConnectSecret]) {
      if (!sec) continue;
      try { ev = await stripe.webhooks.constructEventAsync(raw, sig, sec); break; } catch (e) { lastErr = e; }
    }
    if (!ev) throw lastErr ?? new Error("no webhook secret configured");
    event = ev;
  } catch (e) {
    return new Response("bad signature: " + String((e as any)?.message ?? e), { status: 400 });
  }
  // Events about a connected account's own objects carry `account`; the object lives THERE,
  // so every follow-up Stripe call must be made as that account.
  const ao: Stripe.RequestOptions | undefined = (event as any).account ? { stripeAccount: String((event as any).account) } : undefined;

  // Idempotency + audit: record the event; duplicate event id => already handled.
  const piId = (event.data.object as any)?.id ?? (event.data.object as any)?.payment_intent ?? null;
  const ins = await supa.from("payment_events").insert({ id: event.id, type: event.type, payment_intent_id: piId, payload: event as any });
  if (ins.error && (ins.error as any).code === "23505") return new Response("duplicate", { status: 200 });

  try {
    if (event.type === "payment_intent.amount_capturable_updated") {
      // Card authorized (requires_capture). Read funding, then capture per the CREDIT-only rule.
      const pi = event.data.object as Stripe.PaymentIntent;
      const full = await stripe.paymentIntents.retrieve(pi.id, { expand: ["latest_charge"] }, ao);
      const det: any = (full.latest_charge as any)?.payment_method_details || {};
      const pmType = det.type ?? "unknown";                       // card | card_present | link | klarna | afterpay_clearpay | zip | amazon_pay | cashapp | ...
      const funding = det.card_present?.funding ?? det.card?.funding ?? "unknown";
      const brand = det.card_present?.brand ?? det.card?.brand ?? null;
      // A digital wallet shows up as a card charge with card.wallet set
      // (link / apple_pay / google_pay / amazon_pay / samsung_pay). Treat those as
      // wallets, NOT a credit card, so they are never surcharged.
      const wallet = det.card?.wallet?.type ?? null;
      const base = parseInt(full.metadata.base_cents || "0", 10);
      const surcharge = parseInt(full.metadata.surcharge_cents || "0", 10);
      // 2% applies to a genuine CREDIT CARD only — never debit/prepaid/unknown,
      // never a wallet (Link/Apple/Google/Amazon Pay), and never a BNPL/non-card
      // method (Klarna/Afterpay/Zip/Cash App Pay → their own pmType, funding "unknown").
      const isPlainCard = (pmType === "card" || pmType === "card_present") && !wallet;
      const isCredit = isPlainCard && funding === "credit";
      const captureAmount = isCredit ? base + surcharge : base;
      if (full.status === "requires_capture") {
        try {
          await stripe.paymentIntents.capture(pi.id, { amount_to_capture: captureAmount }, ao);
        } catch (capErr) {
          // (C5) A transient Stripe error used to be swallowed with a 200 — the intent stayed
          // authorized-but-uncaptured, the row 'pending', and Stripe never retried. Forget this
          // event (so the retry isn't rejected as a duplicate) and answer 500 so Stripe resends it.
          console.error("capture failed", pi.id, String((capErr as any)?.message ?? capErr));
          await supa.from("payment_events").delete().eq("id", event.id);
          return new Response("capture failed — retry", { status: 500 });
        }
      }
      await setTxn(pi.id, { status: "authorized", card_funding: funding, card_brand: brand, surcharge_applied: isCredit, captured_cents: captureAmount });
    } else if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      await setTxn(pi.id, { status: "completed", captured_cents: pi.amount_received });
      // (8b / C3 + C2) Mark the receipt Paid with what the card was ACTUALLY charged. The
      // surcharge is whatever was captured above the pre-surcharge base (credit cards only).
      try {
        const tq = await supa.from("payment_transactions").select("invoice_id, shop_id, base_cents, tax_cents, surcharge_applied").eq("stripe_payment_intent_id", pi.id).limit(1);
        let t: any = tq.data?.[0];
        // (8z75) PAY LINK: a Checkout payment has no row yet — the reader / typed-card flows write theirs
        // before the charge, a link cannot (Stripe creates the PaymentIntent only when the customer pays).
        // Only when NO row exists for this intent AND pay-link stamped it method=link. Card flows above
        // always find their row, so they never reach this.
        if (!t && !tq.error && (pi.metadata as any)?.method === "link") {
          let charge: any = null;
          try { const full = await stripe.paymentIntents.retrieve(pi.id, { expand: ["latest_charge"] }, ao); charge = full.latest_charge; } catch (_) { /* card brand is optional */ }
          try { t = await recordLinkPayment(supa, pi, (event as any).account ? String((event as any).account) : null, charge); }
          catch (recErr) {
            // The customer HAS paid but our ledger could not write it. Forget this event and answer 500
            // so Stripe sends it again (it retries for days) — same approach as a failed capture above.
            console.error("pay-link record failed", pi.id, String((recErr as any)?.message ?? recErr));
            await supa.from("payment_events").delete().eq("id", event.id);
            return new Response("pay-link record failed — retry", { status: 500 });
          }
        }
        if (t?.invoice_id && t?.shop_id) {
          const captured = Number(pi.amount_received ?? 0);
          const base = Number(t.base_cents ?? captured);
          const sur = t.surcharge_applied ? Math.max(0, captured - base) : 0;
          const mp = await supa.rpc("receipt_mark_paid", { p_receipt: t.invoice_id, p_shop: t.shop_id, p_method: "card", p_captured_cents: captured, p_surcharge_cents: sur, p_tax_cents: t.tax_cents ?? null });
          if (mp.error) console.error("receipt_mark_paid failed", t.invoice_id, mp.error.message);
        }
      } catch (e) { console.error("receipt_mark_paid threw", String((e as any)?.message ?? e)); }
    } else if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      await setTxn(pi.id, { status: "failed", failure_reason: (pi.last_payment_error as any)?.message ?? "payment failed" });
    } else if (event.type === "payment_intent.canceled") {
      await setTxn((event.data.object as Stripe.PaymentIntent).id, { status: "canceled" });
    } else if (event.type === "terminal.reader.action_failed") {
      const reader = event.data.object as any;
      const pid = reader.action?.process_payment_intent?.payment_intent;
      if (pid) await setTxn(pid, { status: "failed", failure_reason: reader.action?.failure_message ?? "reader action failed" });
    } else if (event.type === "account.application.deauthorized") {
      // The shop removed Bittings from its Stripe account (or Stripe revoked it). We can no
      // longer charge on that account — turn card payments off for the shop and forget the
      // account + its reader location so the owner can connect again cleanly.
      const gone = String((event as any).account ?? "");
      if (gone) await supa.from("shops").update({
        stripe_connect_id: null, connect_charges_enabled: false, connect_payouts_enabled: false,
        connect_onboarded_at: null, terminal_location_id: null,
      }).eq("stripe_connect_id", gone);
    } else if (event.type === "account.updated") {
      // Connect: a shop's connected account changed (onboarding progress / capability
      // toggle). Cache the authoritative charges/payouts flags on the shop so the
      // charge path can gate on them. Bound by stripe_connect_id (set at onboarding).
      const acct = event.data.object as Stripe.Account;
      await supa.from("shops").update({
        connect_charges_enabled: !!acct.charges_enabled,
        connect_payouts_enabled: !!acct.payouts_enabled,
      }).eq("stripe_connect_id", acct.id);
    }
  } catch (_e) {
    // Swallow processing errors (event is recorded for reconcile); never 500 a verified event back to Stripe.
  }
  return new Response("ok", { status: 200 });
});

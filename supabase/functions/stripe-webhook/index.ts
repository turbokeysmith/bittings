import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

async function setTxn(piId: string, patch: Record<string, unknown>) {
  await supa.from("payment_transactions").update(patch).eq("stripe_payment_intent_id", piId);
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature") || "";
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    // MUST use the async variant in Deno (no sync crypto). Verifies the signature.
    event = await stripe.webhooks.constructEventAsync(raw, sig, whSecret);
  } catch (e) {
    return new Response("bad signature: " + String((e as any)?.message ?? e), { status: 400 });
  }

  // Idempotency + audit: record the event; duplicate event id => already handled.
  const piId = (event.data.object as any)?.id ?? (event.data.object as any)?.payment_intent ?? null;
  const ins = await supa.from("payment_events").insert({ id: event.id, type: event.type, payment_intent_id: piId, payload: event as any });
  if (ins.error && (ins.error as any).code === "23505") return new Response("duplicate", { status: 200 });

  try {
    if (event.type === "payment_intent.amount_capturable_updated") {
      // Card authorized (requires_capture). Read funding, then capture per the CREDIT-only rule.
      const pi = event.data.object as Stripe.PaymentIntent;
      const full = await stripe.paymentIntents.retrieve(pi.id, { expand: ["latest_charge"] });
      const det: any = (full.latest_charge as any)?.payment_method_details || {};
      const funding = det.card_present?.funding ?? det.card?.funding ?? "unknown";
      const brand = det.card_present?.brand ?? det.card?.brand ?? null;
      const base = parseInt(full.metadata.base_cents || "0", 10);
      const surcharge = parseInt(full.metadata.surcharge_cents || "0", 10);
      const isCredit = funding === "credit";
      const captureAmount = isCredit ? base + surcharge : base;   // never surcharge debit/prepaid/unknown
      if (full.status === "requires_capture") {
        await stripe.paymentIntents.capture(pi.id, { amount_to_capture: captureAmount });
      }
      await setTxn(pi.id, { status: "authorized", card_funding: funding, card_brand: brand, surcharge_applied: isCredit, captured_cents: captureAmount });
    } else if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      await setTxn(pi.id, { status: "completed", captured_cents: pi.amount_received });
    } else if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      await setTxn(pi.id, { status: "failed", failure_reason: (pi.last_payment_error as any)?.message ?? "payment failed" });
    } else if (event.type === "payment_intent.canceled") {
      await setTxn((event.data.object as Stripe.PaymentIntent).id, { status: "canceled" });
    } else if (event.type === "terminal.reader.action_failed") {
      const reader = event.data.object as any;
      const pid = reader.action?.process_payment_intent?.payment_intent;
      if (pid) await setTxn(pid, { status: "failed", failure_reason: reader.action?.failure_message ?? "reader action failed" });
    }
  } catch (_e) {
    // Swallow processing errors (event is recorded for reconcile); never 500 a verified event back to Stripe.
  }
  return new Response("ok", { status: 200 });
});

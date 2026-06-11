import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey", "Access-Control-Allow-Methods": "POST, OPTIONS" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
  try {
    const { paymentIntentId } = await req.json();
    if (!paymentIntentId) return json(400, { error: "paymentIntentId required" });
    const q = await supa.from("payment_transactions").select("*").eq("stripe_payment_intent_id", paymentIntentId).limit(1);
    const t = q.data?.[0];
    if (!t) return json(404, { error: "transaction not found" });
    // UI feedback only — the authoritative paid state is set by the verified webhook.
    let live: string | null = null;
    if (["pending", "authorized"].includes(t.status)) {
      try { live = (await stripe.paymentIntents.retrieve(paymentIntentId)).status; } catch (_) {}
    }
    return json(200, {
      status: t.status, pi_status: live, method: t.method,
      card_funding: t.card_funding, card_brand: t.card_brand, surcharge_applied: t.surcharge_applied,
      base_cents: t.base_cents, surcharge_cents: t.surcharge_cents, captured_cents: t.captured_cents,
      failure_reason: t.failure_reason, invoice_id: t.invoice_id,
    });
  } catch (e) { return json(400, { error: String((e as any)?.message ?? e) }); }
});

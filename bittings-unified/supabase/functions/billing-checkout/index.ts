// billing-checkout — Stripe Checkout (subscription) for a tier. TEST MODE.
//
// Hardened rewrite (2026-07-02, pre-pilot review #2): the old version grabbed
// the *globally newest* subscriptions row — with multiple shops an owner's
// checkout could attach ANOTHER shop's Stripe customer and (via webhook
// metadata) flip that shop's tier. Now:
//   • requireRole(["owner"]) resolves the caller's shop SERVER-SIDE
//     (auth.shopId from shop_members) — same shared auth as the pay-* fns,
//   • the subscription row is looked up (or created) for THAT shop only,
//   • the Stripe customer + all metadata are bound to auth.shopId,
//   • CORS uses the shared origin allow-list (not "*").
//
// Env: STRIPE_SECRET_KEY (sk_test_…), STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO,
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL.
import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, requireRole } from "../_shared/auth.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const PRICE: Record<string, string | undefined> = { starter: Deno.env.get("STRIPE_PRICE_STARTER"), pro: Deno.env.get("STRIPE_PRICE_PRO") };
const APP = Deno.env.get("APP_URL") || "https://app.turbokeysmith.com";

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

  let auth;
  try { auth = await requireRole(req, ["owner"]); }
  catch (e) { const a = e as { status?: number; error?: string }; return json(a.status ?? 403, { error: a.error ?? "Only the owner can change the plan." }); }

  try {
    const { tier } = await req.json().catch(() => ({} as { tier?: string }));
    const price = PRICE[String(tier ?? "")];
    if (!price) return json(400, { error: `Billing not configured for the "${tier}" plan (Stripe test price id missing).` });

    // THIS shop's subscription row — created if the shop has never billed.
    let sub = (await admin.from("subscriptions").select("*").eq("shop_id", auth.shopId).maybeSingle()).data;
    if (!sub) {
      const ins = await admin.from("subscriptions")
        .insert({ shop_id: auth.shopId, tier: "lookup", status: "canceled" })
        .select().maybeSingle();
      if (ins.error) return json(500, { error: "could not create the billing record: " + ins.error.message });
      sub = ins.data;
    }

    // Stripe customer bound to THIS shop.
    let customer = sub?.stripe_customer_id as string | undefined;
    if (!customer) {
      const c = await stripe.customers.create({ email: auth.user.email || undefined, metadata: { shop_id: auth.shopId } });
      customer = c.id;
      await admin.from("subscriptions").update({ stripe_customer_id: customer }).eq("shop_id", auth.shopId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price, quantity: 1 }],
      success_url: `${APP}/?billing=success`,
      cancel_url: `${APP}/?billing=cancel`,
      metadata: { shop_id: auth.shopId, tier: String(tier) },
      subscription_data: { metadata: { shop_id: auth.shopId, tier: String(tier) } },
    });
    return json(200, { url: session.url });
  } catch (e) {
    return json(500, { error: String((e as Error)?.message || e) });
  }
});

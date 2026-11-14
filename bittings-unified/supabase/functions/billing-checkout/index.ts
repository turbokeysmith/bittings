// billing-checkout — Stripe Checkout (subscription) for a Bittings plan.
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
// 8z136:
//   • all three plans (Lookup, Starter, Pro) — Lookup used to be free because it had no price
//   • the founder price ($50 off, first 12 months) is applied by itself when STRIPE_COUPON_FOUNDER is
//     set and the shop has never subscribed before ("if you cancel and come back, the prices at that
//     time apply" — Terms §3)
//   • a shop that ALREADY has a subscription is sent to Stripe's billing portal instead (changing the
//     plan or the card there) — a second checkout would bill it twice
//
// Env: STRIPE_SECRET_KEY, STRIPE_PRICE_LOOKUP, STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO,
//      STRIPE_COUPON_FOUNDER (optional), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL.
import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";
import { appBase, corsHeaders, requireRole } from "../_shared/auth.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const env = (k: string) => (Deno.env.get(k) || "").trim();
const PRICE: Record<string, string> = { lookup: env("STRIPE_PRICE_LOOKUP"), starter: env("STRIPE_PRICE_STARTER"), pro: env("STRIPE_PRICE_PRO") };
const FOUNDER = env("STRIPE_COUPON_FOUNDER");

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

  let auth;
  try { auth = await requireRole(req, ["owner"]); }
  catch (e) { const a = e as { status?: number; error?: string; code?: string }; return json(a.status ?? 403, { error: a.error ?? "Only the owner can change the plan.", code: a.code }); }

  try {
    const { tier, action } = await req.json().catch(() => ({} as { tier?: string; action?: string }));

    // What this shop would be offered (for the "choose a plan" screen): which plans can be bought, and
    // whether the founder price applies. Nothing is created.
    if (action === "offer") {
      const cur = (await admin.from("subscriptions").select("stripe_subscription_id").eq("shop_id", auth.shopId).maybeSingle()).data;
      return json(200, { plans: { lookup: !!PRICE.lookup, starter: !!PRICE.starter, pro: !!PRICE.pro }, founder: !!FOUNDER && !cur?.stripe_subscription_id, founder_off: 50, founder_months: 12 });
    }

    const price = PRICE[String(tier ?? "")];
    if (!price) return json(400, { error: `Billing is not set up for the "${tier}" plan yet.`, code: "not_configured" });

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
      const shop = (await admin.from("shops").select("name").eq("id", auth.shopId).maybeSingle()).data;
      const c = await stripe.customers.create({ email: auth.user.email || undefined, name: String(shop?.name ?? "").slice(0, 120) || undefined, metadata: { shop_id: auth.shopId } });
      customer = c.id;
      await admin.from("subscriptions").update({ stripe_customer_id: customer }).eq("shop_id", auth.shopId);
    }

    // Already subscribed (paid up, or a payment waiting) → the portal: change the plan or the card there.
    const live = ["active", "trialing", "past_due"].includes(String(sub?.status)) && !!sub?.stripe_subscription_id;
    if (live) {
      const portal = await stripe.billingPortal.sessions.create({ customer, return_url: `${appBase(req)}/?billing=portal` });
      return json(200, { url: portal.url, portal: true });
    }

    const firstTime = !sub?.stripe_subscription_id;
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      customer,
      client_reference_id: auth.shopId,
      line_items: [{ price, quantity: 1 }],
      success_url: `${appBase(req)}/?billing=success`,
      cancel_url: `${appBase(req)}/?billing=cancel`,
      metadata: { shop_id: auth.shopId, tier: String(tier) },
      subscription_data: { metadata: { shop_id: auth.shopId, tier: String(tier) } },
    };
    if (FOUNDER && firstTime) {
      params.discounts = [{ coupon: FOUNDER }];
      params.custom_text = { submit: { message: "Founder price for your first 12 months, then the regular price. We email you at least 30 days before it changes. Cancel any time." } };
    }
    const session = await stripe.checkout.sessions.create(params);
    return json(200, { url: session.url, founder: !!(FOUNDER && firstTime) });
  } catch (e) {
    return json(500, { error: String((e as Error)?.message || e) });
  }
});

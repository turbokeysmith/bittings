// billing-checkout — Stripe Checkout (subscription) for a tier. TEST MODE.
// Env: STRIPE_SECRET_KEY (sk_test_…), STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO,
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL.
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const PRICE: Record<string, string | undefined> = { starter: Deno.env.get("STRIPE_PRICE_STARTER"), pro: Deno.env.get("STRIPE_PRICE_PRO") };
const APP = Deno.env.get("APP_URL") || "https://app.turbokeysmith.com";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!, srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, srk, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json(401, { error: "Sign in required." });
    const { data: isOwner } = await sb.rpc("is_owner");
    if (!isOwner) return json(403, { error: "Only the owner can change the plan." });

    const { tier } = await req.json().catch(() => ({}));
    const price = PRICE[tier];
    if (!price) return json(400, { error: `Billing not configured for the "${tier}" plan (Stripe test price id missing).` });

    const admin = createClient(url, srk);
    const { data: sub } = await admin.from("subscriptions").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    let customer = sub?.stripe_customer_id as string | undefined;
    if (!customer) {
      const c = await stripe.customers.create({ email: user.email ?? undefined, metadata: { shop_id: sub?.shop_id ?? "" } });
      customer = c.id;
      if (sub) await admin.from("subscriptions").update({ stripe_customer_id: customer }).eq("shop_id", sub.shop_id);
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price, quantity: 1 }],
      success_url: `${APP}/?billing=success`,
      cancel_url: `${APP}/?billing=cancel`,
      metadata: { shop_id: sub?.shop_id ?? "", tier },
      subscription_data: { metadata: { shop_id: sub?.shop_id ?? "", tier } },
    });
    return json(200, { url: session.url });
  } catch (e) {
    return json(500, { error: String((e as Error)?.message || e) });
  }
});

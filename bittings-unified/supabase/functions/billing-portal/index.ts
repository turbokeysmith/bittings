// billing-portal — Stripe Billing customer portal for the caller's SHOP.
// TEST MODE. Pre-pilot review C-#21: TKS_BILLING.openPortal() existed
// client-side but this function didn't. Owner-gated + shop-scoped via the
// shared auth: the portal session is created for THIS shop's Stripe customer
// (subscriptions.stripe_customer_id where shop_id = auth.shopId) — never a
// client-supplied id. Friendly 409 when the shop has never started billing.
//
// Env: STRIPE_SECRET_KEY (sk_test_…), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL.
import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, requireRole } from "../_shared/auth.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const APP = Deno.env.get("APP_URL") || "https://app.turbokeysmith.com";

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

  let auth;
  try { auth = await requireRole(req, ["owner"]); }
  catch (e) { const a = e as { status?: number; error?: string }; return json(a.status ?? 403, { error: a.error ?? "Only the owner can manage the subscription." }); }

  try {
    const sub = (await admin.from("subscriptions").select("stripe_customer_id").eq("shop_id", auth.shopId).maybeSingle()).data;
    const customer = sub?.stripe_customer_id as string | undefined;
    if (!customer) return json(409, { error: "This shop hasn't started billing yet — pick a plan first (Upgrade), then the portal can manage it." });
    const session = await stripe.billingPortal.sessions.create({ customer, return_url: `${APP}/?billing=portal` });
    return json(200, { url: session.url });
  } catch (e) {
    return json(500, { error: String((e as Error)?.message || e) });
  }
});

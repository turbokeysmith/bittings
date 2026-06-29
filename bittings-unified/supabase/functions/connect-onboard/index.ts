// connect-onboard — create/continue the shop's Stripe Connect (Express) account
// for the 1% revenue split on customer card payments. TEST MODE.
// Env: STRIPE_SECRET_KEY (sk_test_…), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL.
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
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
    if (!isOwner) return json(403, { error: "Only the owner can set up payouts." });

    const admin = createClient(url, srk);
    const { data: sub } = await admin.from("subscriptions").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    let acct = sub?.stripe_connect_id as string | undefined;
    if (!acct) {
      const a = await stripe.accounts.create({ type: "express", country: "US", email: user.email ?? undefined,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { shop_id: sub?.shop_id ?? "" } });
      acct = a.id;
      if (sub) await admin.from("subscriptions").update({ stripe_connect_id: acct }).eq("shop_id", sub.shop_id);
    }
    const account = await stripe.accounts.retrieve(acct);
    if (account.charges_enabled && account.payouts_enabled) return json(200, { connected: true, account: acct });

    const link = await stripe.accountLinks.create({
      account: acct, type: "account_onboarding",
      refresh_url: `${APP}/?connect=refresh`, return_url: `${APP}/?connect=done`,
    });
    return json(200, { url: link.url, account: acct });
  } catch (e) {
    return json(500, { error: String((e as Error)?.message || e) });
  }
});

// connect-onboard — create/continue the caller SHOP's Stripe Connect (Express)
// account so the shop gets paid directly, with a 1% platform application fee on
// customer card charges. TEST MODE.
//
// Hardened rewrite (2026-07-01): owner-gated + SHOP-SCOPED via the shared auth
// (requireRole → auth.shopId from shop_members), stores the connected-account id
// + live status on `shops` (the tenant root, phase5/5e) — NOT the old, mis-scoped
// "latest subscription" lookup. Uses the same npm:stripe@16 + CORS as the pay-*
// functions. The account.updated webhook keeps the cached status fresh.
//
// Env: STRIPE_SECRET_KEY (sk_test_…), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL.
import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, requireRole } from "../_shared/auth.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const APP = Deno.env.get("APP_URL") || "https://app.turbokeysmith.com";

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

  // Only the SHOP OWNER may set up payouts. requireRole also resolves the caller's
  // shop server-side (auth.shopId) — the connected account is bound to THAT shop.
  let auth;
  try { auth = await requireRole(req, ["owner"]); }
  catch (e) { const a = e as { status?: number; error?: string }; return json(a.status ?? 403, { error: a.error ?? "forbidden" }); }

  try {
    const shopId = auth.shopId;
    const sq = await supa.from("shops").select("id, name, stripe_connect_id").eq("id", shopId).limit(1);
    if (sq.error) return json(500, { error: "shop lookup failed: " + sq.error.message });
    const shop = sq.data?.[0];
    if (!shop) return json(404, { error: "shop not found" });

    // Create the shop's Express account on first run; reuse it after.
    let acct = shop.stripe_connect_id as string | undefined;
    if (!acct) {
      const a = await stripe.accounts.create({
        type: "express", country: "US", email: auth.user.email || undefined,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: { name: shop.name || undefined },
        metadata: { shop_id: shopId },
      });
      acct = a.id;
      await supa.from("shops").update({ stripe_connect_id: acct }).eq("id", shopId);
    }

    // Read the authoritative status from Stripe and cache it on the shop.
    const account = await stripe.accounts.retrieve(acct);
    const charges = !!account.charges_enabled, payouts = !!account.payouts_enabled;
    await supa.from("shops").update({
      connect_charges_enabled: charges,
      connect_payouts_enabled: payouts,
      connect_onboarded_at: (charges && payouts) ? new Date().toISOString() : null,
    }).eq("id", shopId);

    // Fully onboarded → done. Otherwise return a fresh hosted onboarding link.
    if (charges && payouts) return json(200, { connected: true, account: acct, charges_enabled: true, payouts_enabled: true });
    const link = await stripe.accountLinks.create({
      account: acct, type: "account_onboarding",
      refresh_url: `${APP}/?connect=refresh`, return_url: `${APP}/?connect=done`,
    });
    return json(200, { connected: false, account: acct, charges_enabled: charges, payouts_enabled: payouts, url: link.url });
  } catch (e) {
    return json(500, { error: String((e as Error)?.message || e) });
  }
});

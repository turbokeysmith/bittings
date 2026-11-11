// connect-onboard — create/continue the caller SHOP's Stripe Connect (Express)
// account so the shop gets paid directly; Bittings takes its tier-based application fee on
// customer card charges (direct charges since 8z37).
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
import { appBase, corsHeaders, requireRole } from "../_shared/auth.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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
    const body = await req.json().catch(() => ({}));
    const statusOnly = body?.action === "status";   // just report where things stand — never create or redirect
    const shopId = auth.shopId;
    const sq = await supa.from("shops").select("id, name, stripe_connect_id").eq("id", shopId).limit(1);
    if (sq.error) return json(500, { error: "shop lookup failed: " + sq.error.message });
    const shop = sq.data?.[0];
    if (!shop) return json(404, { error: "shop not found" });

    // Create the shop's Express account on first run; reuse it after.
    let acct = shop.stripe_connect_id as string | undefined;
    if (!acct && statusOnly) return json(200, { connected: false, state: "none" });
    if (!acct) {
      // (8z37) Direct charges: the shop is the merchant on its OWN Stripe account. It pays
      // Stripe's processing fees itself (fees.payer = account), Stripe carries payment
      // losses/disputes with the shop (losses.payments = stripe), and the shop gets the full
      // Stripe dashboard. Stripe advises against direct charges on legacy Express accounts,
      // which is what this created before.
      const a = await stripe.accounts.create({
        controller: { fees: { payer: "account" }, losses: { payments: "stripe" }, stripe_dashboard: { type: "full" }, requirement_collection: "stripe" },
        country: "US", email: auth.user.email || undefined,
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
    if (charges && payouts) return json(200, { connected: true, state: "connected", account: acct, charges_enabled: true, payouts_enabled: true });

    // Not live yet — say WHY in plain words. After the owner submits, Stripe checks the details
    // in the background (seconds to a few minutes) and sends them back to the app meanwhile;
    // without this the card just said "Setup incomplete" and tapping the button bounced them
    // through Stripe again with nothing to fill in.
    //   verifying  = everything is submitted, Stripe is checking it → nothing for the owner to do
    //   needs_info = Stripe is waiting on the owner (`needs` lists what, in plain words)
    const rq = (account.requirements ?? {}) as { currently_due?: string[] | null; past_due?: string[] | null; pending_verification?: string[] | null };
    const due = [...new Set([...(rq.currently_due ?? []), ...(rq.past_due ?? [])])];
    const pending = rq.pending_verification ?? [];
    const plain = (f: string): string =>
      /verification\.document|verification\.additional_document/.test(f) ? "a photo of your ID" :
      /id_number|ssn_last_4/.test(f) ? "your Social Security number" :
      /external_account/.test(f) ? "your bank account for payouts" :
      /tos_acceptance/.test(f) ? "accepting Stripe's terms" :
      /tax_id/.test(f) ? "your business tax ID (EIN)" :
      /\.dob\./.test(f) ? "your date of birth" :
      /address/.test(f) ? "your address" :
      /business_profile|company\.name|mcc|url/.test(f) ? "details about your business" :
      /phone|email|first_name|last_name/.test(f) ? "your contact details" : "a few more details";
    const needs = [...new Set(due.map(plain))];
    const state = (account.details_submitted && due.length === 0) ? "verifying" : "needs_info";
    const base = { connected: false, state, needs, pending: pending.length, account: acct, charges_enabled: charges, payouts_enabled: payouts };
    // Nothing to fill in while Stripe is checking → don't send them into Stripe just to be sent back.
    if (statusOnly || state === "verifying") return json(200, base);
    const link = await stripe.accountLinks.create({
      account: acct, type: "account_onboarding",
      // ?go=settings&connect=… → the app opens Settings → Payments on return and shows the status.
      refresh_url: `${appBase(req)}/?go=settings&connect=refresh`, return_url: `${appBase(req)}/?go=settings&connect=done`,
    });
    return json(200, { ...base, url: link.url });
  } catch (e) {
    return json(500, { error: String((e as Error)?.message || e) });
  }
});

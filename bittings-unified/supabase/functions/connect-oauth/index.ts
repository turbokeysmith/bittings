// connect-oauth — let a shop connect a Stripe account it ALREADY HAS (keeping its customers
// and payment history) instead of creating a new one through connect-onboard. (2026-11-11)
//
// Flow (Stripe "OAuth for Standard accounts"):
//   1. app → { action: "start" }  → we return Stripe's authorize URL; the owner signs in to
//      their existing Stripe account there and approves Bittings.
//   2. Stripe sends them back to APP_URL/?code=…&state=…
//   3. app → { action: "finish", code, state } → we exchange the code for the account id and
//      bind it to the caller's shop.
// Owner-only, shop-scoped (requireRole resolves the shop server-side). `state` is an HMAC over
// the caller's shop + user + time, so a code can only be finished by the same owner who
// started it, within 30 minutes — nothing is stored in between.
//
// Env: STRIPE_SECRET_KEY, STRIPE_CONNECT_CLIENT_ID (ca_… from the PLATFORM account's Connect
//      OAuth settings; without it this feature reports unavailable), APP_URL,
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//      The redirect URI is `${appBase(req)}/` — https://bittings.app/ (or https://turbokeysmith.com/staff/
//      when started from the old address); both must be listed in those same OAuth settings.
import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";
import { appBase, corsHeaders, requireRole } from "../_shared/auth.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supa = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);
const CLIENT_ID = Deno.env.get("STRIPE_CONNECT_CLIENT_ID") ?? "";
const STATE_TTL_MS = 30 * 60 * 1000;

async function sign(msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SERVICE_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
  return Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const makeState = async (shopId: string, userId: string, ts: number) => `tkoa_${ts}_${await sign(`connect-oauth|${shopId}|${userId}|${ts}`)}`;

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

  let auth;
  try { auth = await requireRole(req, ["owner"]); }
  catch (e) { const a = e as { status?: number; error?: string }; return json(a.status ?? 403, { error: a.error ?? "forbidden" }); }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    if (action === "available") return json(200, { available: !!CLIENT_ID });
    if (!CLIENT_ID) return json(409, { error: "Connecting an existing Stripe account isn't switched on yet.", code: "oauth_unavailable" });

    const sq = await supa.from("shops").select("id, stripe_connect_id, connect_charges_enabled").eq("id", auth.shopId).limit(1);
    if (sq.error) return json(503, { error: "shop lookup failed, try again" });
    const shop = sq.data?.[0];
    if (!shop) return json(404, { error: "shop not found" });
    // Never silently swap out a working payout account.
    if (shop.stripe_connect_id && shop.connect_charges_enabled) {
      return json(409, { error: "This shop already has a connected Stripe account taking card payments. Contact Bittings support to switch it to a different account.", code: "already_connected" });
    }

    if (action === "start") {
      const ts = Date.now();
      const p = new URLSearchParams({
        response_type: "code", client_id: CLIENT_ID, scope: "read_write",
        redirect_uri: `${appBase(req)}/`, state: await makeState(auth.shopId, auth.user.id, ts),
      });
      if (auth.user.email) p.set("stripe_user[email]", auth.user.email);
      return json(200, { url: `https://connect.stripe.com/oauth/authorize?${p.toString()}` });
    }

    if (action === "finish") {
      const code = String(body?.code ?? ""), state = String(body?.state ?? "");
      const m = /^tkoa_(\d{10,16})_([0-9a-f]{64})$/.exec(state);
      if (!code || !m) return json(400, { error: "That Stripe sign-in link wasn't valid. Tap the button to try again.", code: "bad_state" });
      const ts = Number(m[1]);
      if (Date.now() - ts > STATE_TTL_MS || ts > Date.now() + 60_000) return json(400, { error: "That Stripe sign-in took too long. Tap the button to try again.", code: "expired_state" });
      if (state !== await makeState(auth.shopId, auth.user.id, ts)) return json(403, { error: "That Stripe sign-in was started from a different login. Tap the button to try again.", code: "bad_state" });

      let acctId = "";
      try {
        const tok = await stripe.oauth.token({ grant_type: "authorization_code", code });
        acctId = String(tok.stripe_user_id ?? "");
      } catch (e) {
        return json(400, { error: "Stripe didn't accept the connection: " + String((e as { message?: string })?.message ?? e), code: "token_failed" });
      }
      if (!/^acct_[A-Za-z0-9]+$/.test(acctId)) return json(400, { error: "Stripe didn't return an account. Tap the button to try again.", code: "token_failed" });

      // One Stripe account = one shop. (Service role bypasses RLS, so check explicitly.)
      const dup = await supa.from("shops").select("id").eq("stripe_connect_id", acctId).neq("id", auth.shopId).limit(1);
      if (dup.data?.[0]) return json(409, { error: "That Stripe account is already connected to another Bittings shop.", code: "account_in_use" });

      const account = await stripe.accounts.retrieve(acctId);
      const charges = !!account.charges_enabled, payouts = !!account.payouts_enabled;
      const up = await supa.from("shops").update({
        stripe_connect_id: acctId,
        connect_charges_enabled: charges, connect_payouts_enabled: payouts,
        connect_onboarded_at: (charges && payouts) ? new Date().toISOString() : null,
        // A reader location belongs to one Stripe account; any old one is for a different account.
        terminal_location_id: null,
      }).eq("id", auth.shopId);
      if (up.error) return json(500, { error: "Connected in Stripe, but saving it failed: " + up.error.message + ". Tap the button again." });
      await supa.from("audit_log").insert({ user_id: auth.user.id, role: auth.role, action: "connect_existing_stripe", entity_type: "shop", entity_id: auth.shopId, shop_id: auth.shopId, detail: { account: acctId, replaced: shop.stripe_connect_id ?? null } });
      return json(200, { connected: charges && payouts, account: acctId, charges_enabled: charges, payouts_enabled: payouts });
    }
    return json(400, { error: "unknown action" });
  } catch (e) {
    return json(500, { error: String((e as Error)?.message || e) });
  }
});

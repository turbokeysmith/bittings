import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";
import { appBase, corsHeaders, requireStaff } from "../_shared/auth.ts";
import { authoritativeTotals, descOf, linkKey, receiptPaid, sameKey, techOf } from "../_shared/paylink.ts";

// ============================================================================
// pay-link (8z75, owner 2026-11-12): "send the customer a link to pay when we are out in the field".
// ----------------------------------------------------------------------------
// Deployed with --no-verify-jwt because the customer's phone is not signed in. Each action checks
// who is calling itself:
//   create    STAFF (Bearer session, any active staff — same rule as taking a card payment).
//             Returns the link's key for one unpaid invoice of the caller's shop. Creates nothing in
//             Stripe; the link never expires and always charges what the invoice says at that moment.
//   info      PUBLIC, needs the link's key. What the pay page shows: shop, invoice number, amount, paid?
//   checkout  PUBLIC, needs the link's key. Makes a Stripe Checkout page for the invoice's current
//             total ON THE SHOP'S OWN Stripe account and returns its address.
// The key is an HMAC of shop + invoice (see _shared/paylink.ts) — a guessed invoice id gets a 404.
// No 2% surcharge on a link (owner decision). The payment is recorded by stripe-webhook when
// Stripe reports payment_intent.succeeded (metadata.method = "link").
// ============================================================================

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SECRET = Deno.env.get("PAY_LINK_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ID_OK = /^[A-Za-z0-9_.:\-]{3,80}$/;

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json", "cache-control": "no-store" } });
  if (req.method !== "POST") return json(405, { error: "POST only" });
  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "bad request" }); }
  const action = String(body?.action || "");

  try {
    // ------------------------------------------------------------------ staff: get a link
    if (action === "create") {
      let auth;
      try { auth = await requireStaff(req); }
      catch (e) { const er = e as { status?: number; error?: string }; return json(er.status ?? 401, { error: er.error ?? "unauthorized" }); }
      const invoiceId = String(body.invoiceId || "").trim();
      if (!ID_OK.test(invoiceId)) return json(400, { error: "invoiceId required" });
      const shopRow = await supa.from("shops").select("stripe_connect_id, connect_charges_enabled").eq("id", auth.shopId).limit(1);
      if (shopRow.error) return json(503, { error: "shop lookup failed, try again" });
      if (!shopRow.data?.[0]?.stripe_connect_id || !shopRow.data?.[0]?.connect_charges_enabled) {
        return json(409, { error: "This shop hasn't finished connecting Stripe yet — connect a payout account in Settings → Payments to take card payments.", code: "connect_required" });
      }
      const r = await supa.from("receipts").select("id, data, deleted_at").eq("id", invoiceId).eq("shop_id", auth.shopId).limit(1);
      if (r.error) return json(500, { error: "invoice lookup failed: " + r.error.message });
      const rec = r.data?.[0] as any;
      if (!rec || rec.deleted_at) return json(404, { error: "invoice not found in cloud (is it saved and synced?)" });
      if (String(rec.data?.docType || "") === "estimate") return json(400, { error: "An estimate can't be paid — make it an invoice first." });
      if (receiptPaid(rec.data)) return json(409, { error: "This invoice is already paid.", code: "already_paid" });
      const { base_cents } = authoritativeTotals(rec.data);
      if (base_cents < 50) return json(400, { error: "The invoice total must be at least $0.50." });
      const k = await linkKey(SECRET, auth.shopId, invoiceId);
      return json(200, { ok: true, i: invoiceId, k, amount_cents: base_cents, number: rec.data?.number ?? null });
    }

    // ------------------------------------------------------------------ public: needs the key
    if (action !== "info" && action !== "checkout") return json(400, { error: "unknown action" });
    const i = String(body.i || "").trim(), k = String(body.k || "").trim();
    const NOPE = { error: "This payment link isn't valid. Ask the shop for a new one.", code: "not_found" };
    if (!ID_OK.test(i) || !/^[A-Za-z0-9_\-]{20,40}$/.test(k)) return json(404, NOPE);
    const r = await supa.from("receipts").select("id, shop_id, data, deleted_at").eq("id", i).limit(2);
    if (r.error) return json(503, { error: "Couldn't look up the invoice — please try again." });
    if (!r.data || r.data.length !== 1) return json(404, NOPE);
    const rec = r.data[0] as any;
    if (!sameKey(await linkKey(SECRET, String(rec.shop_id), i), k)) return json(404, NOPE);

    const shopRow = await supa.from("shops").select("name, stripe_connect_id, connect_charges_enabled, platform_fee_bps").eq("id", rec.shop_id).limit(1);
    if (shopRow.error) return json(503, { error: "Couldn't look up the shop — please try again." });
    const shop = shopRow.data?.[0] as any;
    let phone = "";
    try { const c = await supa.from("shop_config").select("data").eq("shop_id", rec.shop_id).limit(1); phone = String((c.data?.[0] as any)?.data?.identity?.phone ?? ""); } catch (_) { /* optional */ }
    const data = rec.data || {};
    const gone = !!rec.deleted_at || String(data.docType || "") === "estimate";
    // paid = the document says so, or a completed payment for it is on file (the webhook may be a moment ahead of the document)
    let paid = receiptPaid(data);
    if (!paid) {
      const tq = await supa.from("payment_transactions").select("id").eq("invoice_id", i).eq("shop_id", rec.shop_id).in("status", ["completed", "partially_refunded"]).limit(1);
      paid = !!(tq.data && tq.data[0]);
    }
    const { base_cents, tax_cents } = authoritativeTotals(data);
    const canPay = !!(shop?.stripe_connect_id && shop?.connect_charges_enabled) && base_cents >= 50;
    const number = String(data.number || "");

    if (action === "info") {
      return json(200, { ok: true, shop: String(shop?.name || ""), phone, number, amount_cents: paid ? Math.round(Number(data?.totals?.total ?? 0) * 100) || base_cents : base_cents, paid, gone, canPay });
    }

    // checkout
    if (gone) return json(410, { error: "This invoice is no longer available. Please call the shop.", code: "gone" });
    if (paid) return json(200, { ok: true, paid: true });
    if (!canPay) return json(409, { error: "Card payment isn't available for this invoice right now. Please call the shop.", code: "unavailable" });

    // Bittings' platform fee — the same rule as pay-create-intent (pinned per shop, else by plan).
    const subRow = await supa.from("subscriptions").select("tier").eq("shop_id", rec.shop_id).order("updated_at", { ascending: false }).limit(1);
    const tier = String(subRow.data?.[0]?.tier ?? "").toLowerCase();
    const pinned = shop?.platform_fee_bps;
    const feeBps = (typeof pinned === "number" && pinned >= 0 && pinned <= 1000) ? pinned : (tier === "pro" ? 0 : 100);
    const fee_cents = Math.round(base_cents * feeBps / 10000);

    const page = appBase(req) + "/pay.html?i=" + encodeURIComponent(i) + "&k=" + encodeURIComponent(k);
    const email = String(data.email || "").trim();
    const pid: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {
      description: `Invoice ${number || i}`,
      metadata: {
        invoice_id: i, shop_id: String(rec.shop_id), method: "link", base_cents: String(base_cents), tax_cents: String(tax_cents),
        surcharge_cents: "0", surcharge_policy: "none_pay_link", platform_fee_cents: String(fee_cents),
        technician: String(techOf(data) || "").slice(0, 120),
      },
    };
    if (fee_cents > 0) pid.application_fee_amount = fee_cents;
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],   // cards (incl. Apple Pay / Google Pay). No pay-later methods: the total is paid in full now.
      submit_type: "pay",
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: base_cents, product_data: { name: `Invoice ${number || i}`, description: descOf(data).slice(0, 240) } } }],
      payment_intent_data: pid,
      metadata: { invoice_id: i, shop_id: String(rec.shop_id) },
      success_url: page + "&done=1",
      cancel_url: page,
    };
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) params.customer_email = email;
    const session = await stripe.checkout.sessions.create(params, { stripeAccount: String(shop.stripe_connect_id) });
    if (!session.url) return json(502, { error: "Stripe didn't return a payment page — please try again." });
    return json(200, { ok: true, url: session.url });
  } catch (e) {
    console.error("pay-link", action, String((e as any)?.message ?? e));
    return json(400, { error: action === "create" ? String((e as any)?.message ?? e) : "Something went wrong starting the payment — please try again, or call the shop." });
  }
});

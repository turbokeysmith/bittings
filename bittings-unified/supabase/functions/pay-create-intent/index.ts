import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireStaff } from "../_shared/auth.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const SURCHARGE_PCT = 0.02; // 2% Oklahoma SB 677 cap — CREDIT ONLY (enforced at capture in the webhook)
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey", "Access-Control-Allow-Methods": "POST, OPTIONS" };

function uidFromJwt(req: Request): string | null {
  const m = (req.headers.get("authorization") || "").match(/^Bearer (.+)$/i);
  if (!m) return null;
  try { const p = JSON.parse(atob(m[1].split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); return p.sub ?? null; } catch { return null; }
}
function descOf(data: any): string {
  const lbl = (data?.items && data.items[0] && data.items[0].desc) || data?.docType || "Payment";
  const cust = data?.customer || "";
  return cust ? (lbl + " — " + cust) : lbl;
}
// COGS for the sale, read SERVER-SIDE from the stored receipt (the client never
// sends cost). Sum of each non-discount line's captured cost (qty already folded
// into line `cost` by the builder). null when nothing was captured.
function costCentsOf(data: any): number | null {
  const its = Array.isArray(data?.items) ? data.items : [];
  let any = false, sum = 0;
  for (const it of its) {
    if (it?.isDiscount) continue;
    const c = Number(it?.cost);
    if (!isNaN(c) && c > 0) { sum += c; any = true; }
  }
  return any ? Math.round(sum * 100) : null;
}
function techOf(data: any): string | null {
  const t = (data?.technician ?? "").toString().trim();
  return t ? t : null;
}
// AUTHORITATIVE total — recomputed server-side from the receipt's line items and
// its tax rate (the client never sends an amount; tax is NOT trusted from the
// client). Mirrors computeTotals() in bittings.html exactly (verified parity).
// Order of operations: tax taxable goods → add to the bill (base) → the 2%
// credit-only surcharge is applied on `base` later, at capture. Returns the
// pre-surcharge base and the pass-through tax, both in integer cents.
function authoritativeTotals(data: any): { base_cents: number; tax_cents: number } {
  const items = Array.isArray(data?.items) ? data.items : [];
  if (!items.length) { // legacy / non-itemized receipt → trust stored totals (minus est. surcharge)
    const t = data?.totals || {};
    const base = Math.max(0, Number(t.total ?? data?.amount ?? 0) - Number(t.surcharge ?? 0));
    return { base_cents: Math.round(base * 100), tax_cents: Math.round(Math.max(0, Number(t.tax ?? 0)) * 100) };
  }
  const taxRate = Number(data?.taxRate ?? 0) / 100;
  let taxable = 0, nontax = 0;
  for (const it of items) { if (it?.isDiscount) continue; const a = Number(it?.amount) || 0; if (it?.taxable) taxable += a; else nontax += a; }
  const gross = taxable + nontax;
  let disc = 0;
  for (const it of items) { if (!it?.isDiscount) continue; disc += it.discountMode === "percent" ? gross * ((Number(it.discountValue) || 0) / 100) : (Number(it.discountValue) || 0); }
  if (disc > gross) disc = gross;
  disc = Math.round(disc * 100) / 100;
  let dT = 0, dN = 0;
  if (gross > 0 && disc > 0) { dT = disc * (taxable / gross); dN = disc * (nontax / gross); }
  const taxableAfter = Math.max(0, taxable - dT);
  const subtotal = Math.round((taxableAfter + Math.max(0, nontax - dN)) * 100) / 100;
  const tax = Math.round(taxableAfter * taxRate * 100) / 100;
  return { base_cents: Math.round((subtotal + tax) * 100), tax_cents: Math.round(tax * 100) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
  // Auth: any ACTIVE staff may start a card charge (owner decision); reject anon/expired.
  let auth;
  try { auth = await requireStaff(req); }
  catch (e) { const er = e as { status?: number; error?: string }; return json(er.status ?? 401, { error: er.error ?? "unauthorized" }); }
  try {
    const body = await req.json();
    const invoiceId = String(body.invoiceId || "").trim();
    const method = body.method === "keyed" ? "keyed" : "reader";
    const readerId = body.readerId ? String(body.readerId) : null;
    const attempt = parseInt(String(body.attempt ?? "1"), 10) || 1;
    const orgId = body.orgId ?? null;                       // future multi-tenant (null = single-shop)
    const connectedAccountId = body.connectedAccountId ?? null; // future Connect (null = single-account)
    if (!invoiceId) return json(400, { error: "invoiceId required" });
    if (method === "reader" && !readerId) return json(400, { error: "readerId required for reader method" });

    const idempotency_key = `inv_${invoiceId}_attempt_${attempt}`;
    const ex = await supa.from("payment_transactions").select("*").eq("idempotency_key", idempotency_key).limit(1);
    if (ex.data && ex.data[0]) {
      const t = ex.data[0];
      let clientSecret: string | undefined;
      if (method === "keyed") { try { clientSecret = (await stripe.paymentIntents.retrieve(t.stripe_payment_intent_id)).client_secret ?? undefined; } catch (_) {} }
      return json(200, { ok: true, reused: true, paymentIntentId: t.stripe_payment_intent_id, clientSecret, base_cents: t.base_cents, surcharge_cents: t.surcharge_cents, authorized_cents: t.authorized_cents, disclosure: "A 2% surcharge applies to CREDIT cards only (debit/prepaid are not surcharged)." });
    }

    const r = await supa.from("receipts").select("id,data").eq("id", invoiceId).limit(1);
    if (r.error) return json(500, { error: "receipt lookup failed: " + r.error.message });
    const rec = r.data?.[0];
    if (!rec) return json(404, { error: "invoice not found in cloud (is the receipt synced to Supabase?)" });
    const { base_cents, tax_cents } = authoritativeTotals((rec as any).data);
    if (base_cents < 50) return json(400, { error: "invoice base must be at least $0.50" });
    const surcharge_cents = Math.round(base_cents * SURCHARGE_PCT);
    const authorized_cents = base_cents + surcharge_cents;

    const reqOpts: Stripe.RequestOptions = { idempotencyKey: idempotency_key };
    if (connectedAccountId) reqOpts.stripeAccount = connectedAccountId;
    const piParams: Stripe.PaymentIntentCreateParams = {
      amount: authorized_cents, currency: "usd", capture_method: "manual",
      description: `Invoice ${invoiceId}`,
      metadata: { invoice_id: invoiceId, base_cents: String(base_cents), surcharge_cents: String(surcharge_cents), surcharge_policy: "credit_only_2pct", method, created_by: auth.user.id },
    };
    if (method === "reader") piParams.payment_method_types = ["card_present"];
    else piParams.automatic_payment_methods = { enabled: true };

    const pi = await stripe.paymentIntents.create(piParams, reqOpts);

    await supa.from("payment_transactions").insert({
      invoice_id: invoiceId, org_id: orgId, connected_account_id: connectedAccountId,
      method, currency: "usd", base_cents, surcharge_cents, authorized_cents,
      reader_id: readerId, stripe_payment_intent_id: pi.id, status: "pending",
      description: descOf((rec as any).data), cost_cents: costCentsOf((rec as any).data),
      technician: techOf((rec as any).data), tax_cents,
      idempotency_key, created_by: auth.user.id,
    });

    if (method === "reader") {
      const po: Stripe.RequestOptions | undefined = connectedAccountId ? { stripeAccount: connectedAccountId } : undefined;
      await stripe.terminal.readers.processPaymentIntent(readerId!, { payment_intent: pi.id }, po);
    }

    return json(200, { ok: true, paymentIntentId: pi.id, clientSecret: method === "keyed" ? pi.client_secret : undefined, base_cents, surcharge_cents, authorized_cents, disclosure: "A 2% surcharge applies to CREDIT cards only (debit/prepaid are not surcharged)." });
  } catch (e) {
    return json(400, { error: String((e as any)?.message ?? e) });
  }
});

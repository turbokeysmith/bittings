// ============================================================================
// Pay-by-link (8z75, owner 2026-11-12): shared pieces for `pay-link` and `stripe-webhook`.
// ----------------------------------------------------------------------------
// A pay link is a page the customer opens on their own phone to pay ONE invoice by card
// (Stripe Checkout, on the shop's own Stripe account — a direct charge, like the reader).
// Owner decision: NO 2% surcharge on a link (a link cannot tell credit from debit before
// the customer pays; the reader and the typed-card screen keep the surcharge).
//
// This file has no Deno-only imports on purpose, so tools/qa/paylink-unit-test.mjs can run
// the exact same code under Node with a stand-in database.
// ============================================================================

// ---- the link's key: proves a link was issued by us for this shop + invoice ----
// HMAC-SHA256(secret, "paylink:v1:<shop>:<invoice>") → 26 url-safe characters (156 bits).
export async function linkKey(secret: string, shopId: string, invoiceId: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode("paylink:v1:" + shopId + ":" + invoiceId)));
  let b = ""; for (let i = 0; i < sig.length; i++) b += String.fromCharCode(sig[i]);
  return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "").slice(0, 26);
}
// compare without leaking where the first difference is
export function sameKey(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export function descOf(data: any): string {
  const lbl = (data?.items && data.items[0] && data.items[0].desc) || data?.docType || "Payment";
  const cust = data?.customer || "";
  return cust ? (lbl + " — " + cust) : lbl;
}
// COGS read server-side from the stored receipt (the 8z74 database trigger adds the stock cost of part lines that carry none).
export function costCentsOf(data: any): number | null {
  const its = Array.isArray(data?.items) ? data.items : [];
  let any = false, sum = 0;
  for (const it of its) { if (it?.isDiscount) continue; const c = Number(it?.cost); if (!isNaN(c) && c > 0) { sum += c; any = true; } }
  return any ? Math.round(sum * 100) : null;
}
export function techOf(data: any): string | null {
  const t = (data?.technician ?? "").toString().trim();
  return t ? t : null;
}
// AUTHORITATIVE total recomputed from the receipt's lines + its tax rate — the same arithmetic as
// pay-create-intent / pay-record / computeTotals() in bittings.html. base = goods + labor + tax.
export function authoritativeTotals(data: any): { base_cents: number; tax_cents: number } {
  const items = Array.isArray(data?.items) ? data.items : [];
  if (!items.length) {
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
// Is there nothing left to pay on this receipt? (the document says so, or a completed payment exists)
export function receiptPaid(data: any): boolean {
  return String(data?.status ?? "") === "Paid in Full";
}

// ---- the webhook side: a pay-link payment has succeeded ----
// The reader / typed-card flows create their payment_transactions row BEFORE the charge. A Checkout
// payment has no PaymentIntent until the customer pays, so its row is written here, when Stripe says
// the money arrived. Called by stripe-webhook ONLY when no row exists for this PaymentIntent and the
// intent carries metadata.method = "link" (set by pay-link; nothing else sets it).
//
// Returns the row fields the webhook needs to mark the receipt paid, or null when the payment must
// not be recorded (unknown invoice, or the paying Stripe account is not that shop's account).
export type LinkRow = { invoice_id: string; shop_id: string; base_cents: number; tax_cents: number | null; surcharge_applied: boolean };
export async function recordLinkPayment(supa: any, pi: any, account: string | null, charge?: any): Promise<LinkRow | null> {
  const md = (pi && pi.metadata) || {};
  if (md.method !== "link") return null;
  const invoiceId = String(md.invoice_id || "").trim(), shopId = String(md.shop_id || "").trim();
  if (!invoiceId || !shopId || !pi.id) return null;
  const captured = Math.round(Number(pi.amount_received ?? pi.amount ?? 0));
  if (!(captured > 0)) return null;

  // The money must have landed in THIS shop's own Stripe account. Metadata is written by pay-link,
  // but a connected account can create its own PaymentIntents — never let one shop's Stripe account
  // mark another shop's invoice paid.
  const sq = await supa.from("shops").select("id, stripe_connect_id").eq("id", shopId).limit(1);
  const shop = sq.data?.[0];
  if (sq.error || !shop || !account || shop.stripe_connect_id !== account) return null;

  const rq = await supa.from("receipts").select("id, data").eq("id", invoiceId).eq("shop_id", shopId).limit(1);
  const rec = rq.data?.[0];
  if (rq.error || !rec) return null;

  const mdTax = parseInt(String(md.tax_cents ?? ""), 10);
  const tax_cents = isNaN(mdTax) ? null : Math.max(0, Math.min(mdTax, captured));
  const det: any = (charge && charge.payment_method_details) || {};
  const row = {
    invoice_id: invoiceId, connected_account_id: account, method: "link", currency: String(pi.currency || "usd"),
    base_cents: captured, surcharge_cents: 0, authorized_cents: Math.round(Number(pi.amount ?? captured)), captured_cents: captured,
    surcharge_applied: false, status: "completed",
    card_funding: det.card?.funding ?? null, card_brand: det.card?.brand ?? null,
    stripe_payment_intent_id: String(pi.id),
    description: descOf(rec.data), cost_cents: costCentsOf(rec.data), technician: techOf(rec.data), tax_cents,
    charge_type: "direct", idempotency_key: "inv_" + invoiceId + "_link_" + pi.id,
    created_by: /^[0-9a-f-]{36}$/i.test(String(md.created_by || "")) ? md.created_by : null, shop_id: shopId,
  };
  const ins = await supa.from("payment_transactions").insert(row);
  // 23505 = this PaymentIntent is already recorded (a second delivery of the same payment) — that is success
  if (ins.error && String((ins.error as any).code) !== "23505") throw new Error("record failed: " + ins.error.message);
  return { invoice_id: invoiceId, shop_id: shopId, base_cents: captured, tax_cents, surcharge_applied: false };
}

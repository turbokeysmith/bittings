import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, requireStaff } from "../_shared/auth.ts";
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
// CORS: shared origin allow-list (B-#9) — extend via ALLOWED_ORIGINS env.

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
// COGS read server-side from the stored receipt (client never sends cost).
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
// AUTHORITATIVE total recomputed server-side from line items + the receipt's tax
// rate (mirrors bittings.html computeTotals; verified parity). base = goods+labor+tax.
function authoritativeTotals(data: any): { base_cents: number; tax_cents: number } {
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

// CASH / CHECK: records a completed transaction (no Stripe, no surcharge —
// surcharge is card-only). Reads the authoritative total from the receipt; the
// client never sends an amount.
Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
  // Auth: any ACTIVE staff may take a payment (owner decision); reject anon/expired.
  let auth;
  try { auth = await requireStaff(req); }
  catch (e) { const er = e as { status?: number; error?: string }; return json(er.status ?? 401, { error: er.error ?? "unauthorized" }); }
  try {
    const body = await req.json();
    const invoiceId = String(body.invoiceId || "").trim();
    const method = body.method === "check" ? "check" : body.method === "cash" ? "cash" : "";
    const orgId = body.orgId ?? null;
    const connectedAccountId = body.connectedAccountId ?? null;
    if (!invoiceId) return json(400, { error: "invoiceId required" });
    if (!method) return json(400, { error: "method must be cash or check" });

    // Tenant scope: only act on THIS shop's rows (service_role bypasses RLS, so we
    // filter by the caller's shop explicitly). idempotency keyed within the shop.
    const idempotency_key = `inv_${invoiceId}_${method}`;
    const ex = await supa.from("payment_transactions").select("*").eq("idempotency_key", idempotency_key).eq("shop_id", auth.shopId).limit(1);
    if (ex.data && ex.data[0]) return json(200, { ok: true, reused: true, captured_cents: ex.data[0].captured_cents, method });

    // Receipt MUST belong to the caller's shop — you cannot record a payment on another shop's invoice.
    const r = await supa.from("receipts").select("id,data").eq("id", invoiceId).eq("shop_id", auth.shopId).limit(1);
    if (r.error) return json(500, { error: "receipt lookup failed: " + r.error.message });
    const rec = r.data?.[0];
    if (!rec) return json(404, { error: "invoice not found in cloud" });
    const { base_cents, tax_cents } = authoritativeTotals((rec as any).data);
    if (base_cents < 1) return json(400, { error: "amount must be greater than zero" });

    const ins = await supa.from("payment_transactions").insert({
      invoice_id: invoiceId, org_id: orgId, connected_account_id: connectedAccountId,
      method, currency: "usd", base_cents, surcharge_cents: 0, authorized_cents: base_cents,
      captured_cents: base_cents, surcharge_applied: false, status: "completed",
      description: descOf((rec as any).data), cost_cents: costCentsOf((rec as any).data),
      technician: techOf((rec as any).data), tax_cents, idempotency_key, created_by: auth.user.id,
      shop_id: auth.shopId,  // tenant-stamped (DB trigger also derives from the receipt)
    }).select().limit(1);
    if (ins.error) return json(500, { error: "record failed: " + ins.error.message });
    return json(200, { ok: true, method, captured_cents: base_cents });
  } catch (e) {
    return json(400, { error: String((e as any)?.message ?? e) });
  }
});

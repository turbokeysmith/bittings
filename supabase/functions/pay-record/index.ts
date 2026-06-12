import { createClient } from "npm:@supabase/supabase-js@2";
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
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

// CASH / CHECK: records a completed transaction (no Stripe, no surcharge —
// surcharge is card-only). Reads the authoritative total from the receipt; the
// client never sends an amount.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
  try {
    const body = await req.json();
    const invoiceId = String(body.invoiceId || "").trim();
    const method = body.method === "check" ? "check" : body.method === "cash" ? "cash" : "";
    const orgId = body.orgId ?? null;
    const connectedAccountId = body.connectedAccountId ?? null;
    if (!invoiceId) return json(400, { error: "invoiceId required" });
    if (!method) return json(400, { error: "method must be cash or check" });

    const idempotency_key = `inv_${invoiceId}_${method}`;
    const ex = await supa.from("payment_transactions").select("*").eq("idempotency_key", idempotency_key).limit(1);
    if (ex.data && ex.data[0]) return json(200, { ok: true, reused: true, captured_cents: ex.data[0].captured_cents, method });

    const r = await supa.from("receipts").select("id,data").eq("id", invoiceId).limit(1);
    if (r.error) return json(500, { error: "receipt lookup failed: " + r.error.message });
    const rec = r.data?.[0];
    if (!rec) return json(404, { error: "invoice not found in cloud" });
    const totals = (rec as any).data?.totals || {};
    const base_cents = Math.round(Math.max(0, Number(totals.total ?? (rec as any).data?.amount ?? 0) - Number(totals.surcharge ?? 0)) * 100);
    if (base_cents < 1) return json(400, { error: "amount must be greater than zero" });

    const ins = await supa.from("payment_transactions").insert({
      invoice_id: invoiceId, org_id: orgId, connected_account_id: connectedAccountId,
      method, currency: "usd", base_cents, surcharge_cents: 0, authorized_cents: base_cents,
      captured_cents: base_cents, surcharge_applied: false, status: "completed",
      description: descOf((rec as any).data), idempotency_key, created_by: uidFromJwt(req),
    }).select().limit(1);
    if (ins.error) return json(500, { error: "record failed: " + ins.error.message });
    return json(200, { ok: true, method, captured_cents: base_cents });
  } catch (e) {
    return json(400, { error: String((e as any)?.message ?? e) });
  }
});

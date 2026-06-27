import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, requireRole } from "../_shared/auth.ts";

const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// VOID a CASH / CHECK transaction (no Stripe). Card refunds go through
// pay-refund instead. Marks the row `refunded` so it drops out of "collected"
// and is counted as refunded in Closeout / Transaction History.
Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

  // --- AUTH GATE (Stage 0): only a signed-in manager/owner may void. ---
  let auth;
  try { auth = await requireRole(req, ["manager", "owner"]); }
  catch (e) { const a = e as { status?: number; error?: string }; return json(a.status ?? 403, { error: a.error ?? "forbidden" }); }

  try {
    const { transactionId } = await req.json();
    if (!transactionId) return json(400, { error: "transactionId required" });
    const q = await supa.from("payment_transactions").select("*").eq("id", transactionId).limit(1);
    const t = q.data?.[0];
    if (!t) return json(404, { error: "transaction not found" });
    if (t.method !== "cash" && t.method !== "check") return json(400, { error: "only cash/check can be voided here — use a refund for card" });
    if (t.status !== "completed") return json(400, { error: "only a completed transaction can be voided (status: " + t.status + ")" });
    const u = await supa.from("payment_transactions").update({ status: "refunded" }).eq("id", transactionId);
    if (u.error) return json(500, { error: "void failed: " + u.error.message });
    // NOTE: full audit_log write (who/what/when) is wired in Stage 1a once the
    // audit_log table exists. acting user = auth.user.id / role = auth.role.
    return json(200, { ok: true, status: "refunded", method: t.method });
  } catch (e) { return json(400, { error: String((e as any)?.message ?? e) }); }
});

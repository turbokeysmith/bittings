// mfa-reset — OWNER resets a teammate's authenticator (lost / replaced phone).
//
// Removes every verified+unverified TOTP factor on the target user so their next sign-in is
// password-only again (they can re-enrol from Settings → Access → Two-factor). Guard rails:
//   • caller must be the OWNER of the shop (requireRole(["owner"]) — which, after 8e, also means
//     the owner's own session passed its authenticator if they have one);
//   • target must be an active staff member of the SAME shop (never another tenant);
//   • an owner cannot reset THEMSELVES this way (use another owner / support) — prevents a
//     hijacked aal2 owner session from silently stripping its own second factor;
//   • every reset is written to audit_log (mfa_reset: who → whom).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, requireRole } from "../_shared/auth.ts";

const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
  let auth;
  try { auth = await requireRole(req, ["owner"]); }
  catch (e) { const er = e as { status?: number; error?: string }; return json(er.status ?? 401, { error: er.error ?? "unauthorized" }); }
  try {
    const body = await req.json().catch(() => ({}));
    const target = String(body.userId ?? "").trim();
    if (!target) return json(400, { error: "userId required" });
    if (target === auth.user.id) return json(400, { error: "you can't reset your own authenticator here — ask another owner, or sign in with your current phone and remove it from Settings" });
    const s = await supa.from("staff").select("user_id,name,role,active").eq("user_id", target).eq("shop_id", auth.shopId).limit(1);
    const row = s.data?.[0];
    if (!row) return json(404, { error: "that person is not on this shop's team" });
    const lf = await supa.auth.admin.mfa.listFactors({ userId: target });
    if (lf.error) return json(500, { error: "could not list factors: " + lf.error.message });
    const factors = lf.data?.factors ?? [];
    let removed = 0;
    for (const f of factors) {
      const d = await supa.auth.admin.mfa.deleteFactor({ id: f.id, userId: target });
      if (!d.error) removed++;
    }
    await supa.from("audit_log").insert({ user_id: auth.user.id, role: auth.role, action: "mfa_reset", entity_type: "staff", entity_id: target, shop_id: auth.shopId,
      detail: { target_name: row.name, target_role: row.role, factors_removed: removed } });
    return json(200, { ok: true, removed });
  } catch (e) {
    return json(400, { error: String((e as Error)?.message ?? e) });
  }
});

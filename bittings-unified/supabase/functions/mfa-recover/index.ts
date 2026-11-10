// mfa-recover — "I lost my phone": a signed-in person (password only, aal1) trades ONE backup code
// for removing their old authenticator, so they can set up the new phone (8z5).
//
//   • the caller must have a valid session (they already typed their password);
//   • the code must be one of THEIR unused backup codes (stored as SHA-256 hashes, 8z5);
//   • 5 wrong codes per hour per person, then refused (rate limit in mfa_recover_attempts);
//   • on success: the code is marked used, every TOTP factor on the account is removed, and an
//     audit_log row is written. The app then sends them to the authenticator setup screen, which
//     issues a fresh set of backup codes.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/auth.ts";

const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function sha256hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
  if (!m) return json(401, { error: "sign in first" });
  const u = await supa.auth.getUser(m[1]);
  if (u.error || !u.data?.user) return json(401, { error: "invalid or expired session — sign in again" });
  const uid = u.data.user.id;

  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body.code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length !== 8) return json(400, { error: "A backup code looks like ABCD-EFGH (8 letters/numbers)." });

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const fails = await supa.from("mfa_recover_attempts").select("id", { count: "exact", head: true })
      .eq("user_id", uid).eq("ok", false).gte("at", since);
    if ((fails.count ?? 0) >= 5) return json(429, { error: "Too many wrong codes. Wait an hour, or ask the shop owner to reset your authenticator." });

    const hash = await sha256hex(code);
    const hit = await supa.from("mfa_backup_codes").select("id").eq("user_id", uid).eq("code_hash", hash).is("used_at", null).limit(1).maybeSingle();
    if (hit.error) return json(503, { error: "try again in a moment" });
    if (!hit.data) {
      await supa.from("mfa_recover_attempts").insert({ user_id: uid, ok: false });
      return json(400, { error: "That backup code isn't valid (or was already used)." });
    }
    const used = await supa.from("mfa_backup_codes").update({ used_at: new Date().toISOString() }).eq("id", hit.data.id).is("used_at", null).select("id");
    if (used.error || !used.data?.length) return json(409, { error: "That code was just used. Try another one." });
    await supa.from("mfa_recover_attempts").insert({ user_id: uid, ok: true });

    const lf = await supa.auth.admin.mfa.listFactors({ userId: uid });
    let removed = 0;
    for (const f of lf.data?.factors ?? []) {
      const d = await supa.auth.admin.mfa.deleteFactor({ id: f.id, userId: uid });
      if (!d.error) removed++;
    }
    const left = await supa.from("mfa_backup_codes").select("id", { count: "exact", head: true }).eq("user_id", uid).is("used_at", null);
    const sm = await supa.from("shop_members").select("shop_id").eq("user_id", uid).eq("active", true).limit(1).maybeSingle();
    await supa.from("audit_log").insert({ user_id: uid, action: "mfa_recover_backup_code", entity_type: "staff", entity_id: uid,
      shop_id: sm.data?.shop_id ?? null, detail: { factors_removed: removed, codes_left: left.count ?? 0 } });
    return json(200, { ok: true, removed });
  } catch (e) {
    return json(400, { error: String((e as Error)?.message ?? e) });
  }
});

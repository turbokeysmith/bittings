// staff-invite — the SHOP OWNER adds a teammate (pre-pilot review #5).
//
// Flow (temp-password, works with the existing login page — no email sending,
// no SMTP config, no cost):
//   1. requireRole(["owner"]) — only the shop owner adds staff; the caller's
//      shop is resolved SERVER-SIDE (auth.shopId), never from client input.
//   2. Creates the auth user with the owner-provided temp password
//      (email_confirm: true so they can sign in immediately).
//   3. Inserts the staff row for THIS shop (trg_staff_member mirrors it into
//      shop_members, which is what current_shop()/RLS key off).
//   4. If the email already has an account anywhere → 409, NEVER moves a user
//      between shops (that would silently steal them from another tenant).
//
// Roles allowed: manager | technician | front_desk (an owner is created only
// through create_shop). Roles gate refunds/voids — keep this owner-only.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, requireRole } from "../_shared/auth.ts";

const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ROLES = ["manager", "technician", "front_desk"];

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

  let auth;
  try { auth = await requireRole(req, ["owner"]); }
  catch (e) { const a = e as { status?: number; error?: string }; return json(a.status ?? 403, { error: a.error ?? "forbidden" }); }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    const role = String(body.role ?? "").trim();
    const password = String(body.password ?? "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: "a valid email is required" });
    if (!name) return json(400, { error: "a name is required" });
    if (!ROLES.includes(role)) return json(400, { error: "role must be manager, technician or front_desk" });
    if (password.length < 8) return json(400, { error: "temp password must be at least 8 characters" });

    // Create the auth user. email_confirm:true = they can sign in right away
    // with the temp password the owner hands them.
    const created = await supa.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
    if (created.error) {
      const msg = created.error.message || "";
      if (/already|exists|registered/i.test(msg)) {
        return json(409, { error: "That email already has a Bittings account. A user can belong to only one shop — use a different email." });
      }
      return json(400, { error: "could not create the account: " + msg });
    }
    const uid = created.data.user.id;

    // Staff row for THIS shop. Plain INSERT (never upsert): if a staff row
    // already exists for this user, we must not steal them from another shop.
    const ins = await supa.from("staff").insert({ user_id: uid, name, role, active: true, shop_id: auth.shopId });
    if (ins.error) {
      // roll the auth user back so a failed invite leaves nothing behind
      try { await supa.auth.admin.deleteUser(uid); } catch (_) { /* best effort */ }
      return json(500, { error: "could not add the staff row: " + ins.error.message });
    }

    return json(200, { ok: true, email, role, name, note: "Hand them the email + temp password — they sign in at the normal login page and should change it after first sign-in." });
  } catch (e) {
    return json(400, { error: String((e as Error)?.message ?? e) });
  }
});

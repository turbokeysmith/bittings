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
//   5. SEAT LIMIT (8m): a NEW active teammate is refused with 402 when the shop
//      already uses every seat its subscription includes (seats_included +
//      seats_addon — the same arithmetic as public.seat_usage()). Owner rows and
//      already-active members are never affected: this only guards the insert of
//      a new active staff row. A shop with no subscriptions row has no known
//      entitlement and is not limited here (mirrors seat_usage() → allowed null).
//      Response: 402 { error:"SEAT_LIMIT", used, allowed, tier, message }.
//      The database enforces the same rule in trg_staff_seat_limit (phase8/8m).
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
    // (8z5) where the email link lands — the app's sign-in page. Supabase Auth only accepts URLs
    // on its redirect allow-list (bittings.app/**, turbokeysmith.com/staff/**, *.pages.dev previews, local test).
    const redirectTo = /^https:\/\/([a-z0-9-]+\.)*(turbokeysmith\.com|turbokeysmith\.pages\.dev|bittings-app\.pages\.dev)\/|^https:\/\/bittings\.app\/|^http:\/\/127\.0\.0\.1:8088\//i.test(String(body.redirectTo ?? ""))
      ? String(body.redirectTo) : "https://bittings.app/signin.html";

    // (8z5) RESEND an invite to someone already on this shop's team who never finished setting up.
    if (body.resend) {
      const target = String(body.userId ?? "").trim();
      const s = await supa.from("staff").select("user_id,name").eq("user_id", target).eq("shop_id", auth.shopId).limit(1);
      if (!s.data?.[0]) return json(404, { error: "that person is not on this shop's team" });
      const gu = await supa.auth.admin.getUserById(target);
      const em = gu.data?.user?.email;
      if (!em) return json(404, { error: "no email on that login" });
      if (gu.data.user.last_sign_in_at && (gu.data.user.user_metadata as Record<string, unknown> | undefined)?.password_set) return json(400, { error: "They already set up their account. If they forgot the password, use “Forgot password?” on the sign-in page." });
      let r = await supa.auth.admin.inviteUserByEmail(em, { redirectTo, data: { name: s.data[0].name } });
      if (r.error) {   // an existing unconfirmed login can't be re-invited on some setups → send a set-password (recovery) email
        const rp = await supa.auth.resetPasswordForEmail(em, { redirectTo });
        if (rp.error) return json(400, { error: "could not resend: " + rp.error.message });
      }
      return json(200, { ok: true, resent: true, email: em });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: "a valid email is required" });
    if (!name) return json(400, { error: "a name is required" });
    if (!ROLES.includes(role)) return json(400, { error: "role must be manager, technician or front_desk" });
    // (8z5) no password → EMAIL INVITE (they get a "set up your account" link). A password is still
    // accepted for the old hand-it-over flow.
    const inviteMode = !password;
    if (!inviteMode && password.length < 8) return json(400, { error: "temp password must be at least 8 characters" });

    // Seat limit (8m) — checked BEFORE the auth user is created so a refused invite
    // leaves nothing behind. Counted server-side for the caller's own shop only.
    const [cnt, sub] = await Promise.all([
      supa.from("staff").select("user_id", { count: "exact", head: true }).eq("shop_id", auth.shopId).eq("active", true),
      supa.from("subscriptions").select("tier, status, seats_included, seats_addon").eq("shop_id", auth.shopId)
        .order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (cnt.error || sub.error) {
      console.error("seat check failed", cnt.error?.message, sub.error?.message);
      return json(503, { error: "seat check unavailable, try again" });
    }
    const used = cnt.count ?? 0;
    const tier = sub.data?.tier ?? "lookup";
    const allowed = sub.data ? Number(sub.data.seats_included ?? 0) + Number(sub.data.seats_addon ?? 0) : null;
    if (allowed !== null && used >= allowed) {
      return json(402, {
        error: "SEAT_LIMIT", used, allowed, tier,
        message: `Seats full — this shop is using ${used} of ${allowed} seats on the ${tier} plan. Upgrade your plan or add a seat to invite more staff.`,
      });
    }

    // Create the auth user. email_confirm:true = they can sign in right away
    // with the temp password the owner hands them.
    // (8z5) invite mode: Supabase creates the login and emails a one-time "set up your account"
    // link (good for 24 h) that opens signin.html on the "Create your password" screen.
    const created = inviteMode
      ? await supa.auth.admin.inviteUserByEmail(email, { redirectTo, data: { name } })
      : await supa.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
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
      // (8m) the database trigger is the second line of defence (race between two invites / direct insert)
      if (/SEAT_LIMIT/.test(ins.error.message || "")) {
        const mm = /using (\d+) of (\d+) seats \((\w+) plan\)/.exec(ins.error.message || "");
        return json(402, { error: "SEAT_LIMIT", used: mm ? Number(mm[1]) : used, allowed: mm ? Number(mm[2]) : allowed, tier: mm ? mm[3] : tier, message: ins.error.message });
      }
      return json(500, { error: "could not add the staff row: " + ins.error.message });
    }

    return json(200, inviteMode
      ? { ok: true, invited: true, email, role, name, note: "Invite emailed — they tap the link, create their password and they're in. The link works for 24 hours; use Resend invite if it expires." }
      : { ok: true, email, role, name, note: "Hand them the email + temp password — they sign in at the normal login page and should change it after first sign-in." });
  } catch (e) {
    return json(400, { error: String((e as Error)?.message ?? e) });
  }
});

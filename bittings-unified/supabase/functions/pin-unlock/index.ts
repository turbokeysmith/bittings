// pin-unlock — the LOCK-SCREEN brain (shift system, owner spec 2026-07-02).
//
// The shop machine locks (idle timeout / Lock now) but the signed-in session
// stays alive underneath. Entering a PIN calls this function WITH that locked
// session's JWT, so the machine's shop is known server-side. Rules:
//
//   • SAME user's PIN            → { mode: "unlock" } — UI unlocks, session and
//     open shift untouched (an idle-unlock is NOT a re-clock-in).
//   • DIFFERENT teammate's PIN   → session SWITCH so actions credit correctly:
//     we mint a one-time magiclink token for that teammate (admin.generateLink)
//     and the client verifies it to become them. Allowed only if they have an
//     OPEN SHIFT (they clocked in with a full login earlier) — otherwise 409
//     "not clocked in — use full login". A 6-digit manager/owner PIN ALWAYS
//     switches (spec: "manager/owner can always unlock"); if the manager had no
//     open shift the client clocks them in right after the switch.
//   • Wrong PIN                  → 401 (server throttles: 5 tries / 5 min per
//     machine via pin_identify's pin_fail counter in the audit log).
//
// This is DISTINCT from a manager approving an override on someone else's
// screen — overrides never come through here and never switch the session.
// Every switch is written to the audit log (machine_switch: who → whom).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, requireStaff } from "../_shared/auth.ts";

const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

  // The LOCKED session must still be a valid staff session (clock-out logs out
  // fully — there is no lock screen without a session, only the login page).
  let auth;
  try { auth = await requireStaff(req); }
  catch (e) { const er = e as { status?: number; error?: string }; return json(er.status ?? 401, { error: er.error ?? "session expired — use full login", code: "no_session" }); }

  try {
    const body = await req.json().catch(() => ({}));
    const pin = String(body.pin ?? "").trim();
    if (!/^[0-9]{4}$|^[0-9]{6}$/.test(pin)) return json(400, { error: "enter a 4-digit (staff) or 6-digit (manager) PIN", code: "bad_format" });

    // Identify within THIS shop (service-role-only fn; throttles itself).
    const idr = await supa.rpc("pin_identify", { p_pin: pin, p_caller: auth.user.id, p_shop: auth.shopId });
    if (idr.error) {
      const throttled = /too many/i.test(idr.error.message || "");
      return json(throttled ? 429 : 500, { error: idr.error.message, code: throttled ? "throttled" : "server" });
    }
    const hit = idr.data as { user_id: string; name: string; role: string; is_self: boolean; is_manager: boolean } | null;
    if (!hit) return json(401, { error: "Incorrect PIN — or you're not logged in. Use full login (username + password) if needed.", code: "bad_pin" });

    // Same person → just unlock. Session + open shift untouched.
    if (hit.is_self) return json(200, { ok: true, mode: "unlock", user: { id: hit.user_id, name: hit.name, role: hit.role } });

    // Different person → they must be ON THE CLOCK (full login = clock in)…
    const open = await supa.from("time_entries").select("id")
      .eq("user_id", hit.user_id).eq("shop_id", auth.shopId).is("clock_out", null).limit(1);
    const clockedIn = !!(open.data && open.data[0]);
    // …unless it's a manager/owner 6-digit PIN — they can ALWAYS take the machine.
    if (!clockedIn && !hit.is_manager) {
      return json(409, { error: `PIN accepted, but ${hit.name} isn't clocked in. Start the day with a full login (username + password).`, code: "not_clocked_in", name: hit.name });
    }

    // Mint the switch: one-time magiclink token for the teammate; the client
    // verifies it and the machine session becomes them.
    const u = await supa.auth.admin.getUserById(hit.user_id);
    const email = u.data?.user?.email;
    if (u.error || !email) return json(500, { error: "could not resolve that teammate's login", code: "server" });
    const link = await supa.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = (link.data as { properties?: { hashed_token?: string } })?.properties?.hashed_token;
    if (link.error || !tokenHash) return json(500, { error: "could not create the switch token: " + (link.error?.message ?? "no token"), code: "server" });

    await supa.from("audit_log").insert({
      user_id: auth.user.id, role: auth.role, action: "machine_switch", entity_type: "staff",
      entity_id: hit.user_id, shop_id: auth.shopId,
      detail: { to_name: hit.name, to_role: hit.role, was_clocked_in: clockedIn },
    });

    return json(200, {
      ok: true, mode: "switch", token_hash: tokenHash,
      user: { id: hit.user_id, name: hit.name, role: hit.role },
      clocked_in: clockedIn,   // false only for manager/owner — client clocks them in after the switch
    });
  } catch (e) {
    return json(400, { error: String((e as Error)?.message ?? e), code: "server" });
  }
});

// ============================================================================
// Shared auth + CORS for sensitive edge functions (Phase 1).
// ----------------------------------------------------------------------------
//   1. Verify the caller's Supabase JWT (Authorization: Bearer <access_token>).
//   2. Resolve their app ROLE from the `staff` table (single source of truth)
//      and reject unless it is in the allowed set.
//   3. Lock CORS to an EXPANDABLE allow-list of origins (not "*").
//
// Role source: ONLY the `staff` table now (Stage 1a is live). The Stage 0
// interim owner-email allow-list has been removed — there is no email backdoor.
// (Requires `grant select on public.staff to service_role`, done in 1a.)
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULT_ORIGINS = [
  "http://localhost:8088", "http://127.0.0.1:8088",
  "http://localhost:5500", "http://127.0.0.1:5500",
  "http://localhost:3000", "http://127.0.0.1:3000",
];
function allowedOrigins(): string[] {
  const extra = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const ok = allowedOrigins().includes(origin);
  // (C8) A disallowed origin used to get the literal value "null" — which MATCHES the opaque
  // origin a file:// page sends, so the allow-list didn't actually block file:// launches.
  // Omit the header entirely when the origin isn't allowed: the browser then blocks the response.
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, content-type, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (ok) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

export type AuthError = { status: number; error: string };
// `shopId` is the caller's tenant, resolved SERVER-SIDE from shop_members (the
// security authority — never client input). Every tenant-scoped query in a
// payment function must be filtered by it. Fail-closed: no active membership → 403.
export type AuthOk = { user: { id: string; email: string }; role: string; shopId: string };

// Verify the JWT and resolve the caller's role from `staff`. Throws AuthError:
//   401 = not a valid signed-in user
//   503 = staff/membership lookup itself failed (e.g. missing grant) — distinguishable, not a silent deny
//   403 = signed in, but no active staff row with an allowed role / no active shop membership
export async function requireRole(req: Request, allowed: string[]): Promise<AuthOk> {
  const m = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!m) throw { status: 401, error: "missing bearer token" } as AuthError;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await admin.auth.getUser(m[1]);
  if (error || !data?.user) throw { status: 401, error: "invalid or expired session" } as AuthError;
  const user = { id: data.user.id, email: (data.user.email ?? "").toLowerCase() };

  const s = await admin.from("staff").select("role, active").eq("user_id", user.id).maybeSingle();
  if (s.error) {
    console.error("staff role lookup failed", (s.error as { code?: string }).code, s.error.message);
    throw { status: 503, error: "role service unavailable, try again" } as AuthError;
  }
  const role = (s.data && s.data.active) ? String(s.data.role ?? "") : "";
  if (!role || !allowed.includes(role)) {
    throw { status: 403, error: `forbidden: requires role ${allowed.join(" or ")}` } as AuthError;
  }

  // (8e) Two-factor: a manager/owner who has a VERIFIED authenticator must be on an aal2 session
  // (they entered the code this session). Mirrors aal_ok() in the database so the edge functions
  // can't be used to bypass what RLS now enforces. Staff without a factor are unaffected.
  if (role === "manager" || role === "owner") {
    let aal = "aal1";
    try { const p = JSON.parse(atob(m[1].split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); aal = String(p?.aal ?? "aal1"); } catch (_) { /* treat as aal1 */ }
    // (8z5) owners/managers MUST use an authenticator: without an aal2 session they have no
    // manager powers at all (mirrors aal_ok() in the database). The app sends them to set one up.
    if (aal !== "aal2") {
      throw { status: 403, error: "authenticator code required — sign in again and enter your 6-digit code (or set up your authenticator app)", code: "mfa_required" } as AuthError & { code: string };
    }
  }

  // Tenant context: the caller's shop is resolved from shop_members (the Phase-5
  // security authority), NOT from any client-supplied orgId. Mirrors current_shop()
  // (oldest active membership). Payment functions run as service_role and bypass
  // RLS, so this is the ONLY tenant boundary on the money path — fail closed.
  const sm = await admin.from("shop_members")
    .select("shop_id")
    .eq("user_id", user.id).eq("active", true)
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (sm.error) {
    console.error("shop membership lookup failed", (sm.error as { code?: string }).code, sm.error.message);
    throw { status: 503, error: "tenant service unavailable, try again" } as AuthError;
  }
  const shopId = sm.data?.shop_id ? String(sm.data.shop_id) : "";
  if (!shopId) throw { status: 403, error: "no active shop membership" } as AuthError;

  return { user, role, shopId };
}

// Convenience: any ACTIVE staff member (all four roles). "Take payment" is an
// all-staff action (owner decision), so the payment endpoints require staff but
// not a specific role — while still rejecting anon/expired/unknown callers.
export const ALL_STAFF = ["owner", "manager", "front_desk", "technician"];
export function requireStaff(req: Request): Promise<AuthOk> {
  return requireRole(req, ALL_STAFF);
}

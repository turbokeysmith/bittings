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
  return {
    "Access-Control-Allow-Origin": ok ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export type AuthError = { status: number; error: string };
export type AuthOk = { user: { id: string; email: string }; role: string };

// Verify the JWT and resolve the caller's role from `staff`. Throws AuthError:
//   401 = not a valid signed-in user
//   503 = staff lookup itself failed (e.g. missing grant) — distinguishable, not a silent deny
//   403 = signed in, but no active staff row with an allowed role
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
  return { user, role };
}

// Convenience: any ACTIVE staff member (all four roles). "Take payment" is an
// all-staff action (owner decision), so the payment endpoints require staff but
// not a specific role — while still rejecting anon/expired/unknown callers.
export const ALL_STAFF = ["owner", "manager", "front_desk", "technician"];
export function requireStaff(req: Request): Promise<AuthOk> {
  return requireRole(req, ALL_STAFF);
}

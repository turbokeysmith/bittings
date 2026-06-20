// ============================================================================
// Shared auth + CORS for sensitive edge functions (Phase 1, Stage 0).
// ----------------------------------------------------------------------------
// Closes the open-endpoint hole on pay-refund / pay-void:
//   1. Verify the caller's Supabase JWT (Authorization: Bearer <access_token>).
//   2. Resolve their app ROLE and reject unless it is in the allowed set.
//   3. Lock CORS to an EXPANDABLE allow-list of origins (not "*").
//
// Role source (self-upgrading): staff.role once that table exists (Stage 1a);
// until then an interim owner-email allow-list. NOTE: supabase-js goes through
// PostgREST, so a missing `staff` table surfaces as PGRST205 ("could not find
// the table ... in the schema cache"), NOT the raw Postgres 42P01 — detect both.
// The known owner email is always included so a missing/blank OWNER_EMAILS env
// can't lock the owner out during Stage 0. (Stage 1a drops this allow-list.)
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

// Interim owner allow-list (Stage 0 only). Always includes the known owner so a
// missing/blank OWNER_EMAILS env can't lock them out. Removed in Stage 1a.
function ownerEmailAllowlist(): string[] {
  const fromEnv = (Deno.env.get("OWNER_EMAILS") ?? "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return Array.from(new Set(["samer@turbokeysmith.com", ...fromEnv]));
}

function staffTableMissing(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  return /could not find the table|schema cache|does not exist/i.test(err.message ?? "");
}

export type AuthError = { status: number; error: string };
export type AuthOk = { user: { id: string; email: string }; role: string };

// Verify the JWT and resolve the caller's role. Throws AuthError on any failure
// (401 = not a valid signed-in user, 403 = signed in but wrong role).
export async function requireRole(req: Request, allowed: string[]): Promise<AuthOk> {
  const m = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!m) throw { status: 401, error: "missing bearer token" } as AuthError;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await admin.auth.getUser(m[1]);
  if (error || !data?.user) throw { status: 401, error: "invalid or expired session" } as AuthError;
  const user = { id: data.user.id, email: (data.user.email ?? "").toLowerCase() };

  // Resolve role: staff.role (active) when the table exists; otherwise fall back
  // to the interim owner allow-list — but only when the table is genuinely
  // missing, not merely when a real staff row is absent.
  let role = "";
  const s = await admin.from("staff").select("role, active").eq("user_id", user.id).maybeSingle();
  if (staffTableMissing(s.error as { code?: string; message?: string } | null)) {
    role = ownerEmailAllowlist().includes(user.email) ? "owner" : "";
  } else if (!s.error && s.data && s.data.active) {
    role = String(s.data.role ?? "");
  } else if (s.error) {
    console.warn("staff lookup error", (s.error as { code?: string }).code, s.error.message);
  }

  if (!role || !allowed.includes(role)) {
    throw { status: 403, error: `forbidden: requires role ${allowed.join(" or ")}` } as AuthError;
  }
  return { user, role };
}

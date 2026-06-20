// ============================================================================
// Shared auth + CORS for sensitive edge functions (Phase 1, Stage 0).
// ----------------------------------------------------------------------------
// Closes the open-endpoint hole on pay-refund / pay-void:
//   1. Verify the caller's Supabase JWT (Authorization: Bearer <access_token>).
//   2. Resolve their app ROLE and reject unless it is in the allowed set.
//   3. Lock CORS to an EXPANDABLE allow-list of origins (not "*").
//
// Role source (self-upgrading):
//   • Once the `staff` table exists (Stage 1a), the role comes from staff.role
//     (active rows only) — the real source of truth.
//   • Until then, an interim OWNER_EMAILS allow-list (env) is used so the hole
//     is closed NOW without waiting for the table. When staff lands, this path
//     is simply never taken anymore — no code change required.
//
// Config (all via Supabase function secrets — free to set, no plan upgrade):
//   ALLOWED_ORIGINS  comma-separated extra origins (e.g. the web-app domain,
//                    later native-app origins). Localhost dev origins are
//                    always allowed. This is the expandable list (Q13).
//   OWNER_EMAILS     comma-separated interim owner emails (defaults to the
//                    real owner) — only consulted before `staff` exists.
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Dev origins always allowed; extra (web domain, native apps) come from env.
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

// Build CORS headers, echoing the Origin only when it's on the allow-list.
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

function ownerEmailAllowlist(): string[] {
  return (Deno.env.get("OWNER_EMAILS") ?? "samer@turbokeysmith.com")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
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

  // Prefer the staff table; fall back to the interim owner allow-list only if
  // the table doesn't exist yet (Postgres 42P01 = undefined_table).
  let role = "";
  const s = await admin.from("staff").select("role, active").eq("user_id", user.id).maybeSingle();
  if (s.error && (s.error as { code?: string }).code === "42P01") {
    role = ownerEmailAllowlist().includes(user.email) ? "owner" : "";
  } else if (s.data && s.data.active) {
    role = String(s.data.role ?? "");
  }

  if (!role || !allowed.includes(role)) {
    throw { status: 403, error: `forbidden: requires role ${allowed.join(" or ")}` } as AuthError;
  }
  return { user, role };
}

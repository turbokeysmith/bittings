// vin-decode — 8k: decode a VIN (NHTSA vPIC) for a signed-in staff member, behind the shop's plan.
// "Vehicle fitment" (VIN / year-make-model / FCC key finding) is a Starter-and-up feature; a Lookup-plan
// shop gets 402 TIER_LOCKED and the app shows the upgrade prompt. Every successful decode is logged to
// public.vin_decodes (per-shop usage, readable by that shop's managers). Demo / offline builds of the
// app never call this — they decode straight from NHTSA on the device.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, requireStaff } from "../_shared/auth.ts";

const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ALLOWED = ["starter", "pro"];

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

  let auth;
  try { auth = await requireStaff(req); }
  catch (e) { const er = e as { status?: number; error?: string }; return json(er.status ?? 401, { error: er.error ?? "unauthorized" }); }

  // Plan gate — mirrors public.tier_allows('fitment') (starter, pro). Read the shop's own subscription row.
  const sub = await supa.from("subscriptions").select("tier,status").eq("shop_id", auth.shopId)
    .in("status", ["active", "trialing"]).order("updated_at", { ascending: false }).limit(1);
  const tier = (sub.data?.[0]?.tier as string | undefined) ?? "lookup";
  if (!ALLOWED.includes(tier)) return json(402, { error: "TIER_LOCKED", feature: "fitment", tier });

  let vin = "";
  try { vin = String(((await req.json()) ?? {}).vin ?? "").trim().toUpperCase(); } catch (_) { /* no body */ }
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return json(400, { error: "Enter a full 17-character VIN." });

  let row: Record<string, string> = {};
  try {
    const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(vin)}?format=json`);
    const j = await r.json();
    row = (j?.Results?.[0] as Record<string, string>) ?? {};
  } catch (e) { return json(502, { error: "VIN service unavailable — try again or enter the vehicle by hand." }); }

  let make = row.Make || "";
  if (make) make = make.charAt(0) + make.slice(1).toLowerCase();   // vPIC returns ALL-CAPS makes
  const out = { vin, year: row.ModelYear || "", make, model: row.Model || "" };
  if (!out.make && !out.year) return json(404, { error: "Couldn't read that VIN — enter the details manually." });

  try { await supa.from("vin_decodes").insert({ shop_id: auth.shopId, user_id: auth.user.id, vin, year: out.year, make: out.make, model: out.model }); } catch (_) { /* metering must never block the decode */ }
  return json(200, out);
});

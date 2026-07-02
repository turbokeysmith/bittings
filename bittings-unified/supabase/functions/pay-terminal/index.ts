// pay-terminal — Stripe Terminal helpers (list locations/readers, test-mode
// simulate, cancel a reader action).
//
// Hardened (2026-07-02, pre-pilot review #6): the Connect account is resolved
// SERVER-SIDE from the caller's shop (shops.stripe_connect_id via auth.shopId)
// — body.connectedAccountId is IGNORED. Previously any signed-in staffer could
// pass another shop's acct_… id and enumerate that shop's readers or cancel a
// reader action. CORS now uses the shared origin allow-list (not "*").
import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, requireStaff } from "../_shared/auth.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const isTest = (Deno.env.get("STRIPE_SECRET_KEY") ?? "").startsWith("sk_test");

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
  // Auth: any ACTIVE staff may use the terminal (list/simulate/cancel); reject anon/expired.
  let auth;
  try { auth = await requireStaff(req); }
  catch (e) { const er = e as { status?: number; error?: string }; return json(er.status ?? 401, { error: er.error ?? "unauthorized" }); }
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "list";
    // Connect account resolved from THIS shop — never from client input.
    const shopRow = await supa.from("shops").select("stripe_connect_id").eq("id", auth.shopId).limit(1);
    const acct = shopRow.data?.[0]?.stripe_connect_id as string | undefined;
    const opts: Stripe.RequestOptions | undefined = acct ? { stripeAccount: acct } : undefined;
    if (action === "list") {
      const locs = await stripe.terminal.locations.list({ limit: 100 }, opts);
      const readers = await stripe.terminal.readers.list({ limit: 100, ...(body.locationId ? { location: body.locationId } : {}) }, opts);
      return json(200, {
        mode: isTest ? "test" : "live",
        locations: locs.data.map((l) => ({ id: l.id, display_name: l.display_name })),
        readers: readers.data.map((r) => ({ id: r.id, label: r.label, status: r.status, device_type: r.device_type, location: r.location })),
      });
    }
    if (action === "simulate") {
      if (!isTest) return json(403, { error: "simulate is test-mode only" });
      if (!body.readerId) return json(400, { error: "readerId required" });
      const pan = body.declined ? "4000000000000002" : body.debit ? "4000056655665556" : "4242424242424242";
      await stripe.testHelpers.terminal.readers.presentPaymentMethod(body.readerId, { type: "card_present", card_present: { number: pan } }, opts);
      return json(200, { ok: true, simulated: pan.slice(-4) });
    }
    if (action === "cancel") {
      if (!body.readerId) return json(400, { error: "readerId required" });
      await stripe.terminal.readers.cancelAction(body.readerId, opts);
      return json(200, { ok: true });
    }
    return json(400, { error: "unknown action" });
  } catch (e) { return json(400, { error: String((e as any)?.message ?? e) }); }
});

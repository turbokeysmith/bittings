import Stripe from "npm:stripe@16";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const isTest = (Deno.env.get("STRIPE_SECRET_KEY") ?? "").startsWith("sk_test");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "list";
    const opts: Stripe.RequestOptions | undefined = body.connectedAccountId ? { stripeAccount: body.connectedAccountId } : undefined;
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

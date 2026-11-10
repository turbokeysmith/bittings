// pay-terminal — Stripe Terminal helpers: list / add / rename / remove this shop's card readers,
// test-mode simulate, cancel a reader action, publishable key for the typed-card field.
//
// Hardened (2026-07-02, pre-pilot review #6): CORS uses the shared origin allow-list (not "*").
//
// (8z13, 2026-11-09) Readers are registered on the PLATFORM Stripe account — card charges are
// destination charges created there (pay-create-intent: on_behalf_of + transfer_data → the
// shop's Connect account), and a reader can only process a PaymentIntent on its own account.
// Each shop gets its OWN Terminal Location (shops.terminal_location_id, created on the first
// "Add a reader"); every action below is fenced to readers at THAT location, so a shop can
// never see, charge on, or remove another shop's reader. The shop pairs its reader itself in
// Settings → Payments with the code the reader shows — no keys or ids sent to anyone.
import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, requireStaff } from "../_shared/auth.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const isTest = (Deno.env.get("STRIPE_SECRET_KEY") ?? "").startsWith("sk_test");
const PK = Deno.env.get("STRIPE_PUBLISHABLE_KEY") ?? "";
const SETUP_ROLES = ["owner", "manager"];

type ReaderOut = { id: string; label: string | null; status: string | null; device_type: string; location: string | null };
const locId = (r: Stripe.Terminal.Reader): string | null =>
  (typeof r.location === "string" ? r.location : (r.location as Stripe.Terminal.Location | null)?.id) ?? null;
const out = (r: Stripe.Terminal.Reader): ReaderOut =>
  ({ id: r.id, label: r.label ?? null, status: r.status ?? null, device_type: r.device_type, location: locId(r) });

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
  // Auth: any ACTIVE staff may use the terminal (list/simulate/cancel); add/rename/remove = owner or manager.
  let auth;
  try { auth = await requireStaff(req); }
  catch (e) { const er = e as { status?: number; error?: string }; return json(er.status ?? 401, { error: er.error ?? "unauthorized" }); }
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "list";
    const shopRow = await supa.from("shops").select("name, terminal_location_id").eq("id", auth.shopId).limit(1);
    if (shopRow.error) return json(503, { error: "shop lookup failed, try again" });
    const shop = (shopRow.data?.[0] ?? {}) as { name?: string; terminal_location_id?: string | null };
    let loc: string | null = shop.terminal_location_id ?? null;

    // Is this reader at THIS shop's location? Reader ids come from the browser, so this is the fence.
    const ownReader = async (id: unknown): Promise<Stripe.Terminal.Reader | null> => {
      const rid = String(id ?? "");
      if (!loc || !/^tmr_[A-Za-z0-9]+$/.test(rid)) return null;
      const r = await stripe.terminal.readers.retrieve(rid).catch(() => null) as (Stripe.Terminal.Reader & { deleted?: boolean }) | null;
      if (!r || r.deleted) return null;
      return locId(r) === loc ? r : null;
    };

    if (action === "config") {   // publishable key for the typed-card field (public by design)
      return json(200, { mode: isTest ? "test" : "live", publishableKey: PK || null });
    }

    if (action === "list") {
      const readers = loc ? (await stripe.terminal.readers.list({ limit: 100, location: loc })).data.map(out) : [];
      return json(200, { mode: isTest ? "test" : "live", hasLocation: !!loc, readers, canSetup: SETUP_ROLES.includes(auth.role) });
    }

    if (action === "register") {
      if (!SETUP_ROLES.includes(auth.role)) return json(403, { error: "Only the owner or a manager can add a card reader." });
      const code = String(body.code ?? "").trim().toLowerCase().replace(/\s+/g, "-");
      const label = String(body.label ?? "").trim().slice(0, 60) || "Card reader";
      if (!code) return json(400, { error: "Type the pairing code your reader shows." });
      if (!loc) {   // first reader → this shop's Terminal Location (Stripe needs the shop's address once)
        const a = (body.address ?? {}) as Record<string, unknown>;
        const address = {
          line1: String(a.line1 ?? "").trim(), city: String(a.city ?? "").trim(),
          state: String(a.state ?? "").trim().toUpperCase(), postal_code: String(a.postal_code ?? "").trim(), country: "US",
        };
        if (!address.line1 || !address.city || !/^[A-Z]{2}$/.test(address.state) || !/^\d{5}(-\d{4})?$/.test(address.postal_code)) {
          return json(400, { error: "Enter the shop's street, city, 2-letter state and ZIP. Stripe needs them once to set up your reader.", code: "address_required" });
        }
        const l = await stripe.terminal.locations.create({ display_name: String(shop.name || "Shop").slice(0, 100), address, metadata: { shop_id: auth.shopId } });
        // Only claim it if nobody else did in the meantime (two people adding readers at once).
        const up = await supa.from("shops").update({ terminal_location_id: l.id }).eq("id", auth.shopId).is("terminal_location_id", null).select("terminal_location_id");
        if (up.data?.[0]) loc = l.id;
        else {
          await stripe.terminal.locations.del(l.id).catch(() => null);
          const again = await supa.from("shops").select("terminal_location_id").eq("id", auth.shopId).limit(1);
          loc = (again.data?.[0]?.terminal_location_id as string | null) ?? null;
          if (!loc) return json(503, { error: "could not save the reader location, try again" });
        }
      }
      try {
        const r = await stripe.terminal.readers.create({ registration_code: code, label, location: loc, metadata: { shop_id: auth.shopId } });
        await supa.from("audit_log").insert({ user_id: auth.user.id, role: auth.role, action: "reader_add", entity_type: "terminal_reader", entity_id: r.id, shop_id: auth.shopId, detail: { label, device_type: r.device_type } });
        return json(200, { ok: true, reader: out(r) });
      } catch (e) {
        const msg = String((e as Error)?.message ?? e);
        if (/already/i.test(msg) && /regist/i.test(msg)) return json(409, { error: "This reader is still paired to another Stripe account. Remove it there first (or reset the reader), then make a new pairing code.", code: "already_registered" });
        if (/regist|code|invalid|expired/i.test(msg)) return json(400, { error: "That pairing code didn't work. Codes expire after a few minutes, so make a new one on the reader and type it right away.", code: "bad_code" });
        return json(400, { error: "Stripe: " + msg });
      }
    }

    if (action === "rename" || action === "remove") {
      if (!SETUP_ROLES.includes(auth.role)) return json(403, { error: "Only the owner or a manager can change card readers." });
      const r = await ownReader(body.readerId);
      if (!r) return json(404, { error: "reader not found at this shop" });
      if (action === "rename") {
        const label = String(body.label ?? "").trim().slice(0, 60);
        if (!label) return json(400, { error: "name required" });
        return json(200, { ok: true, reader: out(await stripe.terminal.readers.update(r.id, { label }) as Stripe.Terminal.Reader) });
      }
      await stripe.terminal.readers.del(r.id);
      await supa.from("audit_log").insert({ user_id: auth.user.id, role: auth.role, action: "reader_remove", entity_type: "terminal_reader", entity_id: r.id, shop_id: auth.shopId, detail: { label: r.label } });
      return json(200, { ok: true });
    }

    if (action === "simulate") {
      if (!isTest) return json(403, { error: "simulate is test-mode only" });
      const r = await ownReader(body.readerId);
      if (!r) return json(404, { error: "reader not found at this shop" });
      const pan = body.declined ? "4000000000000002" : body.debit ? "4000056655665556" : "4242424242424242";
      await stripe.testHelpers.terminal.readers.presentPaymentMethod(r.id, { type: "card_present", card_present: { number: pan } });
      return json(200, { ok: true, simulated: pan.slice(-4) });
    }
    if (action === "cancel") {
      const r = await ownReader(body.readerId);
      if (!r) return json(404, { error: "reader not found at this shop" });
      await stripe.terminal.readers.cancelAction(r.id);
      return json(200, { ok: true });
    }
    // (C6) The Pay Now sheet was closed with a charge still live. Cancel the PaymentIntent (so a
    // later tap can't capture a sale nobody is watching), clear the reader prompt, and mark the
    // ledger row canceled. Only THIS shop's pending/authorized intents; anything else is a no-op.
    if (action === "cancel_intent") {
      const piId = String(body.paymentIntentId || "");
      if (!piId) return json(400, { error: "paymentIntentId required" });
      const q = await supa.from("payment_transactions").select("id,status,method,reader_id").eq("stripe_payment_intent_id", piId).eq("shop_id", auth.shopId).limit(1);
      const t = q.data?.[0];
      if (!t) return json(404, { error: "transaction not found" });
      if (!["pending", "authorized"].includes(t.status)) return json(200, { ok: true, skipped: true, status: t.status });
      const r = await ownReader(body.readerId || t.reader_id);
      if (r) { try { await stripe.terminal.readers.cancelAction(r.id); } catch (_) { /* reader may already be idle */ } }
      let piStatus = "canceled";
      try { piStatus = (await stripe.paymentIntents.cancel(piId)).status; }
      catch (e) {
        // Already captured/succeeded? Then it is NOT abandoned — leave the row for the webhook.
        const msg = String((e as any)?.message ?? e);
        const live = await stripe.paymentIntents.retrieve(piId).catch(() => null);
        if (live && (live.status === "succeeded" || live.status === "processing")) return json(200, { ok: true, skipped: true, status: live.status });
        return json(400, { error: "could not cancel: " + msg });
      }
      await supa.from("payment_transactions").update({ status: "canceled", failure_reason: "abandoned — sheet closed before the customer paid" }).eq("id", t.id).eq("shop_id", auth.shopId);
      return json(200, { ok: true, status: piStatus });
    }
    return json(400, { error: "unknown action" });
  } catch (e) { return json(400, { error: String((e as any)?.message ?? e) }); }
});

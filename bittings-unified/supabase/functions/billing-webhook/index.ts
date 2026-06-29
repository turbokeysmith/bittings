// billing-webhook — Stripe subscription webhook → flips the shop's tier. TEST MODE.
// The ONLY writer of public.subscriptions.tier (service_role). Verify the signature.
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO,
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const WH = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const PRICE_TIER: Record<string, string> = {
  [Deno.env.get("STRIPE_PRICE_STARTER") || "_starter"]: "starter",
  [Deno.env.get("STRIPE_PRICE_PRO") || "_pro"]: "pro",
};
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function statusMap(s: string) { return (s === "active" || s === "trialing") ? s : (s === "canceled" ? "canceled" : "past_due"); }

async function setTier(subObj: any) {
  const price = subObj?.items?.data?.[0]?.price?.id;
  const tier = PRICE_TIER[price] || "lookup";
  const cpe = subObj?.current_period_end ? new Date(subObj.current_period_end * 1000).toISOString() : null;
  const shop = subObj?.metadata?.shop_id;
  const patch = { tier, status: statusMap(subObj.status), stripe_subscription_id: subObj.id, current_period_end: cpe, updated_at: new Date().toISOString() };
  const q = admin.from("subscriptions").update(patch);
  if (shop) await q.eq("shop_id", shop);
  else await q.eq("stripe_customer_id", subObj.customer);
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();
  let ev: Stripe.Event;
  try { ev = await stripe.webhooks.constructEventAsync(body, sig, WH); }
  catch (e) { return new Response("bad signature: " + String((e as Error).message), { status: 400 }); }

  try {
    if (ev.type === "customer.subscription.created" || ev.type === "customer.subscription.updated") {
      await setTier(ev.data.object);
    } else if (ev.type === "customer.subscription.deleted") {
      const o = ev.data.object as any;
      await admin.from("subscriptions").update({ tier: "lookup", status: "canceled", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", o.id);
    } else if (ev.type === "checkout.session.completed") {
      const s = ev.data.object as any;
      if (s.subscription) {
        const sub = await stripe.subscriptions.retrieve(s.subscription as string) as any;
        sub.metadata = { ...(sub.metadata || {}), shop_id: s.metadata?.shop_id, tier: s.metadata?.tier };
        await setTier(sub);
      }
    }
  } catch (e) { return new Response("handler error: " + String((e as Error).message), { status: 500 }); }
  return new Response("ok");
});

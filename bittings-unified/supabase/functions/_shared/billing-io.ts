// ============================================================================
// _shared/billing-io.ts — the parts of Bittings' subscription billing that talk to Stripe, the
// database and the mail service (8z136). The rules themselves are in billing.ts.
// Used by billing-webhook (Stripe tells us something changed) and billing-notices (the daily check).
//
// Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//      STRIPE_PRICE_LOOKUP / _STARTER / _PRO / _SEAT   — price ids (not secret)
//      RESEND_API_KEY                                   — set by the owner
//      BILLING_MAIL_FROM  (optional)  e.g. "Bittings <billing@bittings.app>"; without it the address in MAIL_FROM is used
//      BILLING_REPLY_TO   (optional)  default support@bittings.app
//      APP_URL
// ============================================================================
import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";
import { planFromSubscription, rowPatch, type Mail, type PriceMap, type SubRow } from "./billing.ts";

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
export const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const env = (k: string) => (Deno.env.get(k) || "").trim();
export const PRICES: PriceMap = {
  lookup: env("STRIPE_PRICE_LOOKUP") || undefined, starter: env("STRIPE_PRICE_STARTER") || undefined,
  pro: env("STRIPE_PRICE_PRO") || undefined, seat: env("STRIPE_PRICE_SEAT") || undefined,
};
export const APP_URL = (env("APP_URL") || "https://bittings.app").replace(/\/+$/, "");

const SUB_COLS = "shop_id,tier,status,seats_included,seats_addon,stripe_customer_id,stripe_subscription_id,current_period_end,past_due_since,founder_ends_at,price_notice_sent_at,price_notice_for,payment_notice_sent_at,lock_notice_sent_at,cancel_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function subRow(shopId: string): Promise<SubRow | null> {
  const r = await admin.from("subscriptions").select(SUB_COLS).eq("shop_id", shopId).maybeSingle();
  if (r.error) throw new Error("subscriptions read failed: " + r.error.message);
  return (r.data as SubRow | null) ?? null;
}

// The subscription as Stripe has it NOW (never the copy inside a webhook — reports can arrive out of order).
// deno-lint-ignore no-explicit-any
export async function fetchSubscription(id: string): Promise<any> {
  try { return await stripe.subscriptions.retrieve(id, { expand: ["discounts"] }); }
  catch (_) { return await stripe.subscriptions.retrieve(id); }
}

// Bring one shop's row in line with its Stripe subscription. Returns what happened.
export async function applySubscription(subId: string, hintShop?: string): Promise<{ shopId?: string; applied: boolean; why?: string; row?: SubRow | null }> {
  const sub = await fetchSubscription(subId);
  const plan = planFromSubscription(sub, PRICES);
  if (!plan) return { applied: false, why: "not a Bittings plan" };

  let shopId = String(sub.metadata?.shop_id || hintShop || "");
  let row: SubRow | null = null;
  if (UUID.test(shopId)) row = await subRow(shopId);
  if (!row && plan.stripe_customer_id) {
    const r = await admin.from("subscriptions").select(SUB_COLS).eq("stripe_customer_id", plan.stripe_customer_id).limit(1);
    row = (r.data?.[0] as SubRow | undefined) ?? null;
    if (row) shopId = String(row.shop_id);
  }
  if (!row) return { applied: false, why: "no shop for this subscription", shopId };

  const patch = rowPatch(row, plan, Date.now());
  if (!patch) return { applied: false, why: "ignored (not this shop's current subscription)", shopId, row };
  const up = await admin.from("subscriptions").update(patch).eq("shop_id", shopId);
  if (up.error) throw new Error("subscriptions update failed: " + up.error.message);
  return { applied: true, shopId, row: await subRow(shopId) };
}

export async function shopName(shopId: string): Promise<string> {
  try { const r = await admin.from("shops").select("name").eq("id", shopId).maybeSingle(); return String(r.data?.name ?? ""); } catch (_) { return ""; }
}

// The sign-in email of the shop's owner (the account owner the Terms say we write to).
export async function ownerEmail(shopId: string): Promise<string> {
  const m = await admin.from("shop_members").select("user_id").eq("shop_id", shopId).eq("role", "owner").eq("active", true).order("created_at", { ascending: true }).limit(1);
  const uid = m.data?.[0]?.user_id as string | undefined;
  if (!uid) return "";
  try { const u = await admin.auth.admin.getUserById(uid); return String(u.data?.user?.email ?? "").trim(); } catch (_) { return ""; }
}

function fromAddress(): string {
  const own = env("BILLING_MAIL_FROM");
  if (own) return own;
  const m = /<?([^\s<>]+@[^\s<>]+)>?\s*$/.exec(env("MAIL_FROM"));
  return m ? `Bittings <${m[1]}>` : "";
}

// Send one billing email and write it to the audit log. Never throws: { ok:false, error } instead.
export async function sendBillingMail(shopId: string, kind: string, to: string, mail: Mail): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = env("RESEND_API_KEY"), from = fromAddress();
  if (!key || !from) return { ok: false, error: "email is not set up (RESEND_API_KEY / MAIL_FROM)" };
  if (!/^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]{2,}$/.test(to)) return { ok: false, error: "no owner email on file" };
  let id = "";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: "Bearer " + key, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: mail.subject, text: mail.text, reply_to: env("BILLING_REPLY_TO") || "support@bittings.app" }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: "mail service refused: " + String((j as { message?: string }).message ?? r.status).slice(0, 200) };
    id = String((j as { id?: string }).id ?? "");
  } catch (e) { return { ok: false, error: "mail service unreachable: " + String((e as Error).message).slice(0, 200) }; }
  try {
    await admin.from("audit_log").insert({ action: "billing_email", entity_type: "subscriptions", entity_id: shopId, role: "system",
      detail: { kind, to, subject: mail.subject, resend_id: id }, shop_id: shopId });
  } catch (_) { /* the email has gone; a logging problem must not undo that */ }
  return { ok: true, id };
}

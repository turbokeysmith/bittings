// ============================================================================
// _shared/billing.ts — the RULES of Bittings' own subscription billing (8z136).
// ----------------------------------------------------------------------------
// Kept free of Deno / npm imports on purpose: the same file is unit-tested under
// Node (tools/qa/billing-unit-test.mjs). The functions that talk to Stripe, the
// database and the mail service live in billing-io.ts and call into this file.
//
// What is decided here:
//   • which plan a Stripe subscription is (by its price id) and how many users it carries
//   • what the shop's subscriptions row becomes when Stripe reports a change
//   • when the "your founder price ends" notice may be sent, and when the founder price must
//     be EXTENDED because a notice was not on record 30 days ahead (owner, 2026-11-13: "so if
//     I forget we're not held liable")
//   • the wording of the three emails
// The 7 days of grace after a failed payment are enforced in the DATABASE
// (public.shop_tier / public.billing_state, supabase/phase8/8z136_billing_lock_and_notices.sql);
// GRACE_DAYS here must stay equal to public.billing_grace_days().
// ============================================================================

export const GRACE_DAYS = 7;            // failed payment → locked after this many days
export const NOTICE_DAYS = 30;          // the promise in the Terms: an email at least 30 days before the price changes
export const NOTICE_WINDOW_DAYS = 45;   // start trying to send the notice this far ahead
export const EXTEND_MONTHS = 2;         // length of the extension coupon (Stripe: $50 off, repeating, 2 months)
export const FOUNDER_OFF_CENTS = 5000;

export type Tier = "lookup" | "starter" | "pro";
export const TIERS: Tier[] = ["lookup", "starter", "pro"];
export const SEATS: Record<Tier, number> = { lookup: 1, starter: 2, pro: 5 };
export const REGULAR_CENTS: Record<Tier, number> = { lookup: 6900, starter: 12900, pro: 19900 };
export const PLAN_NAME: Record<Tier, string> = { lookup: "Lookup", starter: "Starter", pro: "Pro" };

const DAY = 86_400_000;
const LIVE = ["active", "trialing", "past_due"];

// price ids of the three plans and of the extra-user add-on (from the STRIPE_PRICE_* secrets)
export type PriceMap = { lookup?: string; starter?: string; pro?: string; seat?: string };

export type Plan = {
  tier: Tier; status: string; seats_included: number; seats_addon: number;
  stripe_subscription_id: string; stripe_customer_id: string;
  current_period_end: string | null; founder_ends_at: string | null; cancel_at: string | null;
};

// the columns of public.subscriptions this file reads
export type SubRow = {
  shop_id?: string; tier?: string; status?: string; seats_included?: number; seats_addon?: number;
  stripe_customer_id?: string | null; stripe_subscription_id?: string | null;
  current_period_end?: string | null; past_due_since?: string | null; founder_ends_at?: string | null;
  price_notice_sent_at?: string | null; price_notice_for?: string | null;
  payment_notice_sent_at?: string | null; lock_notice_sent_at?: string | null; cancel_at?: string | null;
};

const iso = (unix: unknown): string | null => (typeof unix === "number" && unix > 0) ? new Date(unix * 1000).toISOString() : null;
const idOf = (v: unknown): string => typeof v === "string" ? v : String((v as { id?: string } | null)?.id ?? "");

// Stripe's status → the five the subscriptions table allows. "unpaid" and "paused" count as past due
// (the shop locks once the grace runs out); an abandoned first checkout counts as cancelled.
export function mapStatus(s: string): string {
  if (s === "active" || s === "trialing") return s;
  if (s === "canceled" || s === "incomplete_expired") return "canceled";
  if (s === "incomplete") return "incomplete";
  return "past_due";
}

// What a Stripe subscription means for a shop — or null when it is not a Bittings plan at all
// (none of its prices is one of ours), in which case the caller leaves the shop's row alone.
// deno-lint-ignore no-explicit-any
export function planFromSubscription(sub: any, prices: PriceMap): Plan | null {
  if (!sub || !sub.id) return null;
  const byPrice: Record<string, Tier> = {};
  for (const t of TIERS) if (prices[t]) byPrice[prices[t] as string] = t;
  // deno-lint-ignore no-explicit-any
  const items: any[] = (sub.items && sub.items.data) || [];
  let tier: Tier | null = null, addon = 0, periodEnd: unknown = sub.current_period_end;
  for (const it of items) {
    const pid = idOf(it && it.price);
    if (byPrice[pid]) { tier = byPrice[pid]; if (periodEnd == null) periodEnd = it.current_period_end; }
    else if (prices.seat && pid === prices.seat) addon += Math.max(0, Number(it.quantity ?? 0) || 0);
  }
  if (!tier) return null;

  // The founder discount: the latest end among the discounts that HAVE an end. A discount with no
  // end ("forever") means no price change is scheduled.
  // deno-lint-ignore no-explicit-any
  const discs: any[] = [];
  if (Array.isArray(sub.discounts)) for (const d of sub.discounts) if (d && typeof d === "object") discs.push(d);
  if (sub.discount && typeof sub.discount === "object" && !discs.some((d) => d.id === sub.discount.id)) discs.push(sub.discount);
  let end = 0, forever = false;
  for (const d of discs) { if (typeof d.end === "number" && d.end > 0) end = Math.max(end, d.end); else forever = true; }

  const status = mapStatus(String(sub.status ?? ""));
  const cancelAt = typeof sub.cancel_at === "number" ? sub.cancel_at : (sub.cancel_at_period_end ? periodEnd : null);
  return {
    tier, status, seats_included: SEATS[tier], seats_addon: Math.min(addon, 200),
    stripe_subscription_id: String(sub.id), stripe_customer_id: idOf(sub.customer),
    current_period_end: iso(periodEnd),
    founder_ends_at: (status !== "canceled" && !forever && end > 0) ? iso(end) : null,
    cancel_at: iso(cancelAt),
  };
}

// The change to make to the shop's subscriptions row — or null to ignore the report (an OLD
// subscription of the same shop ending must never switch off the one it has now).
export function rowPatch(existing: SubRow | null, plan: Plan, nowMs: number): Record<string, unknown> | null {
  const cur = existing && existing.stripe_subscription_id;
  const planLive = plan.status === "active" || plan.status === "trialing";
  if (cur && cur !== plan.stripe_subscription_id && LIVE.includes(String(existing!.status)) && !planLive) return null;
  if (existing && existing.stripe_customer_id && plan.stripe_customer_id && existing.stripe_customer_id !== plan.stripe_customer_id) return null;

  const p: Record<string, unknown> = {
    status: plan.status, stripe_subscription_id: plan.stripe_subscription_id,
    current_period_end: plan.current_period_end, founder_ends_at: plan.founder_ends_at, cancel_at: plan.cancel_at,
    updated_at: new Date(nowMs).toISOString(),
  };
  if (plan.stripe_customer_id && !(existing && existing.stripe_customer_id)) p.stripe_customer_id = plan.stripe_customer_id;
  if (plan.status === "canceled") {
    // an ended plan: nothing is included any more (other code reads `tier` without looking at `status`)
    p.tier = "lookup";
  } else {
    p.tier = plan.tier; p.seats_included = plan.seats_included; p.seats_addon = plan.seats_addon;
  }
  if (plan.status === "past_due") p.past_due_since = (existing && existing.past_due_since) || new Date(nowMs).toISOString();
  else if (planLive) { p.past_due_since = null; p.payment_notice_sent_at = null; p.lock_notice_sent_at = null; }
  return p;
}

// Has the grace after a failed payment run out? (Mirrors public.billing_state in the database.)
export function graceOver(row: SubRow, nowMs: number): boolean {
  if (row.status !== "past_due" || !row.past_due_since) return false;
  return nowMs >= Date.parse(row.past_due_since) + GRACE_DAYS * DAY;
}

// The founder-price notice.
//   none   — nothing to do (no founder price, already noticed in time, or the shop is leaving first)
//   wait   — more than 45 days to go
//   send   — inside the window and still at least 30 days ahead: send the email now
//   extend — fewer than 30 days left and NO notice on record 30 days ahead: the founder price must
//            be extended (2 more months) so the promise holds; the notice then goes out for the new date
export type NoticeAction = "none" | "wait" | "send" | "extend";
export function noticeDecision(row: SubRow, nowMs: number): { action: NoticeAction; days: number } {
  if (!row.stripe_subscription_id || !LIVE.includes(String(row.status)) || !row.founder_ends_at) return { action: "none", days: 0 };
  const end = Date.parse(row.founder_ends_at);
  if (!(end > nowMs)) return { action: "none", days: 0 };
  const days = (end - nowMs) / DAY;
  if (row.cancel_at && Date.parse(row.cancel_at) <= end) return { action: "none", days };
  const sent = row.price_notice_sent_at ? Date.parse(row.price_notice_sent_at) : NaN;
  const sentFor = row.price_notice_for ? Date.parse(row.price_notice_for) : NaN;
  // a notice counts when it went out 30+ days before the change AND named a date no later than the real one
  if (sent <= end - NOTICE_DAYS * DAY && sentFor <= end + DAY) return { action: "none", days };
  if (days > NOTICE_WINDOW_DAYS) return { action: "wait", days };
  if (days >= NOTICE_DAYS + 0.05) return { action: "send", days };   // 0.05 day ≈ 72 minutes of margin
  return { action: "extend", days };
}

// ---- the emails (plain text) ------------------------------------------------
const money = (c: number) => "$" + (c / 100).toFixed(2).replace(/\.00$/, "");
export function longDate(isoStr: string): string {
  try { return new Date(isoStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Chicago" }); }
  catch (_) { return String(isoStr).slice(0, 10); }
}
const tierOf = (t: unknown): Tier => (TIERS.includes(t as Tier) ? t : "starter") as Tier;
const clean = (s: unknown) => String(s ?? "").replace(/[\r\n<>]+/g, " ").trim().slice(0, 80);

export type Mail = { subject: string; text: string };

export function priceNoticeEmail(o: { shopName: string; tier: string; endsAt: string; appUrl: string }): Mail {
  const t = tierOf(o.tier), reg = REGULAR_CENTS[t], now = reg - FOUNDER_OFF_CENTS, when = longDate(o.endsAt);
  return {
    subject: `Your Bittings founder price ends on ${when}`,
    text: [
      `Hello,`,
      ``,
      `This is the notice we promised: the founder price for ${clean(o.shopName) || "your shop"} ends on ${when}.`,
      ``,
      `From that date your ${PLAN_NAME[t]} plan is ${money(reg)} a month instead of ${money(now)}. Nothing changes before then, and you do not need to do anything.`,
      ``,
      `If you would rather change plans or cancel, you can do that any time before ${when}: open Bittings, then Settings, Payments, "Manage subscription".`,
      `${o.appUrl}`,
      ``,
      `Questions? Just reply to this email.`,
      ``,
      `Bittings`,
    ].join("\n"),
  };
}

export function paymentFailedEmail(o: { shopName: string; lockAt: string; appUrl: string }): Mail {
  const when = longDate(o.lockAt);
  return {
    subject: `Your Bittings payment did not go through`,
    text: [
      `Hello,`,
      ``,
      `The card on file for ${clean(o.shopName) || "your shop"}'s Bittings subscription was declined. We will try it again automatically.`,
      ``,
      `Please update the card by ${when}. After that date Bittings pauses for your shop until the payment clears. Nothing is deleted, and it unlocks by itself as soon as the payment goes through.`,
      ``,
      `To update the card: open Bittings and tap the red bar at the top, or go to Settings, Payments, "Manage subscription".`,
      `${o.appUrl}`,
      ``,
      `Questions? Just reply to this email.`,
      ``,
      `Bittings`,
    ].join("\n"),
  };
}

export function lockedEmail(o: { shopName: string; appUrl: string }): Mail {
  return {
    subject: `Bittings is paused for ${clean(o.shopName) || "your shop"}`,
    text: [
      `Hello,`,
      ``,
      `We still have not been able to collect the payment for ${clean(o.shopName) || "your shop"}'s Bittings subscription, so Bittings is now paused for the shop.`,
      ``,
      `All of your data is safe and nothing has been deleted. Sign in as the owner and update the card; Bittings unlocks by itself as soon as the payment goes through.`,
      `${o.appUrl}`,
      ``,
      `Questions? Just reply to this email.`,
      ``,
      `Bittings`,
    ].join("\n"),
  };
}

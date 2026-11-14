// billing-notices — the DAILY check on every paying shop (8z136; owner, 2026-11-13: "is there a way we can
// build the automated 30-day message so that way if I forget we're not held liable?").
//
// Called once a day by the database's scheduler (pg_cron → pg_net, see
// supabase/phase8/8z136_billing_lock_and_notices.sql). For each shop with a Stripe subscription it:
//   1. re-reads the subscription from Stripe and brings the shop's row in line (a safety net for a
//      report from Stripe that never arrived);
//   2. failed payment: emails the owner if that has not happened yet, and again when the 7 days of
//      grace run out and the shop is paused;
//   3. founder price: 45–30 days before it ends, emails the owner the notice and records the date.
//      If there are fewer than 30 days left and NO notice is on record 30 days ahead, the founder
//      price is EXTENDED by two months (STRIPE_COUPON_FOUNDER_EXT) and the notice goes out for the
//      new date — so the price can never rise without the promised 30 days of warning.
// Anything it could not do is emailed to the Bittings owner (the owner of BILLING_ADMIN_SHOP, else
// MAIL_ONLY_SHOP) and kept in public.billing_runs.
//
// It takes no input and does nothing that is not already due, so it needs no key: calling it by hand
// only makes the due work happen now. It refuses to run more than once every 10 minutes.
// Deploy with --no-verify-jwt.
//
// Env: as billing-io.ts, plus STRIPE_COUPON_FOUNDER_EXT, BILLING_ADMIN_SHOP (optional).
import { EXTEND_MONTHS, graceOver, lockedEmail, noticeDecision, paymentFailedEmail, priceNoticeEmail, GRACE_DAYS, type SubRow } from "../_shared/billing.ts";
import { admin, APP_URL, applySubscription, ownerEmail, sendBillingMail, shopName, stripe, subRow } from "../_shared/billing-io.ts";

const env = (k: string) => (Deno.env.get(k) || "").trim();
const EXT = env("STRIPE_COUPON_FOUNDER_EXT");
const ADMIN_SHOP = env("BILLING_ADMIN_SHOP") || env("MAIL_ONLY_SHOP");
const MIN_GAP_MS = 10 * 60 * 1000;

Deno.serve(async (_req) => {
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
  const now = Date.now();

  const last = await admin.from("billing_runs").select("ran_at").order("ran_at", { ascending: false }).limit(1);
  if (last.error) return json(500, { error: "billing_runs read failed: " + last.error.message });
  if (last.data?.[0] && now - Date.parse(String(last.data[0].ran_at)) < MIN_GAP_MS) return json(200, { ok: true, skipped: "ran a few minutes ago" });
  const run = await admin.from("billing_runs").insert({ summary: { started: true } }).select("id").maybeSingle();
  if (run.error) return json(500, { error: "billing_runs write failed: " + run.error.message });

  const done: Record<string, unknown>[] = [], errors: string[] = [];
  const subs = await admin.from("subscriptions").select("shop_id, stripe_subscription_id").not("stripe_subscription_id", "is", null);
  if (subs.error) errors.push("subscriptions read failed: " + subs.error.message);

  for (const s of (subs.data ?? [])) {
    const shopId = String(s.shop_id), tag = shopId.slice(0, 8);
    try {
      // 1. in line with Stripe
      let row: SubRow | null = null;
      try { const r = await applySubscription(String(s.stripe_subscription_id), shopId); row = r.row ?? await subRow(shopId); }
      catch (e) { errors.push(`${tag}: could not read the subscription from Stripe (${String((e as Error).message).slice(0, 160)})`); row = await subRow(shopId); }
      if (!row) continue;
      const name = await shopName(shopId);

      // 2. failed payment
      if (row.status === "past_due") {
        if (!row.payment_notice_sent_at) {
          const lockAt = new Date(Date.parse(row.past_due_since || new Date(now).toISOString()) + GRACE_DAYS * 86_400_000).toISOString();
          const m = await sendBillingMail(shopId, "payment_failed", await ownerEmail(shopId), paymentFailedEmail({ shopName: name, lockAt, appUrl: APP_URL }));
          if (m.ok) { await admin.from("subscriptions").update({ payment_notice_sent_at: new Date().toISOString() }).eq("shop_id", shopId); done.push({ shop: tag, did: "payment_failed email" }); }
          else errors.push(`${tag}: payment-failed email not sent (${m.error})`);
        }
        if (graceOver(row, now) && !row.lock_notice_sent_at) {
          const m = await sendBillingMail(shopId, "locked", await ownerEmail(shopId), lockedEmail({ shopName: name, appUrl: APP_URL }));
          if (m.ok) { await admin.from("subscriptions").update({ lock_notice_sent_at: new Date().toISOString() }).eq("shop_id", shopId); done.push({ shop: tag, did: "paused email" }); }
          else errors.push(`${tag}: paused email not sent (${m.error})`);
        }
      }

      // 3. founder price
      let d = noticeDecision(row, now);
      if (d.action === "extend") {
        if (!EXT) errors.push(`${tag}: URGENT — the founder price ends in ${d.days.toFixed(1)} days with no 30-day notice on record, and it could not be extended (STRIPE_COUPON_FOUNDER_EXT is not set). Extend the discount in Stripe by hand.`);
        else {
          await stripe.subscriptions.update(String(row.stripe_subscription_id), { discounts: [{ coupon: EXT }] });
          const r = await applySubscription(String(row.stripe_subscription_id), shopId);
          row = r.row ?? await subRow(shopId) ?? row;
          done.push({ shop: tag, did: `founder price extended ${EXTEND_MONTHS} months (no notice was on record 30 days ahead)`, new_end: row.founder_ends_at });
          try { await admin.from("audit_log").insert({ action: "billing_founder_extended", entity_type: "subscriptions", entity_id: shopId, role: "system", detail: { new_end: row.founder_ends_at, days_left_before: d.days }, shop_id: shopId }); } catch (_) { /* log only */ }
          d = noticeDecision(row, now);
        }
      }
      if (d.action === "send" && row.founder_ends_at) {
        const sentAt = new Date().toISOString();
        const m = await sendBillingMail(shopId, "price_notice", await ownerEmail(shopId), priceNoticeEmail({ shopName: name, tier: String(row.tier), endsAt: row.founder_ends_at, appUrl: APP_URL }));
        if (m.ok) {
          const up = await admin.from("subscriptions").update({ price_notice_sent_at: sentAt, price_notice_for: row.founder_ends_at }).eq("shop_id", shopId);
          if (up.error) errors.push(`${tag}: the price notice WAS emailed but could not be recorded (${up.error.message})`);
          else done.push({ shop: tag, did: "price notice email", for: row.founder_ends_at });
        } else errors.push(`${tag}: price notice not sent, ${d.days.toFixed(1)} days before the founder price ends (${m.error}). It is tried again tomorrow; the price will not rise without it.`);
      }
    } catch (e) { errors.push(`${tag}: ${String((e as Error).message).slice(0, 240)}`); }
  }

  // tell the Bittings owner about anything that did not work
  let alerted = false;
  if (errors.length && ADMIN_SHOP) {
    const m = await sendBillingMail(ADMIN_SHOP, "admin_alert", await ownerEmail(ADMIN_SHOP), {
      subject: `Bittings billing check: ${errors.length} thing${errors.length === 1 ? "" : "s"} need${errors.length === 1 ? "s" : ""} a look`,
      text: "The daily billing check could not finish everything:\n\n" + errors.map((e) => "- " + e).join("\n") + "\n\n(Shops are shown by the first 8 characters of their id.)",
    });
    alerted = m.ok;
  }
  const summary = { shops: (subs.data ?? []).length, done, errors, alerted, ms: Date.now() - now };
  await admin.from("billing_runs").update({ summary }).eq("id", run.data!.id);
  // anyone can call this address, so the answer carries counts only — the detail is in public.billing_runs
  return json(200, { ok: errors.length === 0, shops: summary.shops, done: done.length, errors: errors.length });
});

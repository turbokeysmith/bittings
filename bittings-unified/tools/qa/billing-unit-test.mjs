// 8z136 — unit test of Bittings' own subscription billing rules (supabase/functions/_shared/billing.ts), the SAME file the server runs. No network, no Stripe. Run: node tools/qa/billing-unit-test.mjs
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const B = await import(pathToFileURL(path.resolve(here, '..', '..', 'supabase', 'functions', '_shared', 'billing.ts')).href);

const out = []; let failed = 0;
const check = (name, ok, detail) => { out.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 400) : '')); if (!ok) failed++; };

const NOW = Date.parse('2027-06-01T12:00:00Z');
const DAY = 86400000;
const P = { lookup: 'price_L', starter: 'price_S', pro: 'price_P', seat: 'price_SEAT' };
const unix = (ms) => Math.floor(ms / 1000);
const isoAt = (ms) => new Date(ms).toISOString();
const sub = (items, extra = {}) => ({ id: 'sub_1', status: 'active', customer: 'cus_1', current_period_end: unix(NOW + 20 * DAY), items: { data: items }, ...extra });
const it = (id, extra = {}) => ({ price: { id }, ...extra });

// ---- constants ----
check('The grace after a failed payment is 7 days', B.GRACE_DAYS === 7, B.GRACE_DAYS);
check('The price-change notice must go out at least 30 days ahead', B.NOTICE_DAYS === 30, B.NOTICE_DAYS);
check('Users included: Lookup 1, Starter 2, Pro 5', JSON.stringify(B.SEATS) === JSON.stringify({ lookup: 1, starter: 2, pro: 5 }), B.SEATS);
check('Regular monthly prices: Lookup $69, Starter $129, Pro $199', B.REGULAR_CENTS.lookup === 6900 && B.REGULAR_CENTS.starter === 12900 && B.REGULAR_CENTS.pro === 19900, B.REGULAR_CENTS);

// ---- mapStatus ----
const ms = B.mapStatus;
check('Stripe "active" stays active', ms('active') === 'active');
check('Stripe "trialing" stays trialing', ms('trialing') === 'trialing');
check('Stripe "canceled" is canceled', ms('canceled') === 'canceled');
check('An abandoned first checkout (incomplete_expired) counts as canceled', ms('incomplete_expired') === 'canceled');
check('A first checkout still in progress (incomplete) stays incomplete', ms('incomplete') === 'incomplete');
check('past_due, unpaid and paused all count as past due', ['past_due', 'unpaid', 'paused'].every(s => ms(s) === 'past_due'));

// ---- planFromSubscription ----
let p = B.planFromSubscription(sub([it('price_S')]), P);
check('A Starter subscription gives tier Starter with 2 users included and no extra users', p && p.tier === 'starter' && p.seats_included === 2 && p.seats_addon === 0, p);
p = B.planFromSubscription(sub([it('price_P')]), P);
check('A Pro subscription gives tier Pro with 5 users included', p && p.tier === 'pro' && p.seats_included === 5, p);
p = B.planFromSubscription(sub([it('price_L')]), P);
check('A Lookup subscription gives tier Lookup with 1 user included', p && p.tier === 'lookup' && p.seats_included === 1, p);
p = B.planFromSubscription(sub([it('price_S'), it('price_SEAT', { quantity: 3 })]), P);
check('Three extra-user add-ons on a Starter plan count as 3 extra users', p && p.tier === 'starter' && p.seats_addon === 3, p);
p = B.planFromSubscription(sub([{ price: { id: 'price_P' } }], { customer: { id: 'cus_9' } }), P);
check('The normal Stripe shape (price and customer as objects) is understood', p && p.tier === 'pro' && p.stripe_customer_id === 'cus_9', p);
p = B.planFromSubscription(sub([{ price: 'price_S' }], { customer: 'cus_2' }), P);
check('Price and customer given as plain strings also work', p && p.tier === 'starter' && p.stripe_customer_id === 'cus_2', p);
check('A subscription with none of our prices is not a Bittings plan (ignored)', B.planFromSubscription(sub([it('price_OTHER')]), P) === null);
check('A missing subscription is ignored', B.planFromSubscription(null, P) === null && B.planFromSubscription(undefined, P) === null);
check('A subscription without an id is ignored', B.planFromSubscription({ items: { data: [it('price_S')] } }, P) === null);

const X = unix(NOW + 100 * DAY), Y = unix(NOW + 160 * DAY);
p = B.planFromSubscription(sub([it('price_S')], { discount: { id: 'di_1', end: X } }), P);
check('A founder discount with an end date gives that moment as the founder price end', p && p.founder_ends_at === isoAt(X * 1000), p && p.founder_ends_at);
p = B.planFromSubscription(sub([it('price_S')], { discounts: [{ id: 'di_1', end: X }, { id: 'di_2', end: Y }] }), P);
check('With several discounts the LATER end date is the founder price end', p && p.founder_ends_at === isoAt(Y * 1000), p && p.founder_ends_at);
p = B.planFromSubscription(sub([it('price_S')], { discounts: ['di_1'], discount: { id: 'di_1', end: X } }), P);
check('Unexpanded discount ids are skipped and the expanded discount is used', p && p.founder_ends_at === isoAt(X * 1000), p && p.founder_ends_at);
p = B.planFromSubscription(sub([it('price_S')], { discount: { id: 'di_1', end: null } }), P);
check('A discount that never ends means no price change is scheduled', p && p.founder_ends_at === null, p && p.founder_ends_at);
p = B.planFromSubscription(sub([it('price_S')]), P);
check('No discount means no founder price end', p && p.founder_ends_at === null, p && p.founder_ends_at);
p = B.planFromSubscription(sub([it('price_S')], { status: 'canceled', discount: { id: 'di_1', end: X } }), P);
check('A canceled subscription has no founder price end', p && p.status === 'canceled' && p.founder_ends_at === null, p);

const CPE = unix(NOW + 20 * DAY);
p = B.planFromSubscription(sub([it('price_S')]), P);
check('The billing period end comes from the subscription', p && p.current_period_end === isoAt(CPE * 1000), p && p.current_period_end);
const s2 = sub([it('price_S', { current_period_end: unix(NOW + 25 * DAY) })]); delete s2.current_period_end;
p = B.planFromSubscription(s2, P);
check("When the subscription has no period end, the plan item's period end is used", p && p.current_period_end === isoAt(unix(NOW + 25 * DAY) * 1000), p && p.current_period_end);

const CA = unix(NOW + 40 * DAY);
p = B.planFromSubscription(sub([it('price_S')], { cancel_at: CA }), P);
check('A scheduled cancel date is passed through', p && p.cancel_at === isoAt(CA * 1000), p && p.cancel_at);
p = B.planFromSubscription(sub([it('price_S')], { cancel_at_period_end: true }), P);
check('Cancel-at-period-end with no cancel date cancels at the period end', p && p.cancel_at === p.current_period_end && p.cancel_at !== null, p);
p = B.planFromSubscription(sub([it('price_S')]), P);
check('With no cancellation scheduled there is no cancel date', p && p.cancel_at === null, p && p.cancel_at);
p = B.planFromSubscription(sub([it('price_S')], { status: 'unpaid' }), P);
check('An unpaid subscription is treated as past due', p && p.status === 'past_due', p && p.status);

// ---- rowPatch ----
const plan = (o = {}) => ({ tier: 'starter', status: 'active', seats_included: 2, seats_addon: 1, stripe_subscription_id: 'sub_1', stripe_customer_id: 'cus_1', current_period_end: null, founder_ends_at: null, cancel_at: null, ...o });
let r = B.rowPatch({ shop_id: 's', tier: 'lookup', status: 'incomplete' }, plan(), NOW);
check('A new active Starter plan sets tier, status, users, subscription id and the customer id, and clears past-due',
  r && r.tier === 'starter' && r.status === 'active' && r.seats_included === 2 && r.seats_addon === 1 && r.stripe_subscription_id === 'sub_1' && r.stripe_customer_id === 'cus_1' && r.past_due_since === null, r);
r = B.rowPatch({ stripe_customer_id: 'cus_1' }, plan(), NOW);
check('A customer id already on the row is not written again', r && !('stripe_customer_id' in r), r);
check("A report from a different Stripe customer than the shop's is ignored", B.rowPatch({ stripe_customer_id: 'cus_1' }, plan({ stripe_customer_id: 'cus_OTHER' }), NOW) === null);

r = B.rowPatch({ stripe_subscription_id: 'sub_1', past_due_since: null }, plan({ status: 'past_due' }), NOW);
check('The first failed payment starts the grace clock at the current time', r && r.past_due_since === isoAt(NOW), r && r.past_due_since);
const orig = isoAt(NOW - 3 * DAY);
r = B.rowPatch({ stripe_subscription_id: 'sub_1', past_due_since: orig }, plan({ status: 'past_due' }), NOW);
check('A repeated failed payment keeps the ORIGINAL date (the grace does not restart)', r && r.past_due_since === orig, r && r.past_due_since);
r = B.rowPatch({ stripe_subscription_id: 'sub_1', status: 'past_due', past_due_since: orig, payment_notice_sent_at: orig, lock_notice_sent_at: orig }, plan(), NOW);
check('Paying again clears the past-due date and both payment notices', r && r.past_due_since === null && r.payment_notice_sent_at === null && r.lock_notice_sent_at === null, r);
r = B.rowPatch({ stripe_subscription_id: 'sub_1', status: 'active' }, plan({ status: 'canceled' }), NOW);
check('A canceled plan drops the shop back to Lookup and leaves the user counts alone', r && r.tier === 'lookup' && r.status === 'canceled' && !('seats_included' in r), r);

check('An OLD subscription ending is ignored while the shop is active on a newer one',
  B.rowPatch({ stripe_subscription_id: 'sub_NEW', status: 'active' }, plan({ stripe_subscription_id: 'sub_OLD', status: 'canceled' }), NOW) === null);
check('A report for a different subscription that is active is applied',
  B.rowPatch({ stripe_subscription_id: 'sub_NEW', status: 'active' }, plan({ stripe_subscription_id: 'sub_OLD', status: 'active' }), NOW) !== null);
check("When the shop's old subscription is canceled, a new one still being set up is applied",
  B.rowPatch({ stripe_subscription_id: 'sub_OLD', status: 'canceled' }, plan({ stripe_subscription_id: 'sub_NEW', status: 'incomplete' }), NOW) !== null);

// ---- graceOver ----
const gr = (status, days) => B.graceOver({ status, past_due_since: days == null ? null : isoAt(NOW - days * DAY) }, NOW);
check('6.9 days after a failed payment the shop is still in grace', gr('past_due', 6.9) === false);
check('7.1 days after a failed payment the grace is over', gr('past_due', 7.1) === true);
check('An active shop is never past its grace', gr('active', 30) === false);
check('A past-due shop with no past-due date is not locked', gr('past_due', null) === false);

// ---- noticeDecision ----
const nd = (days, extra = {}) => B.noticeDecision({ stripe_subscription_id: 'sub_1', status: 'active', founder_ends_at: days == null ? null : isoAt(NOW + days * DAY), ...extra }, NOW).action;
check('No founder price end means no notice is needed', nd(null) === 'none');
check('Without a subscription there is no notice', nd(40, { stripe_subscription_id: null }) === 'none');
check('A canceled shop gets no notice', nd(40, { status: 'canceled' }) === 'none');
check('A founder end already in the past needs nothing', nd(-1) === 'none');
check('100 days ahead with no notice: wait', nd(100) === 'wait');
check('45.5 days ahead: still wait (window opens at 45)', nd(45.5) === 'wait');
check('44 days ahead: send the notice', nd(44) === 'send');
check('30.5 days ahead: send the notice', nd(30.5) === 'send');
check('30.01 days ahead is inside the safety margin: extend the founder price', nd(30.01) === 'extend');
check('29 days ahead with no notice: extend the founder price', nd(29) === 'extend');
check('3 days ahead with no notice: extend the founder price', nd(3) === 'extend');

const endAt = (d) => NOW + d * DAY;
check('A notice sent 31 days before the end, naming the right date, counts', nd(10, { price_notice_sent_at: isoAt(endAt(10) - 31 * DAY), price_notice_for: isoAt(endAt(10)) }) === 'none');
check('A notice sent only 20 days before the end is too late to count: extend', nd(10, { price_notice_sent_at: isoAt(endAt(10) - 20 * DAY), price_notice_for: isoAt(endAt(10)) }) === 'extend');
check('After an extension, an earlier notice for an earlier date still counts (sent 30+ days before the new end, date not later than the real one)',
  nd(50, { price_notice_sent_at: isoAt(NOW - 20 * DAY), price_notice_for: isoAt(endAt(50) - 60 * DAY) }) === 'none');
check('A notice that named a date LATER than the real end does not count: send a fresh one',
  nd(35, { price_notice_sent_at: isoAt(NOW - 100 * DAY), price_notice_for: isoAt(endAt(35) + 40 * DAY) }) === 'send');
check('If the shop cancels before the founder price ends, no notice is needed', nd(35, { cancel_at: isoAt(endAt(35) - 5 * DAY) }) === 'none');
check('If the shop cancels after the founder price ends, the normal decision applies', nd(35, { cancel_at: isoAt(endAt(35) + 5 * DAY) }) === 'send');
check('A past-due shop 40 days from the change still gets the notice', nd(40, { status: 'past_due' }) === 'send');

{ // the "email keeps failing" walk-through
  const ends = NOW + 46 * DAY; const row = { stripe_subscription_id: 'sub_1', status: 'active', founder_ends_at: isoAt(ends) };
  const at = (n) => B.noticeDecision(row, ends - n * DAY).action;
  check('Walk-through: 46 days out with no notice, we wait', at(46) === 'wait');
  let allSend = true; for (let d = 45; d >= 31; d--) if (at(d) !== 'send') allSend = false;
  check('Walk-through: every day from 45 down to 31 days out says send (the email keeps being retried)', allSend);
  check('Walk-through: at 30.5 days it still says send', at(30.5) === 'send');
  check('Walk-through: at 30 days with the email never sent it says extend', at(30) === 'extend');
  const later = { ...row, founder_ends_at: isoAt(NOW + 61 * DAY) };
  check('Walk-through: after the 2-month extension the shop is back to waiting', B.noticeDecision(later, NOW).action === 'wait');
}

// ---- emails ----
let m = B.priceNoticeEmail({ shopName: 'TEST Shop', tier: 'starter', endsAt: '2027-12-14T18:00:00Z', appUrl: 'https://bittings.app' });
check('The price notice subject names the end date (December 14, 2027)', m.subject.includes('December 14, 2027'), m.subject);
check('The Starter notice says $129 a month, $79, Starter, the shop name and the app link', ['$129 a month', '$79', 'Starter', 'TEST Shop', 'https://bittings.app'].every(s => m.text.includes(s)), m.text);
m = B.priceNoticeEmail({ shopName: 'TEST Shop', tier: 'pro', endsAt: '2027-12-14T18:00:00Z', appUrl: 'https://bittings.app' });
check('The Pro notice says $199 and $149', m.text.includes('$199') && m.text.includes('$149'));
m = B.priceNoticeEmail({ shopName: 'TEST Shop', tier: 'lookup', endsAt: '2027-12-14T18:00:00Z', appUrl: 'https://bittings.app' });
check('The Lookup notice says $69 and $19', m.text.includes('$69') && m.text.includes('$19'));
let threw = false; try { B.priceNoticeEmail({ shopName: 'TEST Shop', tier: 'mystery', endsAt: '2027-12-14T18:00:00Z', appUrl: 'https://bittings.app' }); } catch (_) { threw = true; }
check('An unknown plan name does not crash the notice email', !threw);
m = B.paymentFailedEmail({ shopName: 'TEST Shop', lockAt: '2027-06-08T18:00:00Z', appUrl: 'https://bittings.app' });
check('The payment-failed email gives the lock date and says nothing is deleted', m.text.includes('June 8, 2027') && m.text.includes('Nothing is deleted'), m.text);
m = B.lockedEmail({ shopName: 'TEST Shop', appUrl: 'https://bittings.app' });
check('The locked email names the shop and says nothing has been deleted', m.subject.includes('TEST Shop') && /nothing has been deleted/i.test(m.text), m);
m = B.lockedEmail({ shopName: 'Bad<script>\nShop', appUrl: 'https://bittings.app' });
check('A shop name with "<" or a line break is cleaned in the email subject', !m.subject.includes('<') && !m.subject.includes('\n'), m.subject);
m = B.priceNoticeEmail({ shopName: 'Bad<script>\nShop', tier: 'starter', endsAt: '2027-12-14T18:00:00Z', appUrl: 'https://bittings.app' });
check('The same cleaning applies to the price notice subject and text', !m.subject.includes('<') && !m.subject.includes('\n') && !m.text.includes('<script'), m.subject);

console.log(out.join('\n'));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);

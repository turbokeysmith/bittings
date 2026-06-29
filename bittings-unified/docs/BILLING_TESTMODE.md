# Stripe billing + Connect 1% split — TEST MODE runbook

**Status: BUILT, not yet proven end-to-end — needs your Stripe TEST keys + price ids.**
Everything here is **test mode**. Do **not** switch to live keys. Nothing here charges real money.

## What's built
- **Tier gating** (`supabase/phase4/4a_tiers.sql`, `app/tier.js`) — server-enforced; UI locks + upgrade modal. ✅ verified offline.
- **Subscription checkout** — `supabase/functions/billing-checkout` → Stripe Checkout (subscription) for a tier.
- **Webhook** — `supabase/functions/billing-webhook` → flips `subscriptions.tier` on subscription events (the *only* tier writer; signature-verified).
- **Connect onboarding** — `supabase/functions/connect-onboard` → creates the shop's Express account for the 1% split.
- **Client** — `app/billing.js` (`TKS_BILLING`); `TKS_TIER.startCheckout()` already calls it.

## What I need from you to PROVE it (test mode, free)
1. A **Stripe account** with **test mode** on + **Connect enabled** (Settings → Connect → "Get started", test).
2. **Test API keys**: `sk_test_…` (secret) and the **webhook signing secret** (`whsec_…` from the test webhook endpoint).
3. **Two test Products/Prices** (recurring/monthly), test mode: **Starter** and **Pro** → their `price_…` ids.
   (I can create these via the API once I have your `sk_test_…`, or you make them in the dashboard.)

## Setup (once you provide the above)
```bash
# from turbokeysmith-main/bittings-unified
supabase functions deploy billing-checkout billing-webhook connect-onboard
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx STRIPE_WEBHOOK_SECRET=whsec_xxx \
  STRIPE_PRICE_STARTER=price_xxx STRIPE_PRICE_PRO=price_xxx APP_URL=https://app.turbokeysmith.com
# Apply the SQL in the Supabase SQL editor: phase4/4a_tiers.sql then phase4/4b_billing.sql
# Add the webhook endpoint in Stripe (test): https://<project>.functions.supabase.co/billing-webhook
#   events: checkout.session.completed, customer.subscription.created/updated/deleted
```
Then load `app/billing.js` is already wired; click **Upgrade ↑** in the app → Stripe test Checkout →
use card `4242 4242 4242 4242` → webhook flips the tier → locks lift. That proves the flow end-to-end.

## The 1% revenue split (Connect) — PATCH for pay-create-intent (NOT applied)
To keep the money/charge path untouched before your demo, this is provided as a deliberate one-line
change for `supabase/functions/pay-create-intent/index.ts` — apply it when you're ready to test the split:

```ts
// look up the shop's connected account (from subscriptions.stripe_connect_id), then on the
// PaymentIntent add the platform fee + route the charge to the connected account:
const fee = Math.round(base_cents * 0.01);                 // 1% platform fee (Bittings)
const pi = await stripe.paymentIntents.create({
  amount: authorized_cents, currency: "usd", /* …existing args… */
  application_fee_amount: fee,
  transfer_data: { destination: shopConnectId },           // shop receives amount − 1%
});
```
Test it with a connected **test** account (`connect-onboard` → fill the Stripe test onboarding) and a
test card; verify in the Stripe test dashboard that the PaymentIntent shows a 1% application fee and
the transfer to the connected account. **No live keys, ever, for this.**

## Guardrails
- Clients can only **read** their tier (RLS); only the **webhook** (service_role) writes it — no client-side upgrade bypass.
- `require_tier()` re-checks on the server for any RPC you choose to gate.
- Tier gating ≠ tenant isolation — see `SECURITY_AUDIT_PHASE4.md` (multi-tenant data isolation is a separate, prerequisite effort before live billing).

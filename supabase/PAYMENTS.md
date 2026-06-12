# Portal Payments — architecture & operations (single-shop, TEST mode)

Built per the TurboStripe audit **Option B**: a fresh implementation in the portal's web stack
(**Supabase Edge Functions + Stripe.js**), **single-account direct charges** (NOT Connect).
Everything is **TEST mode** until a fresh `sk_live_` is swapped in and one real charge is verified.

## Two entry points into the same engine
1. **Invoice → Pay Now** (Receipts / `bittings.html`): pays a finished invoice by id.
2. **Payments tile → New Charge** (`index.html` + `app/pay.js`): for no-invoice jobs (lockouts /
   walk-ups) — enter amount + service label + optional customer name/email; it auto-creates a
   **minimal receipt** (so there's still a server-side authoritative total + a `payment_transactions`
   row + it shows in Stripe), files into the customer's history if a name/email is given, else
   anonymous. Owner-gated. Both upsert a receipt then call the same `pay-*` functions — the client
   never sends an amount.

Both entry points offer three tenders: **💳 Card** (reader or typed, 2% credit-only surcharge),
**💵 Cash**, and **🧾 Check**. Cash/check go through `pay-record` — **no Stripe, no surcharge** —
and still write a `payment_transactions` row so they appear in the day closeout.

## Owner-only money tiles
Two **owner-only** Home tiles (hidden for a signed-in trainee; shown to the owner or on an
un-signed-in device — `ownerVisible()` / `syncOwnerTiles()` in `index.html`):

**🧮 Closeout** (`view-history`) — today's **drawer count**. `TKPay.dayTransactions(from,to)` →
summary chips (**collected**, # charges, **card / cash / check** split, **surcharge**, **refunded**)
over a row list (time · method · funding · status · amount).

**📊 Transaction History** (`view-reports`) — analytics. Lands on **today** (the "daily reset" is
just the default view — nothing is deleted; every charge stays filed under its customer via its
receipt). Controls: a **period** dropdown (Today / Week / Month / Quarter / Year) and a **graph-type**
dropdown (bar / line / area / pie / doughnut, via **Chart.js**). Four metric cards — **Total Jobs /
Sales / Cost / Profit** — each **toggleable** (choice persisted in `localStorage`); toggles drive both
the cards and the graph series. Bar/line/area plot the selected metrics bucketed over the period
(money on the left axis, job-count on the right); pie/doughnut show **Sales by payment method**.

**Cost & Profit + technician (WIRED).** A sale built in the receipt builder (`bittings.html`) can
reference real **Inventory parts** (Quick-invoice line picker + an owner-only "📦 From Inventory"
option in the chat), capturing each part's stored **cost** on the line (`{partId, qty, unitCost,
cost}`, `cost = unitCost × qty`) behind the customer's sale price; a **manual per-line cost box**
covers non-inventory/one-off lines; labor/no-part lines = **$0**. The receipt also carries a
`technician`. `pay-create-intent` and `pay-record` read these **server-side from the stored receipt**
(client never sends cost) → fill `payment_transactions.cost_cents` (sum of non-discount line costs)
and `technician`. So **Total Cost / Total Profit** (`profit = captured_cents − coalesce(cost_cents,0)`)
and the technician now show real numbers in Transaction History. The per-technician *filter* + a
refund/void *button* are the remaining slivers.

**Inventory stock on a sale.** When a sale is **paid/completed** (cash/check, a Paid-in-Full receipt,
or a successful Pay Now), each part line's qty is **subtracted from stock** — only once (guarded by a
`stockApplied` flag on the receipt), never on a draft. Voiding/deleting a paid sale **adds the stock
back**. Low-stock is derived (`Inventory.isLow`), so the flag trips automatically.

## Why this shape
- **One auth/session:** the portal calls the functions with the staff member's **existing Supabase
  session JWT** (`verify_jwt: true`) — no second login; works from mobile.
- **One datastore:** transactions live in Supabase next to invoices → invoice-integrated charging is
  a first-class feature, not a cross-service hop.
- **Secret stays server-side:** `STRIPE_SECRET_KEY` is a Supabase **edge-function secret**; never in
  the browser, never in git.
- **PCI SAQ-A:** card data only ever hits the reader or Stripe.js Elements — never our code.

## Verified before building (spikes, then retired)
- `stripe-node@16` runs in Supabase's Deno edge runtime (`createFetchHttpClient`, `constructEventAsync`).
- Full **server-driven Terminal** flow works from an edge function (simulated WisePOS E).
- **Credit-only surcharge is enforceable**: manual-capture, read `card_present.funding`, capture
  base-only for debit/prepaid (Stripe releases the uncaptured surcharge), capture base+2% for credit.
- Typed-card create returns a `client_secret` for the Payment Element.

## The surcharge mechanic (Oklahoma SB 677: 2% credit-only; debit/prepaid never)
1. `pay-create-intent` authorizes **base + 2%** with **`capture_method: 'manual'`**.
2. On authorization the verified webhook (`payment_intent.amount_capturable_updated`) reads the
   card **funding**; captures **base+2% only if `funding === 'credit'`**, otherwise **base only**.
3. Disclosure (“2% surcharge on credit cards”) must be shown **before** charging (signage + on-screen).

## Edge functions (deployed)
| Function | Auth | Purpose |
|---|---|---|
| `pay-create-intent` | session JWT | `{invoiceId, method:'reader'|'keyed', readerId?, attempt?, orgId?, connectedAccountId?}` → looks up the receipt **server-side** for the authoritative base (`totals.total − totals.surcharge`), creates a manual-capture PI (base+2%), records a `payment_transactions` row (with a `description` for closeout), and (reader) sends it to the WisePOS E. Idempotent per `inv_<id>_attempt_<n>`. Returns `{paymentIntentId, clientSecret?}`. |
| `pay-record` | session JWT | `{invoiceId, method:'cash'|'check', orgId?, connectedAccountId?}` → **cash/check, no Stripe**. Reads the receipt's authoritative base, inserts a `completed` `payment_transactions` row (surcharge 0, captured = base, `description`). Idempotent per `inv_<id>_<method>`. |
| `stripe-webhook` | **signature-verified** | The **source of truth**. Captures the credit-only surcharge on authorization; marks `completed` on `payment_intent.succeeded`; `failed`/`canceled` accordingly; reader failures via `terminal.reader.action_failed`. Event-id idempotent via `payment_events`. |
| `pay-status` | session JWT | `{paymentIntentId}` → transaction row for UI polling (status, funding, surcharge_applied, captured). **Never** the authoritative paid flag — that's webhook-only. |
| `pay-refund` | session JWT | `{paymentIntentId, amountCents?}` → full/partial refund of a `completed` transaction. |
| `pay-terminal` | session JWT | `{action:'list'|'simulate'|'cancel', readerId?, locationId?, debit?, declined?}` → list readers/locations; **simulate-tap** (test only); cancel a reader action (failure UX). |

All take optional `orgId` / `connectedAccountId` (ignored single-shop) so multi-tenant + Connect are
a clean add-on later.

## Secrets (Supabase → Edge Functions → Secrets)
- `STRIPE_SECRET_KEY` = `sk_test_…`  **(set ✓)**. At cutover, replace with `sk_live_…` in this same slot.
- `STRIPE_WEBHOOK_SECRET` = `whsec_…`  **(TODO — see below)**.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by Supabase.

## YOUR remaining setup steps (TEST)
1. **Register the webhook** (Stripe Dashboard, **Test mode** → Developers → Webhooks → Add endpoint):
   - URL: `https://gcshuhlksjznksspbigl.supabase.co/functions/v1/stripe-webhook`
   - Events: `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`,
     `payment_intent.payment_failed`, `payment_intent.canceled`, `terminal.reader.action_failed`.
   - Copy the **Signing secret** (`whsec_…`) → set it as `STRIPE_WEBHOOK_SECRET` (secrets, above).
2. Ensure **Terminal** is enabled in Stripe; in test you can use a **simulated WisePOS E** (a test
   Location + simulated reader already exist from the spike: "Spike Test Location").
3. (Next build) the portal **Pay Now** UI — see below.

## Rehearsal — PASSED end-to-end through the live verified webhook (TEST)
- **Credit** (`4242`): funding=credit → **2% applied** → captured **$102.00** of a $100 invoice.
- **Debit** (`…5556`): funding=debit → **no surcharge** → captured **$100.00** (surcharge released).
- **Refund**: $102.00 → succeeded. **Keyed-create**: returns `client_secret`. **Idempotency**:
  same invoice+attempt → `reused`, same PI (no double charge). Webhook **rejects unsigned** (400).

## Status
- ✅ Schema + **service_role grants** (`supabase/payments_setup.sql`).
- ✅ Edge functions deployed (TEST), bugfixed (empty-options), and **rehearsed end-to-end**.
- ✅ **Pay Now UI** in `bittings.html`: after finishing an invoice → **💳 Pay Now** → reader path
  (WisePOS E, with test simulate Credit/Debit/Decline) + typed-card **Payment Element** path; shows
  the 2% credit disclosure; polls `pay-status`; surfaces approve/decline/cancel/timeout. Receipts now
  get a stable `id` and are **upserted to Supabase on Pay Now** so the server reads the authoritative
  total. (Typed-card path prompts once for your `pk_test_…` publishable key, stored locally.)
- ⬜ **YOUR (browser test):** sign in, build an invoice, Pay Now → Reader → Simulate Credit/Debit;
  then Type card with `4242 4242 4242 4242`. Confirm amounts in the Stripe **test** dashboard.
- ⬜ Cutover: swap `sk_live_` (same secret slot) + a real `pk_live_`, one real charge, then retire
  `TurboStripe.exe` + rotate the old key. Edge function `apiVersion` is `2024-06-20`; webhook
  endpoint is `2023-10-16` — compatible (handler re-fetches the PI), bump later if desired.
- ✅ Edge-function sources version-controlled in `supabase/functions/` (6: the 5 above + `pay-record`).
- ✅ **Cash / check** tenders (`pay-record`) — no surcharge; **Day-closeout history** (`view-history`,
  `TKPay.dayTransactions`) breaking down collected by card/cash/check + surcharge + refunds. Cash path
  rehearsed ($25 → recorded `completed`, surcharge 0).
- ✅ **Owner-only tiles**: **Closeout** (drawer) + **Transaction History** (period dropdown + Chart.js
  graph + toggleable Total Jobs/Sales/Cost/Profit cards). Added `cost_cents` + `technician` columns
  (migration `payment_transactions_cost_and_technician`) so Profit + per-tech commission are a no-rework
  add-on once parts/tech get linked to a sale.

## Test plan (once the webhook secret is set)
Reader: create a receipt (synced) → `pay-create-intent {invoiceId, method:'reader', readerId}` →
`pay-terminal {action:'simulate', readerId}` (default 4242 = credit → 2% applied; `debit:true` →
no surcharge) → `pay-status` shows `completed`. Typed-card: `method:'keyed'` → Payment Element →
test card `4242 4242 4242 4242`. Verify amounts in the Stripe **test** dashboard.

# Security & Multi-Tenant Audit — punch-list (DOCUMENT ONLY, not fixed)

**Scope:** posture review of shop-data isolation, RLS, and payment-data exposure across
tenants, ahead of selling subscription tiers. **Per the brief this is findings only — nothing
here was changed.** Reviewed: `supabase/phase1–phase4/*.sql`, `supabase/payments_setup.sql`,
`supabase/functions/pay-create-intent/index.ts`, `app/store.js` (data layer), `1d_cost_view.sql`.

Severity: 🔴 must-address-before-multi-tenant · 🟠 significant · 🟡 hardening · 🟢 already-good.

---

## 🔴 1. The backend is effectively SINGLE-TENANT — RLS gates on ROLE, not on shop
Every RLS policy reviewed gates on **role** (`is_staff()` / `is_manager()` / `is_owner()`) and
**never on `shop_id`**. `staff.shop_id` exists but is commented *"nullable now; future
multi-tenant"* and is not referenced by any policy. There is **no `shops` table, no user→shop
membership table, and no tenant predicate** on `customers`, `inventory`, `bookings`, `receipts`,
`payment_transactions`, `commission_*`, `vans`, `job_staff`, or `move_requests`.

- **Examples:** `customers` → `using (is_staff() …)`; `inventory` → `using (is_staff() …)`;
  `bookings` / `receipts` → `using (is_staff() …)`. `is_staff()` = "is this auth user anywhere in
  the staff table" — **not scoped to a shop**.
- **Exposure:** the moment a *second* shop's staff exists in this database, **every shop reads and
  writes every other shop's** customers, inventory, jobs, receipts, and payment transactions.
- **Today:** harmless — there is one shop. **For the subscription product:** this is a complete
  cross-tenant data breach. **This is the #1 blocker to multi-tenant go-live.**

**Direction (not done):** add `shops` + `shop_members(user_id, shop_id, role)`; put `shop_id` on
every tenant table (default from the member's shop); add `current_shop()` (SECURITY DEFINER) and a
`shop_id = current_shop()` predicate to **every** policy (alongside the existing role check). Phase
it table-by-table behind a backfill.

## 🟠 2. Edge functions run as `service_role` (bypass RLS) and self-enforce ROLE, not TENANT
`payments_setup.sql` notes it explicitly: *"the edge functions run as service_role … bypasses RLS"*
and grants it DML on `receipts` / `payment_transactions` / `payment_events`. `pay-create-intent`
auth-checks *"any ACTIVE staff"* — but **not which shop the receipt belongs to**. With tenant
isolation absent (Finding 1), a signed-in staffer of any shop could create a payment intent
against **any** receipt id. Self-enforcing RPCs (`pos_checkout`, `set_d1_filed`, `job_cancel`, …)
have the same property: they check role, not tenant.

**Direction:** once `shop_id` exists, every edge function / SECURITY DEFINER RPC must assert
`receipt.shop_id = caller's shop` before acting.

## 🟠 3. Single global `shop_config` (one-shop assumption baked in)
`shop_config` is one row, granted to `authenticated` + `service_role`. Identity, tax, hours,
commission rules, and now the subscription seed all assume a single shop. Multi-tenant needs
`shop_config` keyed by `shop_id` and shop-scoped.

## 🟠 4. Payments = one platform Stripe key; no per-shop isolation / Connect
`pay-create-intent` uses a single `STRIPE_SECRET_KEY` (the platform's). All shops' charges would
run through one Stripe account with no per-shop separation. The **1% revenue split** (Phase 4 3b)
*requires* Stripe **Connect** with a **connected account per shop** and `application_fee_amount` /
`on_behalf_of` per charge — which also becomes the natural payment-tenant boundary. Until then,
payment data is not isolated per shop at the Stripe layer either.

## 🟡 5. Cost-masking is correct **but enforcement depends on the app reading the `_safe` views**
🟢 Good design: `inventory_safe` / `receipts_safe` (`security_invoker=true`) gate `cost`/margin
behind `is_manager()` and `strip_receipt_costs()` removes `cost`/`unitCost` from receipt JSON for
non-managers. **However** the base `inventory` / `receipts` tables are still readable by any staff
(role-gated), so cost leaks **if any code path reads the raw table instead of the `_safe` view.**
Action (verify, not fix): grep the client for direct `TKS.list('inventory')` / raw `receipts`
reads on tech/front-desk sessions and confirm they route through the `_safe` views.

## 🟡 6. Tier gating (Phase 4 3a) is NOT tenant isolation
The new `tier_allows()` / `require_tier()` controls **which features a shop's plan unlocks** — it
does **not** isolate one shop's data from another. They are independent: a paying shop on any tier
still sees every other shop's data until Finding 1 is closed. (Called out in `4a_tiers.sql` too.)
**Billing is not safe to take live until tenant isolation exists.**

## 🟡 7. Other notes to verify (not exhaustive)
- `audit_log` is `is_manager()`-readable globally → would be cross-tenant readable under multi-tenant.
- Realtime / `TKS.onChange` subscriptions (if any) would broadcast across tenants without `shop_id` filters.
- Storage buckets (cut-key reconciliation photos via `uploadProof`) — confirm per-shop path scoping + bucket policies.
- Client holds the Supabase anon key (normal) — all enforcement must be server-side (it is, role-wise).

## 🟢 What's already solid
Real role matrix + append-only audit log; SECURITY DEFINER self-enforcing RPCs; cost/margin masking
views; payment functions auth-gated; webhook-only writes to `subscriptions` (no client tier
escalation). The **role** security model is well built — it's the **tenant** dimension that's absent.

---

## Suggested order if/when you fix (separate effort, your call)
1. `shops` + `shop_members` + `current_shop()`; backfill the single existing shop.
2. Add `shop_id` to tenant tables (default `current_shop()`), backfill, then add the `shop_id =
   current_shop()` predicate to every policy + every SECURITY DEFINER RPC/edge function.
3. Shop-scope `shop_config`, `audit_log`, realtime filters, storage paths.
4. Stripe Connect: connected account per shop; route charges with `on_behalf_of` + 1% app fee.
5. Re-run this audit + add cross-tenant tests (shop A session must get 0 rows of shop B data).

*First-pass audit focused on the multi-tenant + payment posture. A full line-by-line of all 12
migrations + every edge function is recommended before multi-tenant launch.*

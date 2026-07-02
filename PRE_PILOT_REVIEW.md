# PRE-PILOT REVIEW — 2026-07-02

**What this is:** a deep review of the whole Bittings codebase before the 5-shop pilot, done
overnight per your request. Four angles: security, what-we-missed, redundancy, quick wins.
I **fixed the safe/obvious items** (each one is its own commit below, so any single one can be
reverted alone) and **left every judgment call for you**, sorted 🔴/🟡/🟢.

**Bottom line:** the money path itself is in good shape — amounts are computed server-side,
webhooks are signature-verified, a shop cannot charge/refund/see another shop's payments
(re-proven today, 25/25). The biggest pre-pilot risks are **not in the charging code**: they are
(1) a handful of older server functions that check *role* but not *shop*, (2) `billing-checkout`
grabbing the wrong shop's subscription, and (3) **no way to add an employee** without you doing
it by hand in the Supabase dashboard.

---

## PART 1 — WHAT I FIXED (all pushed to `phase3-frontend-unification`)

Each is one commit. To undo any single one: `git revert <hash>`.

| Commit | What | Why it was safe |
|---|---|---|
| `0b60ea4` | Checked in the QA harness (`tools/qa/`) + the QA fix-list note in EVERYTHING.md that were sitting uncommitted; pushed the 10 unpushed commits as a backup **before** touching anything. | Housekeeping only. |
| `d9e14ab` | Made the isolation test run on ANY PC (it was hardcoded to the old shop PC's paths). | Test harness only. Re-ran it: 24/24 PASS baseline. |
| `8599816` | **Security (the 🔴 from the QA audit): revoked anon/PUBLIC EXECUTE on all 15 exposed database functions** — incl. `create_shop` (spam vector), `current_subscription` (leaked Stripe customer/subscription IDs to *anyone with no login*), `inv_on_hand` (leaked stock counts), and the payment trigger fns. Also deleted `_sweep_1b`, a leftover QA test function in prod. Applied live as migration `phase5_5f_…`. | Followed the exact revoke pattern phases 1/2/6 already use. Verified 4 ways: isolation test **25/25** (new probe proves payment triggers still fire post-revoke), live anon calls now get *permission denied*, live QA-owner session still runs every app RPC (`current_shop`, `shop_tier`, `seat_usage`, cost-masked receipts), and a live edit still bumps `updated_at`. **The Supabase security linter now shows zero anon-executable functions.** |
| `e089cf4` | **Customer edit now bumps `updatedAt`** (+ stamps `createdAt` on new customers) — the QA audit's data-integrity 🟡. | 3 lines; verified with Puppeteer (add → edit → timestamp changes; both themes; zero console errors). |
| `569f496` | Fixed a stale code comment claiming cost/profit "isn't wired" — it IS wired and was verified 2026-07-01. Comment-only. | Prevents future-you (or future-me) rebuilding something that exists. |
| `a069e33` | Added `favicon.ico` — clears the 404 console noise on every page. | Copy of the existing `Bittings.ico`. |
| `96c84af` | Removed `acorn`/`acorn-walk` from package.json — installed but used by nothing. | Dev manifest only; harness re-verified after. |
| `b12b95c` | **Reconcile screen: added the "✕ Discard count" button.** The count screen could start/save/finish but an abandoned count was stuck open forever (and staff auto-resume any open count assigned to them). The server function for this (`cycle_cancel`) existed with zero callers. | Pure addition wired to a proven, manager-gated server RPC. Verified live on the QA shop (start → discard → status `canceled`) + UI in both themes, zero console errors. |

**Good news found while verifying (things the QA audit worried about that are actually fine):**
- The customer **delete control exists** (it's on the edit form — "Remove", soft-delete, recoverable, server-enforced).
- No secret keys anywhere in the repo (scanned for sk_live/sk_test/whsec_/service-role tokens). The one real key problem is the OLD TurboStripe.exe key — already on your task list to rotate at go-live.
- `connect-onboard` is properly owner-gated and shop-scoped; `stripe-webhook` and `billing-webhook` verify signatures; refunds are manager/owner-gated and partial-refund-aware.

---

## PART 2 — FOR YOU TO DECIDE (I did NOT touch any of these)

> **STATUS UPDATE — 2026-07-02 (overnight run, owner-authorized):** every item below that could
> be done safely is now ✅ DONE, one commit each (isolation test re-run after every tenant/money
> change — grew from 25/25 to **29/29 PASS**):
> **🔴s:** #1 Commission (tech self-scope + front-desk hidden, per your call) `41117dc` ·
> #2 billing-checkout shop-scoped `31a1903` · #3 all 21 DEFINER RPCs shop-fenced `cbedc23` ·
> #4 per-shop shop_config `96c9dbb` (+ commission_config in `cbedc23`) · #5 staff invites
> (edge fn + Add-teammate UI) `10deeec` · #6 pay-terminal server-side account `0cad5b0`.
> **🟡s:** #7 mobile overflow `d9a9a78` · #8 contrast (AA both themes) `4c5a075` · #9 CORS
> allow-list on all pay fns `b5b8f92` · #10 tier fns shop-scoped `31a1903` · #12 bootstrap
> owner-email/PIN removed `938bd1e` · #13 pre-phase1 copies archived (spikes already
> tombstoned live) `1e0f75a`.
> **🟢s:** #14 auto-print `a67a363` · #15 cost nudge `8c92df1` · #16 Receive-units `fa583e1` ·
> #17 Activity viewer `a27c78b` (+grant 5l) · #21 billing-portal `e436001`.
> **Still yours (untouched, as agreed):** #11 leaked-password protection (paid tier),
> #18 Spanish publish, #19 thermal logo, #20 website-leads-to-app, the redundancy/de-dup
> cleanup, and the real-device sweep. **New flags for you:** `billing-webhook` is NOT deployed
> (deploy it before billing go-live, with STRIPE_PRICE_* + STRIPE_WEBHOOK_SECRET envs);
> set `ALLOWED_ORIGINS` when the app gets its real domain; keep launching the app via
> http://localhost — a file:// open would be blocked by the origin gate.

### 🔴 Must fix before the pilot (real shops, real money)

1. **Commission tab shows every tech's pay to technicians and front-desk.** (Known from the QA
   audit; I re-confirmed it — a technician's sidebar shows Commission.) Decision needed:
   **hide it** from tech/front-desk (like Dashboard/Reports already are), or **self-scope it**
   (a tech sees only their own rows). I didn't pick because "can a tech see their own commission?"
   is a business call. Either is a small change once you choose.

2. **`billing-checkout` grabs the wrong shop's subscription.** It looks up the *most recently
   updated* subscription in the whole database instead of the caller's shop. With 5 shops, an
   owner clicking Upgrade could attach **another shop's** Stripe customer and flip **their** tier.
   Fix = rewrite it to use the same shared shop-scoped auth the pay functions use (~20 lines,
   but it's the money path, so it's yours to green-light). Until fixed, don't let pilot shops
   touch the Upgrade button (you're seeding them as Pro manually anyway).

3. **Older server functions check role but not shop.** The Phase-5 fence protects direct table
   access, but ~15 phase-1/2/6 server functions (they bypass row security) act on any ID they're
   given: `jobs_awaiting_signoff` and `nastf_worklist` return **every shop's** rows to any
   manager; `set_d1_filed`, `inv_move/adjust`, `warranty_replace`, `pos_decrement_stock`, etc.
   would act cross-shop if a caller knew a target ID. IDs are opaque (not guessable from the
   API), so this isn't exploitable *today* — but tenant isolation shouldn't rest on ID secrecy
   with 5 real shops. Fix = add a `shop_id = current_shop()` check inside each function
   (`inventory_dashboard` is the correct template), then re-run the isolation test. Half a day
   of careful work; needs your go because it touches the POS/inventory engine.

4. **`shop_config` is hard-limited to ONE row** (`id = 1`). A second shop literally cannot save
   its own Settings (identity, tax rate, hours, catalog). Works fine solo; breaks on shop #2.
   Needs a small migration (key it by shop) + the matching store.js change. Must land before
   any pilot shop runs Setup.

5. **No staff-invite flow — the practical pilot blocker.** There is no way for a shop to add an
   employee: the Setup "Access & managers" step only writes names/PINs into config (creates no
   login), and there's no invite function anywhere. Today every pilot employee = you manually in
   the Supabase dashboard. Fix = one edge function (`inviteUserByEmail` + staff/membership rows)
   + an "Add teammate" button. It gates roles → refunds, so build carefully with tests.

6. **`pay-terminal` trusts a client-supplied Stripe account ID** for listing/cancelling card
   readers. Any signed-in staffer could pass another shop's account ID and see/cancel their
   readers. (Charging is NOT affected — `pay-create-intent` correctly ignores client input.)
   Fix = resolve the account server-side from the caller's shop, same as the other functions.
   Small, but it's a pay-* function, so your call.

### 🟡 Should fix soon (before or early in the pilot)

7. **Mobile overflow** (from QA audit, still open): Commission controls clip off-screen at
   390px; Settings inputs overflow ~97px; Inventory rows overflow ~30–64px. The app lives on
   phones — worth a CSS pass.
8. **Contrast** (QA audit, still open): washed-out green amount tags / pink Refund buttons on
   white cards; the near-illegible dark-red-on-red "OWES $…" badge; POS amber banner.
9. **CORS is `*` on half the payment endpoints** (`pay-create-intent`, `pay-record`,
   `pay-status`, `pay-terminal`, `billing-checkout`) while the other half correctly use the
   origin allow-list built in `_shared/auth.ts`. Not directly exploitable (auth is still
   required), but the allow-list was built deliberately — decide the production origin list
   (the current defaults are localhost-only!) and route everything through it. **This matters
   the day the app moves to its real domain** — add the domain to `ALLOWED_ORIGINS` or
   refunds/voids will break in the browser.
10. **`current_subscription`/`shop_tier`/`seat_usage` aren't shop-scoped internally** — they
    read the *globally newest* subscription row. I closed the anon leak (commit `8599816`), but
    with 2+ shops the tier display could show the wrong shop's plan. Fix = add
    `where shop_id = current_shop()` inside them — do it together with #2.
11. **Leaked-password protection is off** (Supabase auth option, checks against HaveIBeenPwned).
    Needs the **paid Pro tier** → your rule says I don't enable paid things. Decide at go-live.
12. **`cloud-config.js` hardcodes `OWNER_EMAILS: ['samer@…']` + a default PIN `1234`** as a
    client-side manager fallback. Harmless solo; wrong for 5 shops (it would treat you as
    manager inside every shop's UI, and ships a guessable PIN). Roles should come only from the
    staff table before pilot.
13. **Old pre-Phase-1 function copies** live in `supabase/_originals_pre_phase1/` (the old
    pay-refund/void had NO auth). The repo copies are superseded — just confirm nothing old is
    still deployed under a different function name in the dashboard, then archive the folder.

### 🟢 Nice-to-have / quick wins (ranked by payoff ÷ effort — from the feature sweep)

14. **Auto-print receipt on sale** — ~80% built (printer driver + receipt builder + manual 🖨
    button all exist). One settings checkbox + one guarded print call in the sale-complete path.
15. **Real profit numbers from day 1** — the cost pipeline is fully wired; profit reads $0 only
    where inventory items have no cost entered. Make "enter part costs" (or CSV import — the
    importer maps cost already) a pilot-onboarding checklist step. Optional: a "N parts missing
    cost" nudge in Inventory.
16. **Serialized receiving** — the whole Phase-6 per-unit engine is live except its front door:
    nothing calls `unit_receive`, so serialized tracking can't actually start. One "Receive
    units" modal (supplier/batch/qty/unit cost) completes it.
17. **Audit-log viewer** — ~15 server actions write an audit trail; there is zero UI to read it.
    One owner-only "Activity" screen = instant trust feature for pilot owners.
18. **Spanish site** — fully built (~150 pages) with a working toggle; it's waiting on your
    proofread + publish decision, not on code.
19. **Thermal logo** — built, off by default pending one test print on the real Star printer
    (already part of your hardware session).
20. **Website leads → app** — the DB columns and the (commented-out) anon insert policy exist;
    the contact form already emails you via Web3Forms. Wiring leads into the app's Customers
    view is one edge function + uncommenting a policy — but it opens an anonymous write path,
    so it's flagged as your decision.
21. **"Manage subscription" button** — `openPortal()` exists client-side but the
    `billing-portal` edge function it calls doesn't exist in the repo (~30 lines). Only matters
    once pilots actually pay.

### Redundancy map (no action needed now — for the eventual cleanup)

- **The receipt/PDF engine is duplicated on purpose** (~395KB): `app/receipts-engine.js` and an
  identical inline copy in `bittings.html`. Both are LIVE (bittings.html is still the invoice
  builder + mobile handoff — it is NOT dead). De-dup = make bittings.html load the engine file;
  do it in a quiet week, not before the pilot. Also: index.html currently loads **two copies of
  jsPDF** (CDN + inside the engine) — consolidating saves ~350KB per load.
- **3 Supabase clients per page** cause the harmless "Multiple GoTrueClient" console warning
  (bootstrap probe + store.js + pay.js). One shared client is a small refactor.
- **Probably-dead files** (verify no bookmarks point at them, then archive): `fleet.html`,
  `programmers.html` (both superseded by native views in index.html), `app/ui/demo.html`,
  `_source/` (1.15MB raw Lishi data — archive, don't delete: provenance), one of the two
  `_devserver.py`. `tools/pitch-screenshots/` is 4.4MB of regenerable marketing shots — your call.
- **4 tools scripts still point at the old `bittings-app/` path** (`_gen_ilco.js`,
  `_vehicle_audit.js`, `_pitch_moat.py`, `_pitch_shots.py`) — left as-is per the standing note
  in EVERYTHING.md; re-point before ever re-running them.

---

## Honesty notes

- One of my four review agents (the dedicated "half-finished features" sweep) died against a
  session usage limit mid-run. Its ground was substantially covered by the other sweeps (which
  found the orphaned RPCs, the fake Setup-employees step, the missing billing-portal function,
  the stale comments), but a re-run of that specific sweep would add belt-and-braces coverage.
- Everything in Part 1 was verified as described (isolation test, live QA-shop calls, Puppeteer
  in both themes). What I could NOT verify headless remains what the QA audit already listed:
  real-phone behavior (iPhone Safari / Android Chrome) and physical hardware.
- The QA test shop + logins (`qa-*@bittings-qa.test`) are still in place for your device sweep;
  I used them for the live verifications above (one test customer edit + one started-and-
  discarded stock count, both in the QA shop only).

**Suggested order for your morning:** read Part 2's 🔴 list → tell me which of #1's two options
you want (hide vs. self-scope Commission) and green-light #2/#3/#6 (I can do all three with the
isolation test as the safety net) → #4 and #5 are the two real build items to schedule before
onboarding shop #2.

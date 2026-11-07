# DEEP REVIEW — 2026-11-07 (new shop PC "TK-Main")

**What this is:** a full review of the Bittings app before it becomes the shop's main register —
code review of every area (Register/money path, inventory & traceability, data layer/access/tenancy,
receipt builder & scheduler, shell/lookup data/hardware), plus live checks on this PC. Written for the
owner; the technical detail is in `bittings-unified/app/STRUCTURE_NOTES.md` (2026-11-07 entry).

**Status legend:** ✅ fixed + verified · 🟡 code can be written now, proof needs the cloud back ·
⬜ waiting on you · 🚫 not started.

---

## What was verified working (ran it, not assumed)
- All 14 screens render in **both themes with zero JavaScript errors** (headless Chrome, owner, 1280 + 390 px).
- **Role matrix:** client `can()` matches the server capability table **exactly for all 4 roles**; nav
  visibility correct (techs/front desk lose Fleet/Dashboard/Closeout/Reports/Settings/Activity).
- **Multi-shop + payment isolation: 33/33 PASS** on a real embedded Postgres on this PC.
- Register part/service pickers, VIN decode (NHTSA), customer add/edit, Lishi + programmer lookups — work in local mode.
- Reference data: 120 Lishi tools (no duplicate designations), 230 vehicles, 1,642 Ilco rows — no
  duplicates, no reversed year ranges, consistent casing.
- Repo: `phase3-frontend-unification` is the latest app code; the old-PC backup branch adds nothing;
  no secrets in the tree.

---

## A. Owner action — the blocker
- ✅ **A1. Restore the Supabase project** — **done by the owner 2026-11-07 (~13:46 CST)**. It had been
  paused since July (hostname didn't resolve). Verified from this PC after the restore, anonymously
  (the July QA test logins no longer work):
  - all **24 tables/views** from every migration phase (1a → 7a) exist; anon has **no** table grants
    ("permission denied") and the 5f function lockdown is still in place;
  - every RPC name the app calls exists (PostgREST only suggests "did you mean…" for a missing name —
    it did so only for a name that *shouldn't* exist);
  - **12 of 13 edge functions are deployed** with the localhost origin allow-list working;
    `billing-webhook` is the one not deployed (known — billing go-live item);
  - the payment auth path answers a clean `401 invalid or expired session` for anon (not the old 503).
  - **Still to confirm by the owner: sign in to the app and check the real shop's Customers /
    Inventory / Receipts are all there** (data can't be read anonymously — by design).

## B. Confirmed bugs — fixed today (one commit each, all verified headless)
| # | What was wrong | Status |
|---|---|---|
| B1 | **Activity** / **Timesheets** nav opened a blank screen (views missing from the `show()` list) | ✅ |
| B2 | **Reconcile** hidden for *every* signed-in role (capability name didn't exist) + its list rendered into the hidden Receipts screen (duplicate id) | ✅ |
| B3 | **Warranty** setting silently dropped on every save → invoices got no warranty | ✅ |
| B4 | **Inventory value report** retail always $0 (field-name typo) | ✅ |
| B5 | Jobs cancelled on the board showed as **Scheduled** elsewhere, never archived (`Cancelled` vs `Canceled`) | ✅ |
| B6 | **Register double tap = two sales** (no in-flight guard) | ✅ |
| B7 | **Editing a paid invoice subtracted its parts a second time** | ✅ |
| B8 | Dropped connection during payment froze the Register / stopped card polling silently | ✅ |
| B9 | PIN-unlock + billing errors showed a generic line instead of the server's reason | ✅ |
| B10 | `?go=reports` deep link opened owner-only screens for a technician (UI only) | ✅ |
| B11 | Scanner: key auto-repeat mis-read as a scan; scanned code left in the focused field | ✅ |
| B12 | Contrast misses in both themes; Reports chart could push the page sideways on rotation | ✅ |
| B13 | Desktop shortcut launched from `file://`; no Python on this PC for the dev server → Node server + `http://localhost:8088` launcher; demo/sandbox flag can no longer affect a real account | ✅ |
| B14 | Calendar export invited `turbokeysmith@gmail.com` for every shop; `postMessage` origin check; favicon path | ✅ |

## C. Money & stock integrity — **done the same evening after the restore** (each applied live, deployed, and proven in the isolated QA test shop)
| # | Finding | Status |
|---|---|---|
| C1 | **Refund/void of a Register sale never returned parts to stock**; the invoice builder wrote `inventory.qty` directly (overwritten by triggers, silently blocked for technicians) | ✅ migration **8a** `pos_restock` + one server-owned stock path when signed in. Local proof 42/42; live: restock gate + no-op verified |
| C2 | **Card receipts printed the pre-surcharge total**; auto-print used a fake ticket number | ✅ receipts get the *captured* total + surcharge from the server (`receipt_mark_paid`); Register prints under the real receipt id |
| C3 | **Register sales never marked the receipt Paid** | ✅ migration **8b** `receipt_mark_paid` called by `pay-record` and the Stripe webhook. Live: cash sale → "Paid in Full / Cash / $10.85" |
| C4 | **Tax rate taken from the device at checkout** | ✅ **8b**: `pos_checkout` reads `shop_config.tax_rate`. Live: client sent 50%, receipt carried the shop's 8.5% |
| C5 | Edge-function hardening (orphan charge on ledger failure, refund idempotency, swallowed capture errors) | ✅ `pay-create-intent` cancels the intent + 500; `pay-refund` idempotency key + ledger-failure reported; webhook returns 500 so Stripe retries |
| C6 | Closing the card sheet mid-charge left a **live reader intent** | ✅ `pay-terminal cancel_intent`; sheet close cancels; Register lists abandoned attempts with "Cancel it". Live 8/8 with a real test-mode intent |
| C7 | Inventory engine: `inv_receive` not serialized-aware; warranty-replace repeatable; move-approve double-move; stale cycle count; importer cost/price + no location seeding | 🚫 **not started** — next on the list |
| C8 | Security: plaintext Setup PINs readable by any staff; `shop_members` hijack; CORS `"null"`; no change-password; terminal job states | ✅ migration **8c**: PINs stripped on write + scrubbed, `shop_members` client writes revoked; CORS deny omits the header (live: `file://`/foreign origins blocked, localhost allowed); **Change my password** + **My PIN** cards added (the lock-screen PIN had *no* way to be set before). ⬜ terminal job-state guard still open |
| C9 | **Google Authenticator for managers/owners** (owner request) | ✅ migration **8e**: `is_manager()`/`is_owner()` require an aal2 session once a factor is enrolled; `mfa_pending()`, `staff_mfa_status()`; edge functions enforce the same; `mfa-reset` (owner, lost phone); login page: code step + first-time setup (QR, skippable); Settings: status / set up / remove / Team card 2FA + Reset. Live 17/18 with a real TOTP (the 18th was a test-shape nit) |
| PIN | **Shop-PC-only PIN switching** (owner decision D3) | ✅ migration **8d** `shop_devices` + `device_register/revoke/check`; `pin-unlock` only switches users on a registered workstation; Settings registers/revokes devices. Live 11/11 |

## D. Your decisions (nothing built until you say)
- ✅ **D1. Archive dead pages/plumbing** — approved + done 2026-11-07: the three pages moved to
  `_archive/bittings-unified-retired/`, iframe-embed code removed, "surcharge %" input replaced by a
  fixed "2% on credit cards only" line.
- **D2. Tier gating** is client-only (every pilot shop is Pro). Enforce server-side now, or when you sell a lower tier?
- **D3. PIN session-switch policy:** today a shoulder-surfed 6-digit PIN is a full owner login from any
  staff phone. Owner alert on every switch, or restrict switching to the registered shop PC?
- **D4. Lookup data:** 7 makes (Genesis, Jaguar, Land Rover, MINI, Pontiac, Saturn, Suzuki) have no models
  and no free-text fallback; the June Lishi cross-reference items are still open.
- ✅ **D5. Branch plan** — approved + done 2026-11-07: `main` merged into `phase3-frontend-unification`
  (website files + GA4 deploy guard from `main`; both changelogs kept). This branch is now complete.
- ✅ **D6. Push** — approved; everything is on GitHub (`origin/phase3-frontend-unification`).
- ✅ **D3 (PIN policy)** — owner chose **"shop PC only"**; built as migration 8d (see table C).
- ✅ **Owner login** — the owner had no record of their password; a temporary one was set on
  `samer@turbokeysmith.com` (handed over in chat) and a **Change my password** card now exists in
  Settings → Access. ⬜ Still to confirm: the owner's real data in the app after signing in.
- **Working agreement 2026-11-07:** the owner suspended the ask-before-production rule for this
  project until they say they are going live ("delete that rule till I tell you we are going live").

## E. Physical (unchanged, owner-only)
Scanner mode, Star WebPRNT host + SDK, Zebra Browser Print + calibration, re-run `_make-shortcuts.ps1`
on the shop PC, and the real-phone sweep (iPhone Safari + Android Chrome, owner + staff).

---

### Honesty notes
- Everything in B was verified in headless Chrome on this PC in **local/demo mode**. Nothing could be
  verified against the live cloud (paused), so the server-backed paths (checkout, refunds, inventory
  RPCs, time clock) were reviewed by reading code + the 33/33 Postgres proof only.
- The QA harness's "overflow" on Settings/Closeout inputs is a false positive (long placeholder text
  inside inputs that fit); its low-contrast flags on tinted pills/badges are probe noise (it treats
  semi-transparent backgrounds as solid).
- Real-device behavior (phones, printers, scanner timing) remains untested here.

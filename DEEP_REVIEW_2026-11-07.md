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
- ⬜ **A1. Restore the Supabase project** (`gcshuhlksjznksspbigl`). Its hostname no longer resolves —
  the signature of a **paused** project (nothing has used it since 2026-07-02). Log in at supabase.com
  → the project → **Restore**. Free projects paused > 90 days can be scheduled for deletion, and the
  customers, receipts, transactions, time entries and the 352 imported inventory items live only
  there. When it's back, say so: the next step is to verify the live migrations + edge functions
  against the repo (`HANDOFF_TO_SHOP_PC.md` §1 lists what must be there).

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

## C. Money & stock integrity — code review findings that need the cloud to deploy + prove
| # | Finding | Why it matters | Status |
|---|---|---|---|
| C1 | **Refund/void of a Register sale never returns parts to stock** (dialog says it does). The invoice builder writes `inventory.qty` directly — the location triggers overwrite it, and for technicians it silently fails. | Stock drifts after every refund / builder sale | 🟡 needs a `pos_restock` RPC + one decrement path |
| C2 | **Card receipts print/share the pre-surcharge total**; auto-print uses a fake ticket number; 1¢ rounding drift on discounted mixed-tax tickets | Customer paper ≠ card statement | 🟡 |
| C3 | **Register sales never mark the receipt Paid** → Receipts/OWES show Unpaid | Wrong balances | 🟡 (pay-record + webhook patch) |
| C4 | **Tax rate is taken from the device at checkout** (`pos_checkout` trusts `taxRate`) | Any staffer with dev tools can under/over-tax | 🟡 (read shop config server-side) |
| C5 | Edge functions: cancel the Stripe intent if the DB insert fails; refund idempotency key; don't swallow capture errors in the webhook | Rare double-charge / stale ledger paths | 🟡 |
| C6 | Closing the card sheet mid-charge leaves a **live reader intent** — customer can still tap, sale never finalizes | Possible double charge on retry | 🟡 (`pay-terminal cancel` + pending-txn recovery) |
| C7 | Inventory engine: `inv_receive` ignores serialized items; warranty-replace repeatable + can mis-tag units; move-approve can double-move; cycle count applies a stale absolute count; importer maps "Price" as cost and never seeds locations | Counts drift under real use | 🟡 |
| C8 | Security: Setup manager **PINs stored in plain text, readable by any staff**; an owner can hijack another user's "current shop" via `shop_members` insert; CORS deny value `"null"` matches `file://`; invite temp-passwords permanent (no change-password UI); terminal job states not guarded | Pilot-shop trust | 🟡 |

## D. Your decisions (nothing built until you say)
- **D1. Archive dead pages/plumbing:** `programmers.html`, `fleet.html`, `app/ui/demo.html` (zero inbound
  links), the unused iframe-embed code, the unused "surcharge %" setting.
- **D2. Tier gating** is client-only (every pilot shop is Pro). Enforce server-side now, or when you sell a lower tier?
- **D3. PIN session-switch policy:** today a shoulder-surfed 6-digit PIN is a full owner login from any
  staff phone. Owner alert on every switch, or restrict switching to the registered shop PC?
- **D4. Lookup data:** 7 makes (Genesis, Jaguar, Land Rover, MINI, Pontiac, Saturn, Suzuki) have no models
  and no free-text fallback; the June Lishi cross-reference items are still open.
- **D5. Branch plan:** `main` has the November website changes; this branch has the whole app. Merge
  `main` into `phase3-frontend-unification` so one branch is complete?
- **D6. Push:** today's commits are local on this PC until pushed to GitHub (`origin`).

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

# EVERYTHING.md — read this first

**Master orientation for any fresh Claude Code session or new machine.** Start here, then go
deeper via the linked docs. Plain-language overview for the owner lives in
[`PROJECT_HANDOFF.md`](PROJECT_HANDOFF.md); the live task list is
[`turbo_master_task_list.md`](turbo_master_task_list.md).

**Last updated:** 2026-06-30 12:22 CDT · branch `phase3-frontend-unification` · repo
`github.com/turbokeysmith/bittings`.

---

## 1. What this is — two products, one repo

| Product | What it is | Folder | Status |
|---|---|---|---|
| **Turbo Keysmith** | The public **marketing website** for a mobile locksmith in the OKC metro. Live at **https://turbokeysmith.com**. | `website/site/` | **Live** on Cloudflare Pages |
| **Bittings** | The private **staff app** the locksmith runs the business on — customers, scheduler/dispatch, receipts, payments/POS, inventory, key-programming reference, hardware. | `bittings-unified/` | In active development; payments in **TEST mode** |

- **Owner/business:** Turbo Keysmith, mobile locksmith, OK license #AC441081, Warr Acres OK.
  Not a developer — keep owner-facing docs plain-language.
- **Stack:** plain **HTML/CSS/vanilla JS**, no framework, **no build step**. The website is
  hand-maintained static HTML. The app is big HTML files + `app/*.js` IIFE modules hung on
  `window.TKS*` (e.g. `window.TKS` data layer, `window.TKS_HW` hardware).
- **"Bittings" = the product name of the app; "Turbo Keysmith" = the company + website.** The
  long game is selling Bittings to other locksmith shops (multi-tenant; see §4).

---

## 2. The two codebases & repo map

Single git repo rooted at `turbokeysmith-main/` (origin `github.com/turbokeysmith/bittings`).

```
turbokeysmith-main/
├─ website/                 # Turbo Keysmith public site (Cloudflare Pages)
│   ├─ site/                #   the live static HTML — SOURCE OF TRUTH, edit directly
│   ├─ DEPLOY_CLOUDFLARE.md #   hosting/DNS runbook
│   └─ SITE_PAGES_AUDIT.md
├─ bittings-unified/        # Bittings staff app — THE ACTIVE SOURCE TREE
│   ├─ index.html           #   app shell (POS/Register, Inventory, Customers, etc.)
│   ├─ bittings.html, scheduler.html, lishi.html, programmers.html, setup.html, cloud-test.html
│   ├─ app/                 #   data layer + UI + feature modules (store.js, pay.js, hardware.js, …)
│   │   └─ STRUCTURE_NOTES.md  # deeper technical notes on app + cloud wiring (keep current)
│   ├─ supabase/            #   migrations (phase3/4/5) + edge functions (pay-*, billing-*, …)
│   ├─ docs/                #   app planning/audit docs (PHASE*_PROGRESS, SECURITY_AUDIT_PHASE4, …)
│   ├─ tools/               #   one-off dev/data/pitch scripts (see note below)
│   ├─ HARDWARE_SETUP.md    #   owner-facing device setup + test steps
│   └─ HANDOFF_TO_SHOP_PC.md#   cross-PC parity checklist
├─ _archive/                # retired material — NEVER edit (stale earlier bittings-app/ copy + zip)
├─ EVERYTHING.md            # this file
├─ PROJECT_HANDOFF.md       # plain-language whole-project overview (the owner uploads this)
├─ turbo_master_task_list.md# the deep task list (every track + status)
├─ README.md, CLAUDE.md     # repo readme + assistant instructions
└─ package.json, node_modules/  # dev/verify harness (Puppeteer, embedded-postgres) — not shipped
```

- ⚠️ **`tools/` scripts hardcode the old `bittings-app/` path** — repoint to `bittings-unified/`
  before re-running any of them. Left as-is on purpose (not re-running them now).
- ⚠️ **There used to be a nested `.git` inside `bittings-unified/`** that silently caught commits.
  It's **removed** — this is now one clean repo. Still: anchor git to the root and check
  `git rev-parse --show-toplevel` before committing if `cd`-ing around.

---

## 3. The systems (cloud + accounts)

| System | Role | Where it's wired / how to reach it |
|---|---|---|
| **GitHub** | Source of truth / backup | `github.com/turbokeysmith/bittings`. `gh` CLI + GitHub MCP available. Commit + push when work is done. |
| **Supabase** | Database + auth + edge functions | Project ref **`gcshuhlksjznksspbigl`** (`app/cloud-config.js` holds the URL + public anon key — safe to expose, guarded by RLS). Supabase MCP available for migrations/edge fns/logs/advisors. |
| **Cloudflare** | Hosts the public website (Pages) | Deploy: `npx wrangler pages deploy website/site --project-name=turbokeysmith --branch=main` (always `--branch=main` for prod). Root `_deploy-website.sh` wraps it (reads `.secrets/cloudflare.env`). |
| **Stripe** | Card payments + billing/Connect | **TEST mode** today. Secret key lives **only** in Supabase edge-function secrets — never in the app or repo. Edge fns: `pay-create-intent/record/refund/void/status`, `stripe-webhook`, `billing-*`, `connect-onboard`. |

**Data layer:** all app reads/writes go through `app/store.js` (`window.TKS`) — one CLOUD SWAP
POINT. Local **localStorage** by default; flips to Supabase automatically when a staff member
signs in. RLS is ON; only signed-in staff can read/write.

---

## 4. What's built & proven so far

Phases land as server-enforced DB migrations + edge functions, proven at the database level
before the UI is trusted. **"DB-proven" = an automated isolation/Postgres test passed; "code-
complete, pending mobile sign-off" = built + traced but NOT yet confirmed on a real phone.**

- **Phase 1 — Roles, security, accountability.** Real roles + RLS + append-only audit; fleet +
  per-location inventory; job state-machine; cost/margin hidden from techs; all payment fns
  auth-gated.
- **Phase 2 — POS / cash register + commission engine.** Register (Card/Cash/Check), Closeout
  + deposit slip, Transaction History, configurable commission. Server-proven.
- **Phase 3 — Front-end unification (current branch).** The old iframe-glued app rebuilt into
  one seamless app on the same proven backend. All 6 iframe seams closed. **Code-complete,
  pending the device sweep.**
- **Phase 4 — Billing & tiers (TEST mode).** Subscription tiers (`4a`, server-enforced),
  Stripe billing + Connect scaffolding (`4b`), plus a written security audit
  (`docs/SECURITY_AUDIT_PHASE4.md`).
- **Phase 5 — TRUE multi-tenancy + payment isolation.** `5a` per-shop isolation (`shops`,
  `shop_members`, `current_shop()`, a RESTRICTIVE `shop_id = current_shop()` fence on every
  shop-owned table) — **DB-proven**. `5b` payment-path guard triggers (transaction/event
  `shop_id` derived server-side) — **forge-proof even under service_role**. The combined
  `bittings-unified/supabase/phase5/isolation_test.js` runs **24 checks** on embedded Postgres
  (Shop A cannot read/charge/refund/void Shop B).
- **Hardware integration (just landed, the next active area).** `app/hardware.js`
  (`window.TKS_HW`) wires three shop-floor devices, each with a **hardware-free preview**:
  1. **Barcode scanner** — USB keyboard-wedge; scan-to-ticket on the Register, scan-to-search
     in Inventory. No driver/SDK.
  2. **Star TSP100 + cash drawer** — thermal receipt via **WebPRNT** (StarPRNT markup, not
     ESC/POS); drawer kick rides the print job. Needs the Star Web SDK + a local WebPRNT host
     service.
  3. **Zebra ZD421** — inventory SKU labels via **ZPL** through **Browser Print**.
  Vendor SDK `<script>` tags are pre-written but **commented out** in `index.html`; `app/vendor/`
  is gitignored (owner downloads SDKs per-machine). **Code-complete; the physical device setup
  is owner-only and pending** — full steps in `bittings-unified/HARDWARE_SETUP.md`.

**Cloud parity verified (2026-06-30):** all migrations through `phase5_5b_payment_tenant_guard`
are live; all `pay-*` edge functions `ACTIVE`. Sources in the repo match what's deployed.

---

## 5. How we work (the working agreement)

- **Server-first.** Trust is enforced in the database (RLS, RESTRICTIVE fences, server-side
  triggers), not in the UI. Prove a change at the DB level (migration + isolation test) before
  relying on the screen. The UI can lie; the fence can't.
- **Clone before rebuild.** Big rebuilds happen on a copy/branch with the proven version kept
  intact as the fallback until the new one is confirmed (how Phase 3 was done:
  `bittings-unified/` cloned off the proven app, old one archived only after parity).
- **Autonomous, skip-permissions style.** Move through the work without asking permission for
  every step — read, edit, run, commit. Keep the handoff docs current **in the same commit** as
  the work (`PROJECT_HANDOFF.md` + `bittings-unified/app/STRUCTURE_NOTES.md`).
- **Stop only for:** a real **decision** that's the owner's to make, anything with **cost or
  outside/irreversible impact** (going live, deploying to prod, rotating keys, deleting data,
  external sends), and **sign-off** gates.
- **Mobile sign-off is mandatory before "done."** Every feature must work on **iPhone Safari +
  Android Chrome**, for **owner AND staff**, one-handed. If a real device can't be tested here,
  say so plainly and give numbered test steps for **both platforms × both roles** — status is at
  most "code-complete, pending mobile sign-off," never "done."
- **Honesty:** report what actually happened — failed tests, skipped steps, assumptions. Don't
  claim verification that didn't occur.

**Run / verify locally**
- App: serve `bittings-unified/` over **http://localhost** (printers + cloud sign-in want a real
  origin, not `file://`). Any static server works.
- Website preview: `npx wrangler pages deploy website/site … --branch=preview` (never `main` for a test).
- **Puppeteer is installed** (Chrome-for-Testing downloaded). Drive/screenshot the app to verify
  UI. Scratchpad scripts need `NODE_PATH=<repo>/node_modules`. Use viewport 390×844 for the
  mobile check. See memory `[[puppeteer-browser-setup]]`.

---

## 6. What's next

**Immediate active area → payments go-live, toward a 5-shop pilot:**
1. **Stripe TEST keys → rehearse.** Run test cards end-to-end (Register Card/Cash/Check, invoice
   Pay Now + New Charge, refund/void, Closeout, Transaction History).
2. **Go live.** Swap in **live Stripe keys**, run one real charge, retire the old
   `TurboStripe.exe` desktop app and **rotate its old key** (owner-gated, cost/irreversible —
   stop-and-confirm).
3. **5-shop pilot.** Onboard pilot shops onto the multi-tenant backend (every pilot shop is Pro,
   so tier-gating on RPCs is deliberately deferred). Per-shop Stripe Connect payouts need the
   `billing-checkout`/`billing-webhook`/`connect-onboard` fns reviewed for shop-scoping first.

**QA fix list (from the 2026-06-30 sweep — see `bittings-unified/docs/QA_AUDIT_2026-06-30.md`;
status updated by the 2026-07-02 pre-pilot review, full report: `PRE_PILOT_REVIEW.md`):**
✅ **DONE 2026-07-02:** the anon-EXECUTE revoke (migration `phase5_5f`, linter now clean; isolation
test 25/25) and the `updatedAt`-on-edit fix; customer-delete control confirmed to exist (edit
form → Remove). Still open: 🔴 **Commission tab leaks all techs' pay to a technician** (owner
decision: gate vs self-scope); 🟡 mobile overflow (Commission/Settings/Inventory); 🟡 washed-out
white-card tags + "OWES" badge contrast. **NEW pre-pilot 🔴s in `PRE_PILOT_REVIEW.md`:**
`billing-checkout` wrong-shop subscription; older DEFINER RPCs not shop-scoped; `shop_config`
single-row; no staff-invite flow; `pay-terminal` trusts client account id. Re-run harness:
`bittings-unified/tools/qa/README.md`.

**Hardware (the named next focus):** finish the physical device setup per `HARDWARE_SETUP.md` —
scanner mode, Star WebPRNT host + SDK, Zebra Browser Print + calibration — then the device sweep.

**Open decisions / deferred (not blockers):** public website leads → cloud (edge fn + owner
alert); attach part **cost** to a sale so Cost/Profit/commission show real numbers; auto-print
receipt on sale (currently a manual 🖨️ button); thermal logo (off until text prints);
Google Calendar real two-way sync; Spanish `/es/` proofread → publish → rewire the 🌐 toggle.

---

## 7. Deeper docs (when you need detail)
- `PROJECT_HANDOFF.md` — full plain-language overview + changelog (owner-facing).
- `turbo_master_task_list.md` — every track with status.
- `bittings-unified/app/STRUCTURE_NOTES.md` — app + cloud + payments technical notes.
- `bittings-unified/HARDWARE_SETUP.md` — device setup/test (next focus).
- `bittings-unified/HANDOFF_TO_SHOP_PC.md` — cross-PC parity checklist.
- `bittings-unified/docs/` — per-phase progress + `SECURITY_AUDIT_PHASE4.md` + `BILLING_TESTMODE.md`.
- `website/DEPLOY_CLOUDFLARE.md` — site hosting/DNS runbook.
- `CLAUDE.md` — the standing assistant rules (doc-maintenance + mobile-verification mandates).

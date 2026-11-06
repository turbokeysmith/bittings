# Handoff — bring the shop PC to parity (for the Code instance on the shop PC)

You are picking up a Bittings (Turbo Keysmith) project mid-stream on a second machine. Another
Claude Code session on the owner's main PC made two bodies of work since this repo was last in sync:

1. **Multi-tenant + service-role-safe payment path** (Supabase DB + edge functions).
2. **Shop-floor hardware** (barcode scanner, Star TSP100 thermal receipts, Zebra ZD421 labels) in the web app.

Your job: get this PC to the exact same state and finish the physical-hardware setup. Read this whole
doc first — the most important thing is **what's already live in the shared cloud vs. what's a local
file you must have**, so you don't redo or undo anything.

---

## 0) Ground truth about this project (don't relearn the hard way)

- **Active source tree:** `…/turbokeysmith-main/bittings-unified/`. There is a SECOND, **stale** copy at
  `…/Desktop/bittings-deploy/` (HTML/JS only, older) and an older `…/turbokeysmith-main/bittings-app/`.
  **Do all work in `bittings-unified/`.** Don't edit the deploy folder.
- **One shared Supabase project** (ref `gcshuhlksjznksspbigl`), baked into `app/cloud-config.js`. Both
  PCs hit the SAME database and the SAME deployed edge functions. So all DB/edge-function work below is
  **already live for this PC too** — you only VERIFY it, you don't re-apply it.
- Vanilla JS, no build step, no framework. Big HTML files + `app/*.js` IIFE modules on `window.TKS*`.
- **Not a git repo.** "Sync" = the files themselves. These folders are under OneDrive
  (`C:\Users\turbo\OneDrive\…`), so if OneDrive is signed in on this PC the files below may already be
  here — but **verify with the manifest in §3**, don't assume.

---

## 1) What is ALREADY LIVE in the shared Supabase cloud — VERIFY ONLY, do not re-apply

These were applied/deployed from the other PC and are global. If you have the Supabase MCP, confirm:

**DB migrations** — `mcp__supabase__list_migrations` should include, in order:
`phase3_3a_move_requests`, `phase4_4a_subscription_tiers`, `phase4_4b_billing_connect_column`,
`phase5_5a_multitenant_isolation`, `phase5_5b_payment_tenant_guard`.

What they did: phase3 created `move_requests`; phase4 added `subscriptions` + tier helpers
(`shop_tier`/`tier_allows`/`require_tier`/`seat_usage`) + `stripe_connect_id`; phase5a made the app
**multi-tenant** (`shops`, `shop_members`, `current_shop()`, a RESTRICTIVE `shop_id = current_shop()`
fence on every shop-owned table, existing data migrated into one shop "Turbo Keysmith"); phase5b added
the **payment-path guard** triggers (`payment_transactions.shop_id` derived from its receipt;
`payment_events.shop_id` derived from its transaction — forge-proof even under service_role).

**Edge functions** — `mcp__supabase__list_edge_functions` should show these ACTIVE and shop-scoped:
`pay-create-intent`, `pay-record`, `pay-refund`, `pay-void`, `pay-status` (and unchanged
`stripe-webhook`). They resolve the caller's shop from `shop_members` (fail-closed) and scope every
receipt/transaction lookup + mutation by it.

➡️ **If list_migrations / list_edge_functions already show all the above: do nothing cloud-side.** They
are idempotent if you ever did need to re-run, but you should not. If something is missing (e.g. a
different/empty project), STOP and ask the owner — don't guess which project.

**Optional re-proof (safe, local, no cloud writes):** the DB-level tenant-isolation test runs on an
embedded Postgres:
```
cd …/turbokeysmith-main           # the folder that has node_modules/embedded-postgres
node bittings-unified/supabase/phase5/isolation_test.js   # expect "24/24 PASS"
```
Before running, edit its `DBDIR` constant to a writable temp path on THIS PC (it points at the other
PC's scratchpad). It models payments too: forged shop_id overridden to the receipt's shop; Shop A
cannot charge/refund/void/read Shop B.

---

## 2) What must be PRESENT AS LOCAL FILES on this PC (the front-end changes)

The cloud is shared; the **front-end code is not**. This PC's `bittings-unified/` must contain these
exact changes for the app UI to have the hardware features and for the repo to match. Get the files
here by ANY of: **(preferred) `git clone`** the repo the owner pushed to GitHub (then `git pull` for
future updates); **unzip** `bittings-unified-handoff.zip` (handed over / on the owner's Desktop, also a
full snapshot); or **OneDrive** auto-sync. Whichever you use, run §3 to confirm parity. If you replace
an existing `bittings-unified/` folder, **back up the old one first**.

**New files**
| File | ~bytes | Purpose |
|---|---|---|
| `app/hardware.js` | 32102 | The hardware module → `window.TKS_HW` (scanner / thermal / labels / settings). |
| `HARDWARE_SETUP.md` | 7478 | Owner-facing setup + test steps for all three devices. |
| `supabase/phase5/5b_payment_tenant_guard.sql` | 3352 | Source of the payment-guard migration (already live). |
| `supabase/phase5/isolation_test.js` | 17971 | Multi-tenant + payment isolation proof (24 checks). |

**Edited files**
| File | What changed (verify via §3 anchors) |
|---|---|
| `index.html` | Loads `app/hardware.js` (+ commented vendor-SDK `<script>` tags); **🖨️ Receipt** button on the Register; **🖨️ Hardware** button in the Inventory bar; `tks-scan` listener + `posThermalReceipt()` + scan-to-ticket; per-row **🏷️** label button. |
| `supabase/functions/_shared/auth.ts` | `requireRole` now also resolves `shopId` from `shop_members` (fail-closed 403 "no active shop membership"). |
| `supabase/functions/pay-create-intent/index.ts`, `pay-record/index.ts`, `pay-refund/index.ts`, `pay-void/index.ts`, `pay-status/index.ts` | Every receipt/transaction query scoped by `auth.shopId`; `shop_id` stamped on insert. (These are the SOURCES of what's already deployed.) |

> The 5 phase SQL files (`phase3/3a`, `phase4/4a`,`4b`, `phase5/5a`) likely already existed here; they're
> listed in §3 only to confirm the tree is complete.

---

## 3) Parity verification — run these on THIS PC and compare

From `…/turbokeysmith-main/bittings-unified/`:

```bash
# (a) files exist
for f in app/hardware.js HARDWARE_SETUP.md \
  supabase/phase5/5b_payment_tenant_guard.sql supabase/phase5/isolation_test.js \
  supabase/phase3/3a_move_requests.sql supabase/phase4/4a_tiers.sql \
  supabase/phase4/4b_billing.sql supabase/phase5/5a_multitenant.sql; do
  [ -f "$f" ] && echo "OK  $f" || echo "MISSING  $f"; done

# (b) index.html integration anchors — each must print 1
for p in 'src="app/hardware.js"' 'id="chgPrintReceipt"' 'id="invHardware"' \
  "addEventListener('tks-scan'" 'function posThermalReceipt' 'data-label='; do
  printf '%s  <= %s\n' "$(grep -c "$p" index.html)" "$p"; done

# (c) edge-function sources carry the shop scoping — first prints 5 files, second prints 2
grep -l 'auth.shopId' supabase/functions/pay-*/index.ts
grep -c 'no active shop membership' supabase/functions/_shared/auth.ts

# (d) JS syntax
node --check app/hardware.js && echo "hardware.js OK"
```

If any anchor count is 0 or a file is MISSING, the front-end didn't fully transfer — re-copy that file
from the main PC. (Reference fingerprints from the main PC are in the §2 table.)

There is **no deploy step for the front-end** — it's static files served as-is. Once the files are
present and §3 is green, the app is at parity. (Serve/run `bittings-unified/index.html`; ideally from
`http://localhost` on the printer PC — see §4.)

---

## 4) Remaining work that is PHYSICAL (only the owner, on the shop PC, can do)

The software for all three devices is built and previews work with no hardware. Full steps live in
`HARDWARE_SETUP.md`; the essentials:

- **Barcode scanner:** set it to USB-HID keyboard mode + Enter suffix → app: Inventory → 🖨️ Hardware →
  enable → scan into the Test field. No download.
- **Star TSP100 + drawer:** download Star Web SDK (`StarWebPrintBuilder.js` + `StarWebPrintTrader.js`
  from github.com/star-micronics/starwebprnt-sdk) into `app/vendor/`, uncomment the two Star `<script>`
  tags in `index.html`, install futurePRNT + a **Star WebPRNT host service** on the POS PC (NO TSP100
  has a built-in WebPRNT server — the app POSTs to `http://localhost:8001/StarWebPRNT/SendMessage`).
  Owner is **undecided on the exact TSP100 model**; the code is endpoint-agnostic so that's fine.
- **Zebra ZD421:** install **Zebra Browser Print** + put its two `BrowserPrint-*.js` files in
  `app/vendor/`, uncomment the two Zebra `<script>` tags, calibrate labels (SmartCal), confirm 203 vs
  300 dpi, then Test label. A 🏷️ button then shows on each Inventory row.

`app/vendor/` is created by the owner when they download the SDKs; it is intentionally not in the repo.
Pre-written commented `<script>` tags are already in `index.html` right after `app/hardware.js`.

Recommend serving the app from **http://localhost** on the printer PC to avoid the HTTPS→localhost
blocking both vendors warn about.

---

## 5) Open decisions / follow-ups the owner may raise (not started)

- **Thermal logo** is OFF by default (raster logos are the flaky part) — enable after confirming text prints.
- **Auto-print receipt on sale** is NOT wired — the 🖨️ Receipt button is manual (kept the money path untouched). Owner was offered this.
- **CloudPRNT path** (TSP100IV printing untethered via a Supabase edge function) — offered, not built.
- **Tier-gating** (`require_tier()` on RPCs) — deliberately skipped; every pilot shop is Pro. Add when selling lower tiers.
- **billing-checkout / billing-webhook / connect-onboard** edge functions were NOT reviewed for shop-scoping (they write `subscriptions`, which has its own fence) — worth a pass before per-shop Stripe Connect payouts.

---

## 6) Note on continuity
Claude Code "memory" is per-machine and does NOT travel between PCs — this document is the cross-PC
source of truth. After you verify parity, you may write your own local memory summarizing the above so
future sessions on this PC have context. If anything here doesn't match what you find (different Supabase
project, missing node_modules, app served from a different folder), surface it to the owner rather than
guessing — this is the money path and the shop's live tool.
```

# Turbo Keysmith — App structure build (front-end only)

Branch: **`app-structure`** (off `public-website`). Nothing published. No cloud spend, no
credentials wired. All data is **localStorage today**; every read/write goes through one
data layer (`app/store.js`, `window.TKS`) with a single **CLOUD SWAP POINT**.

## Preview (local, still running)
- **Staff app** (dark): http://127.0.0.1:8088/  → Customers · Receipts · Scheduler · Payments · Inventory
- **Public site** (light): http://127.0.0.1:8099/  → contact form `/contact/`, language toggle 🌐 in the header

## Built so far
1. **Shared data layer** `app/store.js` — Customers / Inventory / Bookings over the existing
   `tks_*` keys, so the customer list is shared across every tile.
2. **Inventory tile** — list, add/edit/delete, qty +/- steppers, **low-stock flag**, search,
   summary chips, **supplier + reorder-qty** fields (low rows show a reorder hint).
3. **Contact form** (`site/contact/`) — saves a lead to the shared Customers list; fully bilingual.
4. **Scheduler day view** — hour grid from `tks_bookings`, tap an open slot to book; Google
   Calendar shown as a **NOT CONNECTED** placeholder.
5. **Connected tiles** — shared customer list + "‹ Apps" back links.
6. **Supabase CloudAdapter (READY, OFF)** — `app/store.js`. Cache-backed, same API as local;
   per-table mappers. Dormant until `TKS.connectCloud({url, anonKey})`.
7. **SQL** — `supabase/customers_setup.sql` (exists) + **`supabase/app_tables_setup.sql`**
   (inventory incl. supplier/reorder_qty, bookings, receipts) with RLS, policies, grants, triggers.
8. **Spanish toggle** — `site/assets/i18n.js`; chrome translated site-wide, homepage hero +
   contact form fully translated.
9. **Payments tile UI shell** — amount, shared-customer picker, method control, live Charge
   label; charging is a clearly-labeled demo stub.
10. **A11y + mobile pass** — labels associated, keyboard-operable rows, focus-visible outlines,
    16px inputs, ≥40px tap targets, reduced-motion, aria-live messages.

## Update 2026-06-22 — Phase 2: POS / cash-register + configurable commission engine
Branch `phase2-pos-commission`. SQL in `bittings-app/supabase/phase2/`.
- **2a POS:** `inventory.sell_price_cents` (added to the part editor + `inventory_safe` view, visible to all; cost still masked). `services` table (price list, RLS read=staff/write=manager+). **`pos_checkout(payload)`** (SECURITY DEFINER) re-prices catalog lines server-side, gates discount/price-override to `is_manager()`, tags each line `lineType` (part/service/programming), builds a `receipts` row (source='pos') for the existing pay flow, returns the id. **`pos_decrement_stock(receipt)`** decrements part lines from `posLocation` via `inventory_locations` (idempotent via `data.posStockApplied`). The POS register **replaces** the New-Charge form in `index.html` (`posTicket`/`posRender`/`posBuildPayload`/`posCheckoutThen`); `pay.js` gained **`opts.skipUpsert`** so the server receipt isn't overwritten by the client. Manager **services editor** (`posManageServices`).
- **2b commission:** `commission_config` (single row; pays_on/structure/flat_pct/daily_min_cents/tiers/flat_per_job/exclude_parts/earned_when/hold_unreconciled; RLS write=manager+; owner model seeded, values blank). **`commission_day_rows(from,to,tech)`** (SECURITY DEFINER) computes per-tech-per-day commission from PAID (`payment_transactions` captured, non-reversed) POS sales, tagged by lineType, per config; `daily_min_pct`=max(min, %·base), `flat_pct` implemented, tiered/per-job stubbed; a **technician is forced to their own uid** (own-scope); held = linked booking `reconciliation_pending`.
- **2c/2d UI:** new **Commission** view in `index.html` (`renderCommission` — own ledger for techs, all+filter for managers; `openCommissionRules` config editor) + the **sign-off** section (`renderCommHolds`/`commSignoff`). **`jobs_awaiting_signoff()`** + **`job_release_hold(job,action,note)`** (manager+; release clears `reconciliation_pending` + `data.needsManagerSignoff` via the `app.allow_status` guard flag, audited → releases the commission hold). Data layer: `TKS.POS`, `TKS.Commission`.
- **Verified server-side** with the technician + owner test users: 2a pricing/discount gating + per-location decrement; 2b parts-excluded + daily-min + own-scope; 2d tech-blocked / owner-release-clears-flag. No ERROR-level advisors.

## Update 2026-06-22 — Phase 1 tail: 1b/1c operating screens + payment auth + receipt cost-strip
- **Data layer (`store.js`, after the `TKS` object):** `TKS.Fleet` (vans CRUD + `assignHomeVan`), `TKS.InvOps` (`move`/`receive`/`adjust` → the `inv_*` RPCs; `locations(itemId)`), `TKS.Jobs` (`setStatus`/`cancel`/`reconcilePart`/`assign`/`unassignRole`/`parts`/`addPart`/`meta`/`uploadProof`). All are thin wrappers over the server RPCs/tables that already enforce the matrix; they return the supabase-js promise so a denied action surfaces as `{error}`. They need a live cloud session (`authState.sb`) or they throw. New caps in `TKS_CAPS`: `invMove` (owner/mgr/tech), `invReceive` (owner/mgr/front_desk), `takePayment` (all).
- **`fleet.html` (NEW, manager+):** van add/edit/status list + owner-only delete (`data-cap=hardDelete`) + owner-only home-van assignment panel (`data-cap=manageStaff`). Boots like setup.html (probe session → `connectCloud` → gate via `can('setup')`). Wired into `index.html` sidebar as `data-embed="fleet.html"` (owner-soft = manager+).
- **`index.html` inventory:** when signed in, each part row shows a 📍 button → `openStockPanel(part)` (a bottom-sheet): per-location qty + Move/Receive/Adjust blocks each `data-cap`-gated; offline falls back to the legacy binary van/shop flip. `partLoc`/locations use `inventory_locations` rows keyed `'shop'`/`'van:<id>'`.
- **`scheduler.html` job detail:** `setBookingStatus` now routes through `job_set_status` when signed in (maps the familiar 5-status picker → the 7-state cloud machine; `Canceled` → `openCancelJob` → `job_cancel`), mirroring to local `data.status` for the day-board. `loadJobAccount(jobId)` renders the **accountability panel**: authoritative `meta()` status + recon flag, lead assignment (manager+), parts checklist (`jaReconcile` — cut-key `returned` opens a file/camera input → `uploadProof` to the private `job-proof` bucket → `reconcilePart`), `jaCheckVanStock` ("part not on van" flag + guided `inv_move` shop→van), and Cancel-with-reason pick-list. A tech's status picker is greyed on non-own jobs (own-job also enforced server-side).
- **Decision 1:** New-Charge `chgGate` opened to any signed-in staff; Payments nav un-gated; bittings Settings gate fixed to `can('setup')` (managers reach Settings).
- **Edge functions:** `_shared/auth.ts` gains `requireStaff`/`ALL_STAFF`. `pay-record`/`pay-create-intent`/`pay-terminal`/`pay-status` now call `requireStaff` (verified JWT + active staff) and use the verified uid for `created_by` (was an *unverified* base64 decode). Deployed; anon → 401. CORS left as-is to avoid disturbing the live flow.
- **Cost masking:** `receipts_safe` view (strips per-line `cost`/`unitCost` for non-managers via `strip_receipt_costs(jsonb)`); `store.js` reads receipts via `readTable:'receipts_safe'`. Both `inventory_safe` + `receipts_safe` recreated `security_invoker = true` (cleared the `security_definer_view` ERROR advisor). `fn_guard_booking_status` EXECUTE revoked (trigger-only).
- **Verified server-side:** 1c flow end-to-end (own-job, completion gate, cut-key photo gate, cancel-reason, guard) on a real booking, rolled back clean; receipts_safe tech=masked/owner=full; all four pay fns reject anon. See `PHASE1_PROGRESS.md` §verification.
- **New-Charge customer picker (index.html):** replaced the free-text name/email + datalist with `chgCustomer` state + `openChgCustomerPicker()` (search existing `TKS.Customers` or add-new → `Customers.upsert`, de-duped by phone/name). `chgBuildReceipt` now carries `customerId`/`phone`. **Card + Check require a customer; Cash optional** (validated in `chgCard.onclick` / `chgRecord('check')`). Closeout link `data-cap="viewAudit"` (manager+).
- **Vendor-tools gating (index.html `renderQuickTiles`):** Keycodes tile `data-cap="keycodes"` (owner/manager/technician); all config vendor/NASTF/custom tiles `data-cap="vendorTools"` (owner/manager); "Vendor tools" nav header `data-cap="keycodes"` (so front_desk sees no section). New caps `keycodes`/`vendorTools` in `TKS_CAPS`. `applyGates(box)` called after render.

## Update 2026-06-17 (u) — Two brand layers: product (Bittings, hardcoded) vs shop (from Settings)
- **Rule**: `.bt-sidebar__brand` (mark.svg + "Bittings") is the SOFTWARE/product brand — hardcoded, never per-shop.
  Everything else that named a shop must come from `TKS.Config.identity().name` / `.logo`. (Reverted the earlier
  mistake of pointing `#sideLogo` at the shop logo.)
- **index.html**: added `bizName()` = `identity().name||'your shop'`. On-load init sets `#appName` (top header
  `<h1>`), `#btWorkspaceName` (sidebar workspace line), and `document.title` to `bizName()`; `#appLogo` (top header
  only) ← `identity().logo`. Static fallbacks de-TK'd: `<title>Bittings</title>`, h1 "Your shop", workspace "Your
  shop". Receipt/share/email/CSV strings (`'Receipt from '+bizName()`, `bizName()+' receipt'`, mailto subjects,
  manager-CSV header) now use `bizName()`.
- **setup.html**: header `<img>` now uses `TKS.Config.identity().logo||'tks_logo.png'` + name as alt (it's the
  shop's own setup); `<title>` → "Setup — Bittings".
- **lishi.html / programmers.html**: `<title>` "… — Turbo Keysmith" → "… — Bittings"; lishi corrections-export
  `.md` heading now uses the shop name (`identity().name||'Bittings'`).
- **cloud-test.html** (Sign-in, pre-auth → no shop yet): rebranded to the product — `<title>Bittings — Sign in</title>`,
  logo swapped to `app/ui/assets/mark.svg` + a "Bittings" wordmark div.
- Remaining "Turbo Keysmith" strings are code comments / file headers only (not user-facing).

## Update 2026-06-17 (t) — Dashboard logo pulls from Config.identity.logo
- `index.html` header logo (`#appLogo`, was hardcoded `tks_mark.png`) and sidebar brand (`#sideLogo`, was
  `mark.svg`) now set their `src` from `TKS.Config.identity().logo` in the on-load init (next to the existing
  workspace-name apply, ~line 2178), falling back to the bundled mark when `identity().logo` is empty. `#sideLogo`
  got `object-fit:contain` so a wide logo isn't squished in the 34×34 brand slot. Mirrors how `bittings.html`
  already does `hdrLogo.src = SETTINGS.logo`. Lishi/Programmers/Scheduler headers have no logo `<img>` (back-link
  only), so nothing to wire there. The receipt PDF already used `id.logo`.

## Update 2026-06-17 (s) — Customer list white-in-dark · VIN decode hardened + on the invoice
- **Customer list kept light in dark mode** (`index.html`): replaced the earlier `.crow .nm{color:#f4f5f7}` dark
  override with a `#view-customers`-scoped block that pins `.crow`/`.search` to white bg + `#14171b` text +
  `#1f6fd0/#9a6a00` avatars in dark (owner wants the white index-card look kept; box stays white either way).
- **VIN decode hardened** (`programmers.html`, `lishi.html`): the post-decode coverage/vehicle filter did
  `r.make.toLowerCase()` — a row with a null make threw, the `.then` rejected, and a SUCCESSFUL decode surfaced as
  "Could not read that VIN." Fix: show "Decoded: …" first, wrap the lookup in try/catch, and null-guard
  `(r.make||'')`. Also dropped the stale "📝 Corrections" hint in the programmers no-coverage message.
- **VIN decode on the invoice** (`bittings.html`): Quick invoice `#qiVin` now has a decode handler (change/blur, and
  on reaching 17 chars) → `TKS.decodeVin` → fills `#qiVYear/#qiVMake/#qiVModel`, with a `#qiVinMsg` status line.
  The chat invoice already decoded via `askVinWithDecode`→`decodeVIN`. All VIN inputs now decode: Start-a-job
  (`lookupVin`), Inventory `#invVin`, Programmers/Lishi `#vinBtn`, chat invoice, Quick invoice.

## Update 2026-06-17 (r) — Dark-mode specificity fix · hide src · corrections widget
- **Dark-mode priority bug**: `app/ui/legacy-dark.css` was linked BEFORE each page's inline `<style>`, so the page's
  own `:root{--ink:#14171b}` (specificity 0,1,0) tied with and beat `[data-bt-theme="dark"]{--ink…}` — but the
  explicit `body{background}` still applied → dark bg + dark (invisible) text (confirmed by user screenshots of
  Programmers My-tools / Coverage, and the customer list white cards). **Fix**: selectors now use
  `html[data-bt-theme="dark"]` (0,1,1) so they win regardless of stylesheet order. Index's own inline var block bumped
  to `html[...]` too. Added per-page dark overrides for hardcoded light surfaces that the var-flip can't reach:
  `.notein`/inputs (`#f3f4f6`→dark), `.card h2`/`h2`(`#14171b`→`--ink`), and brighter on-dark pill/accent colors in
  lishi & programmers; setup `input/select/textarea` + `.logo-prev img`.
- **Hide data source**: removed the `src: <…>` display from the Start-a-job result card (`index.html` renderResult)
  and the Lishi lookup card (`lishi.html` ~line 1020, `<div class="src">`). The `src:` values stay in the
  `CODE_SERIES_SRC` data and vehicle records — just not shown (owner sells the product; no provenance leak).
- **Corrections widget** (`app/corrections.js`, NEW): single running log in localStorage `tks_corrections`
  (`[{id,scope,ref,refLabel,text,by,ts,resolved}]`, same-origin shared). `window.TKS_CORR` =
  `all/forRef/add/remove/resolve/mountBox`. `mountBox(el,{scope,ref,refLabel})` renders a self-contained, theme-
  agnostic (translucent surfaces, `color:inherit`) "⚠ Something wrong?" collapsible with textarea + per-ref list
  (mark-fixed / remove). Wired into **Start a job**: `renderResult` appends `<div id="sjCorrBox">` and mounts with
  `ref=vehLabel` ("YEAR MAKE MODEL"). `index.html` loads `app/corrections.js` after `inventory-import.js`.
- **Programmers Corrections tab removed** (tool kept): deleted the `data-p="corr"` button, the `#p-corr` panel,
  `renderCorr()` + the `corrAdd/corrMd/corrCsv/corrClear` load-time bindings, and the `if(p==='corr')` nav branch.
  Old `tks_prog_corrections` store + `corr()/saveCorr()` helpers left in place (unused, harmless). Lookup notice
  reworded to point at "Something wrong?". (Per owner follow-up, corrections are Start-a-job-only for now — not added
  inline to Lishi cards / Coverage rows.)

## Update 2026-06-17 (q) — Dark mode propagated to every tool page
- **Shared toggle source**: all pages read `localStorage 'bt_theme'` (set by `app/ui/bittings-ui.js`) early in
  `<head>` and set `data-bt-theme="dark"` on `<html>`. localStorage is same-origin, so an embedded tool inherits the
  dashboard's theme on load.
- **`app/ui/legacy-dark.css`** (NEW): `[data-bt-theme="dark"]` overrides for the legacy var names
  (`--bg/--bg2/--card/--edge/--ink/--dim/--off`) + `body` bg/color. Linked by **lishi / programmers / setup** (they
  use `var(--card)` for surfaces with **zero** hardcoded white, so flipping the vars themes them cleanly). The
  **index dashboard** keeps its own inline equivalent block (added in update (p)).
- **Scheduler**: boot script now prefers `bt_theme` over its own `tks_sched_theme` / `prefers-color-scheme`, mapping
  to its existing `:root[data-theme="dark"]` theme. Its in-app toggle still works (writes `tks_sched_theme`).
- **bittings.html**: its "Studio light theme" block is unconditional (it's a light app by default; receipt-card
  preview is deliberately paper). Added a `[data-bt-theme="dark"] …` block that re-darkens the chrome (header, chat
  bubbles, inputbar, panels, fields, history/modal surfaces, tags) by specificity, plus `--bg/--light` dark values;
  the `.pp-card`/receipt preview is left untouched so it stays printable-white.
- **Live sync**: `index.html` adds a click handler on `.bt-themetoggle [data-bt-set]` that pushes the new theme into
  `#btEmbed.contentDocument.documentElement` (`data-bt-theme` for receipts/lishi/programmers/setup, `data-theme` for
  scheduler) so an open embedded tool flips immediately.
- **Customer names**: `.crow` card used legacy `--card` (white, pre-fix) while text used `--text-primary` (near-white)
  → white-on-white. (p) flipped `--card` dark; (q) also pins `[data-bt-theme="dark"] .crow .nm{color:#f4f5f7}` and a
  slightly brighter `.crow .sub`.

## Update 2026-06-17 (p) — Desktop embed-in-panel, sidebar footer, legacy dark-mode palette
- **Embedded tools (desktop)** — `index.html`. Sidebar items for Receipts/Scheduler/Lishi/Programmers switched from
  `data-open` (full-page `location.href`) to **`data-embed`**; new Settings button uses `data-embed="setup.html"`.
  Added `<iframe id="btEmbed" class="bt-embed">` as the first child of `.bt-main`. `openEmbed(url)`: on phones
  (`matchMedia('(max-width:720px)')`) it falls back to `location.href`; on desktop it sets the iframe src (skips
  reload if unchanged), adds `.is-embedding` to `.bt-app` (CSS hides `.bt-pagewrap`, shows `.bt-embed{height:100vh}`),
  and sets `.is-active` on the matching nav item. The `[data-go]` handler calls `closeEmbed()` first so built-in
  views (Start a job, Customers, Dashboard, …) drop out of embed mode. Bottom-nav Receipts keeps `data-open`
  (phone → full page).
  - **Anti-nest guard**: `app/ui/appnav.js` and `bittings.html`'s inline `#appnav` both detect `window.self!==window.top`
    and, when framed, hide their bottom bar AND any `a[href="index.html"]` back-link (so an embedded tool can't load
    the dashboard inside itself).
- **Sidebar footer** — new `.bt-sidefoot` above the theme toggle: `#sideSettings` (`owner-soft`, hidden via
  `syncOwnerTiles()`), `#sideSignedIn`, `#sideSynced`. `updateAuthUI()` now writes "Signed in: <email>" to
  `#sideSignedIn` and the top auth bar keeps only the role badge + Sign out (the old `setupLinkHTML()` ⚙ Setup link
  is no longer emitted; function left in place, unused). `setCloudPill()` mirrors cloud state into `#sideSynced`
  (`.on` = green).
- **Dark-mode legacy palette** — `index.html`. The page's own `:root` vars (`--bg/--bg2/--card/--edge/--ink/--dim/--off`)
  and the dashboard-scoped `#view-dashboard .dash` `--ds-*` set had **no** `[data-bt-theme="dark"]` values, so legacy
  components stayed light while the `.bt` shell (themed via `--surface-*/--text-*` in `bittings-ui.css`) went dark →
  black-on-dark / white-on-white. Added a `[data-bt-theme="dark"]` block that flips both var sets to the dark ramp,
  recolors hardcoded light surfaces (`.ll-sheet/.ll-row/.ll-ico/.denom-row input/.floatrow .amountwrap/.es-card`),
  and restores brighter on-dark accent colors for the rules under the "Studio light theme" comment (badges,
  rep-toggles, qbtn, drawer totals). Toggle is `app/ui/bittings-ui.js` (sets/removes `data-bt-theme` on `<html>`,
  persists `bt_theme`). **Standalone tool pages don't yet read `bt_theme`** — follow-up if the owner wants them dark too.

## Update 2026-06-17 (o) — Edit via the Quick invoice form; persistent app nav; index deep-link
- **Edit routes to the Quick invoice form** (`bittings.html`). `editReceipt(r)` now, when
  `quickInvoiceAvailable()` is true, calls `openQuickInvoice(function(){}, r)` and returns *before* the legacy
  chat editor — so editing reuses the full create form. Falls back to the chat editor when Quick invoice is off.
- **`openQuickInvoice(onCancel, edit)`** gained an `edit` arg. `const isEdit = !!(edit && edit.id)`. Seg defaults
  (docType/serviceType/payment) pull from `edit`; a pre-fill block (before `const cancel=`) fills every text input,
  rebuilds line items (`addItem()` per item, sets desc/qty/amt/cost/tax/partId), restores NASTF (`nastfType` +
  `.qiNF` fields), the warranty checkbox, retitles to `✏️ Edit <number>`, and labels the button "Save changes".
- **`submit(...,edit)` preserves identity** so `finish()` UPDATES instead of inserting a duplicate: when
  `edit.id`, it copies `id/number/savedAt/date/cashLogged` onto the receipt and restores `signatureData` from
  `edit.signature` (so the saved signature isn't wiped). `cashLogged` carried over → no double `pay-record`.
  This pairs with the edit-safe `finish()` (history save is update-or-insert by `id`/`number`; number/date/savedAt
  only assigned when unset).
- **Persistent app nav — everywhere.** Shared bottom bar, 5 links: Home (`index.html`) · Receipts
  (`bittings.html`) · Customers (`index.html?go=customers`) · Scheduler (`scheduler.html`) · Lishi (`lishi.html`).
  Two implementations, identical look:
  - **`app/ui/appnav.js`** (NEW, shared) — self-injecting `position:fixed; bottom:0; z-index:9000` bar. Injects its
    own `<style>` + `<nav id="tkAppNav">`, highlights the current page by filename, sets
    `body{padding-bottom:calc(56px + safe-area)!important}` to reserve space, and lifts the scheduler's own fixed
    `.nav` button bar above itself. Guarded by `window.__TK_APPNAV__`. Loaded via
    `<script src="app/ui/appnav.js"></script>` before `</body>` on **lishi / scheduler / programmers / setup**.
  - **`bittings.html`** keeps an equivalent **inline** `<nav id="appnav">` as the last flex child of its
    `display:flex;height:100vh;overflow:hidden` body (the chat scrolls internally) — a fixed overlay would collide
    with `#inputbar`, so here the bar is a flex sibling that naturally reserves space and pins. Same labels/styles.
  - `index.html` already had its own sidebar + `.bt-bottomnav`; left as-is.
- **Index deep-link**: `index.html?go=<view>` reads `URLSearchParams('go')` on load and fires the matching
  `[data-go]` button via `setTimeout(...,0)` (same render path as a real tap). Used by the Receipts nav's
  "Customers" tab. **Pending mobile sign-off** (iPhone Safari + Android Chrome, owner + staff).

## Update 2026-06-17 (n) — Key code series, per vehicle, on the Start-a-Job card
- **Data model**: `code_series` added to `VEH_FIELDS` (lishi.html) so the Lishi vehicle editor renders/saves it; the
  `v()` and `vm()` builders default it to `''`. Re-sliced `app/lishi-seed.js` (now lines 182–723 of lishi.html,
  i.e. through the `ensureSeed(); applyCodeSeries();` calls).
- **Sourced fill, never guessed**: `CODE_SERIES_SRC` = small PUBLICLY-sourced table `{make,model,ys,ye,series,src}`.
  `applyCodeSeries()` runs after `ensureSeed()` on every load; for each vehicle row with an **empty** `code_series`
  it sets `code_series`+`code_series_src` from an **EXACT make+model** match with year-range overlap (exact match
  deliberately chosen — a fuzzy `contains` made "Transit" inherit "Transit Connect"'s series). Never clobbers an
  owner-entered value. Verified in node: 230 veh, field present, **0 false matches** (the 5 sourced vehicles —
  Mitsubishi Eclipse/Endeavor/Galant '04–'07 = F1-F1571 [lockpicks], Ford Transit Connect 2020 = 10001-11500,
  Lincoln Corsair '20–'22 = 30001-31544 [AKS] — aren't in the current seed, so nothing is force-filled).
- **Display**: `index.html` `renderResult` adds a **Code series** cell to the job-lookup grid — shows
  `veh.code_series` + `veh.code_series_src` when present, else "Add in Lishi".
- **Coverage caveat**: code series are sparsely published publicly (HU101/B119 product pages list none; AKS returns
  403 to automated fetch). Real coverage needs a sourced master chart (Strattec catalog / AKS) imported into
  `CODE_SERIES_SRC`, or per-vehicle entry in the Lishi editor. Do NOT bulk-guess ([[no-fabricated-locksmith-data]]).

### 2026-06-17 (e) — cash/check sales now logged as transactions; job-history clickable; esc hardened
- **Cash/check paid sales now reach Dashboard/Reports/Closeout.** Root cause: bittings.html Pay Now is card-only and
  `finish()` never logged a transaction, so cash/check receipts (incl. every Quick invoice paid in cash) existed only
  as `receipts` rows — invisible to the payment_transactions-based dashboard/reports. Fix: added
  `window.recordCashSale(receipt, method)` in the payment IIFE (upserts the receipt, calls the **`pay-record`** edge
  fn — idempotency_key `inv_<id>_<method>`, recomputes total server-side, so it CANNOT double-count). `finish()` now
  calls it for `docType==='receipt' && status==='Paid in Full' && payment∈{cash,check}` (sets `receipt.cashLogged`).
  Card sales still log via Pay Now. Verified pay-record source + that it's deployed/active. (Pre-existing cash
  receipts won't backfill until re-saved.)
- **Customer Job-history rows are now tappable** (`index.html` `renderCustHistory` → `openJobModal(b)` showing
  when/service/vehicle/address/customer/status/notes). They were display-only before.
- **`esc()` hardened**: `String(s==null?'':s)` (was `(s||'')`) — a numeric field (job `duration`) caused
  `.replace is not a function`, which surfaced as "nothing happens" when opening a job. openForm now try/catches its
  sub-renders so the record always opens; invoice/job taps alert on error instead of failing silently.
- **NOTE on Contracting D1 quick invoices:** the contracting SHOP saves to `customers` with `is_contracting=true`
  (shows under the "Contracting (NASTF)" toggle, not People); the vehicle owner is NOT saved as a customer (by
  design — bill-to is the shop). Verified the RANCHWOOD AUTOWORKS test saved correctly to the cloud.
- The **"skip chat" toggle already exists**: Setup → Access → "Open Quick invoice automatically for a signed-in
  manager" (`access.quickInvoiceDefault`); owner's config already has it true + `quickInvoiceAutoForOwner()` fires
  in `startInterview()` → quick invoice auto-opens (cancel drops to chat).
- **Contracting D1 now also saves the VEHICLE OWNER as a customer** (`finish()`, after `saveShops`): upserts
  `voName`/`voPhone`/`voCity+voState` into `customers` (source `contracting-vehicle-owner`) for referrals + marketing.
- **Lockouts carry no warranty**: `isLockoutOnly(items)` (every item matches /lockout|unlock/ and none are
  Materials/Programming) → `finish()` forces `receipt.warranty=false`. A lockout that also sold a key/part still
  warranties. **Job modal** `Duration` now shows "N min" (it's the scheduler booking length, not warranty).

### 2026-06-17 (d) — code series 222/230 (owner keyway/blade rules) + programmers catalog
- After the xlsx pass, owner supplied keyway/blade rules → filled to **222/230** (8 blank). Implemented as: explicit
  `CODE_SERIES_SRC` entries for specific models AND a one-time keyway migration in `applyCodeSeries` (guarded by
  `tks_cs_keyfix2`; corrects existing localStorage once, never clobbers later owner edits). Rules: VW/Audi HU66=
  `0001-8110` / HU162T=blank; Volvo HU56=`DH0001-DH4000` / HU101=`04001-09001 / 4001-9001`; BMW=none; GM B106=
  `G0000-G3631` / HU100 8-cut=`Z0001-Z6314` (global replace of the old `Z0001-Z6000`) / 10-cut=`V0001-V5573`; Toyota
  by blade TR47/TOY43=`50000-69999`, TOY48=`40000-49999`, TOY40-prox=`80000-89999`; every CY24=`M0001-M2618`.
  SIP22 (no seed vehicle uses it) end found in the PDF = `DE1-DE11210`. 8 blank: VW/Audi HU162T (unknown), BMW
  (none), Mercedes C-Class HU64 (pending owner value).
- **Programmers** (`programmers.html` `SEED_DEVS`, `SEEDVER` 3→4): added older Advanced Diagnostics programmers
  T-Code Pro (TCP) / MVP Pro (MVPP) / TKO (`covkey:'smartpro'`, share Smart Pro coverage) and Silca/Ilco cloning
  machines RW5 / RW4 Plus / EZ-Clone Plus / Plus Box / M-Box (`covkey:'clone'` → no per-make grid; cloning is by
  chip type). All `owned:false` so the owner ticks what they have. Source = the Ilco 2025 "Transponder Equipment"
  column. (Left out SDD / SA+ — couldn't confirm exact product names; flagged for owner.)

### 2026-06-17 (c) — 196/230 vehicles: code series + HPC card from the 2025 Ilco ref (via owner's xlsx)
- Source: owner's `Desktop/Bittings_Key_Blank_Reference.xlsx` (Claude Desktop's extract of the 2025 Ilco Auto/Truck
  Key Blank Reference; 3,212 rows; cols incl. Code_Series, Card_No, Notes).
- **Code column was comma-chopped** (`5,001-8442` → Lock_Apps=`"All 5"` + Code=`"001-8442"`). Reconstructed via
  openpyxl: strip thousands commas; if Code isn't a full range and Lock_Apps ends with a short prefix, prepend it
  → 2,207 valid codes (validator `^[A-Z]{0,3}\d{1,6}[A-Z]?-[A-Z]{0,3}\d{1,6}[A-Z]?$`, must contain a digit).
- Mapped to 230 seed vehicles (exact make + model-startswith + year overlap), **aggregating ALL distinct codes**
  per vehicle (regular/prox/body) + distinct HPC cards + a note. 185 matched. `CODE_SERIES_SRC` ~200 entries
  (Ilco 2025 primary; Keyline 2015 / lockpicks / AKS fallback). `applyCodeSeries` sets `r.code_card`; `renderResult`
  shows code + `HPC card:` + note + src. Hand-added 6 dropped common models (Camry 18-24, Highlander, Avalon,
  Acadia, Accord) read from the PDF. Final: **196 code series, 182 HPC cards, 34 blank.**
- Caveats: xlsx dropped some common models (partially hand-filled); 34 still blank (Euro/OEM-only/trucks/ambiguous);
  Ford old `1X-1706X` slightly chopped; BMW `51.00001-…` dotted codes excluded. See [[code-series-by-vehicle]].

### 2026-06-17 (b) — Filled 47 vehicles from the owner's Keyline 2015 chart
- Owner supplied `2022-auto-truck-key-blank-reference.pdf` (177p, messy multi-line tables — Code col chops/misaligns,
  do NOT trust-parse without per-record year handling) and `keyline-product-guide-2015.pdf` (~23p, **clean one row
  per vehicle**: MAKE-MODEL · YEAR(S) · KEYLINE R/W · KEY/SHELL · OBP · 994 JAW · **CODE SERIES** · KEYWAY · NOTES).
- Parser (`/tmp/match_final.py`, throwaway): `pdftotext -layout` → per-line regex. Make = carry-forward from a line
  whose first token is a known make (headers like "HONDA" sit alone with no year — must set make BEFORE the year
  filter, else mis-attributed). Strip thousands commas (`50,000-69,999`). Code token = `[A-Z]{0,2}\d{2,6}-...`
  excluding year ranges, taken after the year column. Matched to the 230 seed vehicles by EXACT make + model
  startswith + year overlap; assigned ONLY when exactly one distinct code spans the overlap (unambiguous) → 47 rows.
  Verified samples vs raw (year discrimination holds: 2012-18 Focus got newer `10001-11500`, not the 2000-11
  `0001X-1706X`).
- Integrated as 45 entries (src `'Keyline 2015'` + short `note`) appended to `CODE_SERIES_SRC` in lishi.html;
  `applyCodeSeries` now also sets `code_series_note`; `renderResult` shows note + `src:`. Re-sliced lishi-seed.js.
- TODO: 2016+ vehicles + **HPC card** column come from the 2022 ref (needs careful parse); the 2015 "994 JAW" is a
  Keyline jaw, not HPC. Keyline 2015 also has cloning-tool/transponder columns for the Programmers page (task open).

## Update 2026-06-16 (m) — Mark-paid from customer, A/R + tax on dashboard, total-paid by period, warranty/T&C on receipt
- **index.html helpers** (near `custOwed`): `custPaid(c)` → rolling-window sums (`month`30d/`quarter`91d/`half`182d/
  `year`365d/`all`) of Paid-in-Full docs by `paidAt||savedAt`; `totalOwedAll()` → `{amount,count}` A/R across all
  receipts; `markInvoicePaid(ref)` mutates the receipt in `TKS.list('receipts')` (docType→receipt, status→Paid in
  Full, INV→TKS number, `paidAt`, consume stock once via `TKS.Inventory.adjustQty`, `stockApplied`), `TKS.saveList`.
  Idempotent (returns false if already paid). Verified in node.
- **Customer record**: `renderCustInvoices` adds a green **Total paid** block (all-time + 4 windows) and the
  "tap to see what was sold / mark paid" hint. `openInvoiceModal(r, cust)` gains a **"✓ Mark as paid"** button for
  unpaid invoices → `markInvoicePaid` → re-renders `renderCustInvoices(cust)` + `renderCustomers()`.
- **Dashboard**: `dashTx` now also sums `tax` (tax_cents). `renderDashboard` adds two KPIs — **Owed (A/R)** (from
  `totalOwedAll`, red when >0) and **Tax collected** (this month). `.dash-kpis` grid 4-col → **3-col** (6 KPIs = 2×3).
- **Reports**: removed the always-on **Tax collected** chip (moved to dashboard); cards now only render toggled
  `REP_METRICS`.
- **Warranty on the document** (bittings.html): `warrantyTermText(r)` → "N months limited warranty" (no date;
  receipts/invoices only). Shown on the receipt card (with the countdown pill) and in the PDF right-column under the
  status (`toY+52`, GREEN). Internal countdown pill unchanged.
- **Configurable Terms & Conditions** (multi-tenant): `store.js` `identity.termsUrl` default `''`; Setup → identity
  field `#f_termsUrl` + gather. bittings `configTermsUrl()` (reads `TKS.Config.identity().termsUrl`, else
  `SETTINGS.termsUrl`), `termsHref`/`termsDisplay`. `hydrateIdentityFromConfig` now copies `termsUrl`. The two
  previously-hardcoded `turbokeysmith.com/terms` strings (signature card line ~1254, PDF auth line) are generalized:
  with a URL → "agreed to *{SETTINGS.name}*'s Terms & Conditions (*display*)"; blank → the T&C clause is dropped.

## Update 2026-06-16 (l) — Warranty tracking + open-invoice ("what was sold") modal
- **Config** (`app/store.js`): new `warranty:{months:6, defaultOn:true}` group in `CONFIG_DEFAULTS`; added to the
  `Config.save` deep-merge group list and exposed via `Config.warranty()`.
- **Setup** (`setup.html`): Payments step adds `#f_warrantyMonths` + `#f_warrantyDefault`; `gather('payments')`
  writes `cfg.warranty.months` (int, clamped ≥0) and `cfg.warranty.defaultOn`.
- **bittings.html**: helpers `configWarranty()`, `warrantyUntilTs(start,months)` (calendar-month add via
  `Date.setMonth`), `warrantyInfo(r)` → `{until,days,expired}`, `warrantyPillHTML(r)` (green / amber ≤30d / red
  expired). `finish()` stamps warranty: estimates cleared; chat flow applies the Setup default when
  `receipt.warranty===undefined`; sets `warrantyStart=savedAt` + `warrantyUntil`. Quick invoice has
  `#qiWarranty` (shown when months>0, hidden for the estimate type, default = `defaultOn`) and `submit()` sets
  `receipt.warranty`/`warrantyMonths` explicitly (so `finish()` doesn't override). Pill rendered on the receipt
  card (under totals) and each Receipts history row. Receipt fields added: `warranty`(bool), `warrantyMonths`,
  `warrantyStart`, `warrantyUntil` (ms).
- **index.html**: ported `warrantyInfo`/`warrantyPill` (read-only). The customer invoice list rows are now
  tappable (`.inv-row` → `openInvoiceModal(r)`), showing a read-only **"what was sold"** breakdown (line items
  with qty/amount, subtotal/tax/surcharge/total, status tag, warranty pill, notes) — reads the receipt straight
  from `TKS.list('receipts')`, no cross-page nav. Warranty pill also shown inline on each invoice row.

## Update 2026-06-16 (k) — Customer invoice history + balance owed, Quick-invoice presets, category-correct add-item
- **Customer invoice history + Net-30 balance** (`index.html` Customers form). New `#custInvoices` block under the
  existing `#custHistory`, rendered by `renderCustInvoices(c)` (called from `openForm`). Helpers: `custReceipts(c)`
  filters `TKS.list('receipts')` by `customer` name (case-insensitive — works for people and contracting shops);
  `custOwed(c)` sums `totals.total` of docs where `docType==='invoice' && status!=='Paid in Full'` (paying flips an
  invoice to a receipt *or* sets `Paid in Full`, and card-paid invoices set `Paid in Full`, so both are excluded —
  estimates and receipts never count). `invStatusTag` → PAID/UNPAID/ESTIMATE. The list view (`renderCustomers`)
  computes an `owedByName` map in **one pass** over receipts (not per-row, since the search box re-renders on every
  keystroke) and shows a red **"OWES $X"** `.tag` on any customer with a balance. No new store; reads existing
  `tks_receipts`.
- **Quick-invoice line-item presets** (`bittings.html` `openQuickInvoice`). `qiDesc` now has `list="qiSvcList"`; a
  `<datalist>` is built by `buildPresets()` from `TKS.ServiceCats.servicesFor(keyForInvoice(getSvc()))` (priced
  owner services) + `getCommonJobs()` filtered to the chosen service (`svc===label || 'Any'`), rebuilt when the
  Service segment changes. On a line's `change`, a matching preset auto-fills `.qiAmt` (if empty) and `.qiTax`
  (taxable heuristic / seed flag). Free-text still works.
- **Category-correct "Add another item"** (`index.html` Materials & Services). Replaced the flat `MS_CATALOG` with
  `MS_CATALOG_COMMON` + `MS_CATALOG_BY_CAT{automotive,residential,commercial}`; `fillMsCatalog(category)` rebuilds
  `#msCatalog` and is called from `openMatSvc` so a Residential job no longer offers Transponder/Remote/Smart-key.

## Update 2026-06-16 (j) — Repairs: Lishi seed on home screen, NASTF in Quick invoice, button contrast
- **`app/lishi-seed.js` (NEW, shared).** Sliced verbatim from `lishi.html`'s seed block (lines 182–694:
  `readLS`/`writeLS`/`uid`/`esc`, `K_TOOLS`/`K_VEH`, `SEED_TOOLS`+`EXTRA_TOOLS`+`LISHI_OFFICIAL`+`CROSSREF_ADD`
  → `ALL_TOOLS`; `SEED_VEH`+`EXTRA_VEH`+`EXTRA_VEH2` via `v`/`vm`/`MK` → `ALL_VEH`; `SEEDVER=8`; `ensureSeed()`)
  wrapped in an **IIFE** so its globals don't collide with the host page, and it self-runs `ensureSeed()` on load.
  Builds **120 tools + 230 vehicles**; writes `tks_lishi_tools` / `tks_vehicle_keyways` with the same
  seed-once-then-merge-by-key logic as the Lishi page (so it never clobbers owner edits and is a subset that
  self-heals toward the Lishi page's superset). Exposes `window.TKS_LISHI_SEED={tools,veh}`.
  Loaded in `index.html` right after `app/store.js`. **`lishi.html` is unchanged** (keeps its own inline copy;
  keep the two in sync if the seed changes). Fixes: Start-a-job showed "—" for the Lishi tool until the user had
  opened the Lishi page at least once.
- **NASTF in the Quick invoice** (`openQuickInvoice`, `bittings.html`). Added an optional **NASTF D1** segmented
  control (`.qiNB`: `""`/`Customer D1`/`Auction/Fleet D1`/`Contracting D1`) in `#qiNastfWrap`, shown only when
  `getSvc()==="Automotive"` (toggled by a click listener added to `.qiSB` + `syncNastfVisibility()`). Selecting a
  type renders its `NASTF_FIELDS[type]` inputs into `#qiNastfFields` (`<select>` for `options`, else `<input>`;
  `numeric`→inputmode; skips the `address` key since the modal already has one; `jobLocation` auto-fills from
  `#qiAddr`). `getNastf()` returns `{type, values, fields}`; `submit(getType,getSvc,getPay,getNastf)` enforces
  `req:true` fields, then sets `nastfInfo={type}` and `Object.assign(receipt, values)` — so the existing
  `renderReceiptCard` / PDF NASTF blocks (driven by `r.nastf.type` + `r.<key>`) print unchanged. No separate modal.
- **Button contrast (light theme)** `bittings.html` manual interview: five `.opt` buttons set a dark inline
  background but inherited `color:var(--red)`, washing out in daylight. Added `color:#fff` (+ red border) to:
  Decode VIN, From Inventory, owner Setup-service shortcut, Custom item, "Use $last-price".

## Update 2026-06-16 (i) — Start-a-job result card (real data), Materials & Services step, van/shop inventory
- **Rich Automotive result** (`index.html` Start-a-job): `renderResult(year,make,model,vin)` reads the shared
  localStorage stores (`tks_vehicle_keyways`, `tks_lishi_tools`, `tks_prog_coverage`, `tks_prog_devices`,
  `tks_inventory`) — replicated helpers `matchVeh`/`toolForKeyway`(+`KW_ALIAS`)/`progPills`(owned devices ×
  coverage `cov`)/`vanParts`. Renders the demo layout (`.sj-grid` 1.55fr/1fr, stacks ≤720px) with keyway+tool,
  transponder, ignition (`ynPill`), inventory check, programmer pills, OEM/NASTF, and an "In your van" list.
  Honest "—"/"Verify in Lishi" when a store isn't seeded yet. (Reliability caveat: `tks_vehicle_keyways` /
  `tks_lishi_tools` are now also seeded on the home screen via `app/lishi-seed.js` — see Update 2026-06-16 (j);
  `tks_prog_*` are still seeded only by the Programmers page.)
- **Materials & Services step** (`view-matsvc`, in `views`): `openMatSvc(category,service,vehicle)` →
  `suggestAddons()` keyword map (rekey→lock/deadbolt/smart-lock; auto lockout→lost-key/spare/fob; etc.). Chips
  toggle `.on`; "+ Add" custom; **Continue** saves `sessionStorage['tks_job_draft']` and opens `bittings.html`
  (line-item prefill from the draft = TODO). Wired from the auto card buttons (`data-ms="akl"/"svc"`) and the
  res/com `#sjContinue` (`openMatSvc(_jt, sjService.value)`); `_jt` tracked in `pick()`.
- **Inventory van/shop** (`store.js` + `index.html`): config gains `locations:{van,shop}` (default van-only) —
  added to `CONFIG_DEFAULTS`, `mergeConfig`, `Config.locations()`, and the `Config.save` deep-merge group list.
  Setup → Business identity has `#f_locVan`/`#f_locShop` checkboxes (gathered in `gather('identity')`, never
  both-off). Parts gain `loc:'van'|'shop'`. When **both** enabled: `#invLocSeg` All/Van/Shop filter, per-row
  `🚐/🏪` badge + `.moveloc` "→ Shop/Van" button (`Inventory.save` with flipped `loc`), and `#pLocWrap` van/shop
  segment on the part form (`partLocSel`/`setPartLoc`). Single-mode → no split (helpers `bothLoc()`/`partLoc()`/
  `defaultLoc()`). All inline scripts re-verified with `node --check`.

## Update 2026-06-15 (h) — Home=Start-a-job, tile hub retired, Y/M/M fallback, receipt split, Key Tool Max Pro
- **`index.html`:** `view-home` (the tile grid + inline Vendor-tools) **removed**; `view-startjob` is now
  `class="view active"` (the landing) and `'home'` was dropped from the `views` array. All `'home'` fallbacks
  (`back.style.display`, `back.dataset.to`, `backBtn` default) repointed to `'startjob'`. A hidden `#homeNote` stub
  is kept so `setCloudPill()` stays null-safe.
- **Vendor tools relocated to the sidebar:** `renderQuickTiles()` now renders `.bt-nav__item` rows into a
  `#quickTiles` container inside `.bt-nav` (under a `.bt-navhead` "Vendor tools" label); still wired to
  `openLinks()` via `data-links`. Phone access to the full menu: a **slide-in drawer** — `#btMore` (bottom-nav
  "More") adds `.is-open` to `.bt-sidebar` + `#btScrim`; tapping the scrim or any `.bt-nav__item` closes it (CSS in
  the inline host-override block, `@media ≤720px`).
- **Start-a-job Automotive VIN ⇄ Y/M/M:** `#sjMode` toggle swaps `#sjVinBox`/`#sjYmmBox`; Y/M/M uses a `#sjYear`
  select (2026→1998) + `#sjMake` (datalist `#sjMakeList` from a 34-make `MAKES` array) + free-text `#sjModel`.
  `lookupVin()` (decode) and `lookupYmm()` both call the shared `renderResult(vehLabel, make, sub)`; landing
  defaults to `pick('automotive') + setMode('vin')`. All inline scripts re-checked with `node --check`.
- **`bittings.html` — receipt send split:** the post-payment success button became two: **⬇ Download receipt**
  (`makePDF(r,'en',true)`) + **📤 Send receipt** (`shareDocument(r,'en',true)`), in a flex `.pnSend` row (≥44px
  targets). NASTF/My-Copy/Customer-Copy logic untouched.
- **`programmers.html` — `ktmaxpro`:** added **Xhorse VVDI Key Tool Max Pro** to `SEED_DEVS` catalog
  (`covkey:'ktmax'`, `owned:false`; built-in OBD + CAN-FD; `coverage_src` cites the official spec page + Xhorse
  remote-support list). `SEEDVER 2→3` so existing installs merge it. Harness: 15 catalog devices / 7 owned, 54
  coverage rows. **No single official compatibility chart exists** (in-app DB only) — flagged on the row.

## Update 2026-06-15 (g) — Bittings design system + shell (started; `index.html` flagship + "Start a job")
- **New shared UI kit under `app/ui/`:** `bittings-ui.css` (framework-agnostic component classes, scoped under a
  `.bt` body class; two themes via `:root` + `[data-bt-theme="dark"]` — Studio light default / Tactical dark),
  `bittings-ui.js` (theme toggle, persists `localStorage['bt_theme']`, exposes `window.BittingsTheme`, syncs
  `meta[theme-color]`), logo SVGs (`assets/mark.svg`/`mark-mono.svg`/`assets/favicon.svg`), and `demo.html` (the
  verbatim reference target). Vite-style `public/` paths from the spec were adapted to `app/ui/assets/` so links
  resolve in this static app. **PNG favicons not yet generated** (SVG favicon works; raster is a one-time export).
- **`index.html` integrated (flagship):** `<body class="bt">`; head gets the no-flash snippet **before** the
  `bittings-ui.css` link + the SVG favicon. The existing `.wrap` (header/authbar/all views) is wrapped in
  `.bt-app > .bt-sidebar` + `.bt-main > .bt-pagewrap`, with a `.bt-bottomnav` sibling for ≤720px. Host overrides
  in the inline `<style>`: `body.bt{padding:0}`, `.bt .wrap{max-width:760px}`.
- **Nav reuses existing wiring:** every `.bt-nav__item`/`.bt-bottomnav__item` carries the SAME `data-go`/
  `data-open` attributes the tiles use, so the existing `[data-go]`/`[data-open]` click handlers drive them with
  no new routing. Owner items carry `owner-only`/`owner-soft` (+ `display:none`) so `syncOwnerTiles()` gates them
  identically on desktop and phone. `show()` now also toggles `.is-active` on nav items whose `data-go===name`.
- **"Start a job" = new `view-startjob`** (added to the `views` array + a `data-go="startjob"` branch →
  `openStartJob()`). Job-type chooser (`.bt-jobtype` auto/res/com) → **Automotive**: `TKS.decodeVin` → result card
  with an inventory snapshot (`TKS.list('inventory')` matched by make) + CTAs that route to `lishi.html`/
  `programmers.html`/`bittings.html` (Lishi stays the source of truth for keyway/tool/programmer — not duplicated);
  **Res/Com**: `TKS.ServiceCats.servicesFor(jt)` → `<select>` → `bittings.html`. Empty data → honest "—"/"No stock
  recorded" pills, never fabricated. Logic lives in a dedicated `<script>` before `</body>`; `bittings-ui.js` loads
  after it. All inline scripts re-verified with `node --check`; shell div nesting balanced (1× app/sidebar/main/
  bottomnav).
- **Remaining (not yet done):** apply `class="bt"` + shell + component classes to `bittings.html` (NASTF logic
  untouchable — restyle only), `scheduler.html`, `lishi.html`, `programmers.html`, `setup.html`, `cloud-test.html`;
  generate PNG favicons. **Status = in progress; Home code-complete pending mobile sign-off.**

## Update 2026-06-15 (f) — Whole staff app reskinned to the light "Studio" theme
- **Scope:** all 7 staff pages — `index.html`, `bittings.html`, `scheduler.html`, `lishi.html`, `programmers.html`,
  `setup.html`, `cloud-test.html`. **Public `site/` deliberately untouched** (separate design). Visual only; no
  JS/logic/data/key changes (bittings inline scripts re-verified with `node --check`).
- **Canonical Studio palette** (applied via each page's existing CSS custom-properties): `--bg:#f6f7f9`,
  `--bg2:#eef0f3`, `--card:#ffffff`, `--edge:#e3e6ea`, `--ink:#14171b`, `--dim:#5a616c`, `--off:#9aa1ac`; brand
  `--red` kept; shadow `0 1px 2px rgba(20,23,27,.04),0 8px 24px rgba(20,23,27,.06)`. `theme-color` meta → `#f6f7f9`.
- **Method per page:** (1) repoint the `:root` tokens to the Studio values (flips everything that goes through
  `var(--…)`); (2) fix hardcoded dark backgrounds surgically / via scoped `replace_all` (`#11141a`/`#181b21`/
  `#1b2330`/`#1c2f24`/`#23272f` radial → light; `rgba(255,255,255,.0x)` fills → `rgba(20,23,27,.0x)`; inline
  `#2a2f3a` buttons → `#e7e9ee`); (3) append a small **"Studio light — accent contrast"** override block at the
  end of each `<style>` that darkens light-on-dark accent text (pills, role/cloud badges, avatars, seg-active,
  status colors) for readability on white. Chart.js grid recolored to `rgba(20,23,27,.06)`.
- **`scheduler.html`** was already a light theme (warm) — only its neutral tokens (`--ink/--ink-soft/--bg/--line/
  --shadow`) were aligned to the Studio values; its gold accent + header kept.
- **`bittings.html`** (the hardest — chat shell + many JS-inline modal styles): `--bg`→`#f6f7f9` + a light-shell
  override block, and `replace_all` on the JS-inline literals (`#1b1f27`→`#ffffff`, `#11141a`→`#f3f4f6`,
  `#2a2f3a`→`#e3e6ea`, `color:#f4f5f7`→`#14171b`, `#cbd2da`/`#9aa3af`/`color:#999`→`#5a616c`, `1px solid #555`→
  `#e3e6ea`, `background:#222`→`#f3f4f6`). **The `.receipt-card` (rc-*) preview was intentionally left as paper**
  (white + dark brand band) — verified `#fff`/`#333` intact and no `#1c1c1c` page bg remains.
- **Status = code-complete, pending mobile sign-off.** Light themes warrant a real-device contrast pass; Receipts
  has the most hand-tuned spots and any residual `#aaa`/grey-on-white nits would surface there first.

## Update 2026-06-15 (e) — Manager Dashboard (`view-dashboard` in `index.html`, read-only, manager-only)
- **New view** `view-dashboard` added to the `views` array + a `.tile.t-dashboard.owner-only` Home tile
  (`data-go="dashboard"` → `openDashboard()`), gated by `ownerHard()`/`syncOwnerTiles()` like Closeout/Reports.
  Back-target = Home (default). No new file, no stores, no writes.
- **Metric → data source (must reconcile with Reports):**
  - **Revenue** = `Σ max(0, base_cents − tax_cents)` of `status==='completed'` `payment_transactions` for the
    **current calendar month**, via `await TKPay.dayTransactions(monthStart,monthEnd)` — identical to
    `renderReports`' Sales. **Jobs** = count of those completed rows. **Avg ticket** = Revenue ÷ Jobs.
    Sub-lines: Revenue Δ% vs previous month; Jobs = jobs ÷ day-of-month elapsed; Avg Δ$ vs prev month.
  - **Repeat customers %** = of customers with ≥1 booking dated this month, the share with ≥2 lifetime bookings
    (`TKS.Bookings.all()` grouped by `customerId || phone || name`). Δ in pts vs prev month **only if** prev had
    ≥1 active customer (else hidden).
  - **Jobs this week** (flexbox bars, not Chart.js) = `status==='Completed'` bookings per weekday Mon–Sun of the
    current week; today's bar highlighted (peak day if today is 0). **Jobs by type** = this month's Completed
    bookings grouped by `serviceCategory`, % of total, ordered/labelled by `TKS.ServiceCats.active()`/`.label()`,
    tail >5 collapsed to "Other". Type colors `#ffb000/#4aa3ff/#9b6bd6…` cycled.
- **Honesty rule enforced:** deltas render only when real prior-period data exists; empty install → `$0`/`—`/zeros
  + "No completed jobs" empty-state, never fabricated trends. Verified in a stubbed node harness (15 assertions
  incl. the empty-install case).
- **Studio light surface:** self-contained CSS scoped under `#view-dashboard .dash{…}` with its own light tokens
  (`#f6f7f9` page / `#fff` cards / `#e3e6ea` border + the approved shadow) — a light panel inside the dark app, per
  the approved design. KPI numbers use a monospace stack. Drawn with flexbox/CSS bars (no Chart.js dependency, so
  it degrades fine). `#dashExport` builds a CSV from the cached `_dashData`. Responsive: KPI 4→2-up <560px, the
  1.5fr/1fr grid stacks. **Status = code-complete, pending mobile sign-off.** *(Next: the full app light reskin.)*

## Update 2026-06-15 (d) — NEW `programmers.html` (Key Programmer Coverage) + Home tile
- **New standalone staff page**, same local-first pattern as `lishi.html` (`readLS`/`writeLS`/`uid`/`esc`,
  versioned seed-merge, CSV import/export, corrections loop, modal editor). Loads `app/cloud-config.js` +
  `app/store.js`; reuses `TKS.decodeVin`. **Home tile** added in `index.html`: `.tile.t-programmers`
  (`data-open="programmers.html"`, indigo accent `#7b6bf0`).
- **Stores:** `tks_prog_devices` (the 7 owned tools), `tks_prog_coverage` (platform rows), `tks_prog_corrections`
  (field-fix log). Shares `tks_vin_cache` with `lishi.html`. Seed guard `tks_prog_seeded` / `tks_prog_seedver`
  (`SEEDVER=2`); on bump, devices merge by `key` and coverage merges by `make|system|year_start` (never clobbers
  edits) — same shape as the Lishi merge. **v2 migration:** existing device rows get `owned=true` + `covkey=key`
  backfilled, and the new variant catalog + broader coverage rows merge in.
- **Data model — coverage is keyed by immobilizer PLATFORM, not per-model.** A coverage row =
  `{make, system, model_hint, year_start, year_end, region, notes, confidence, source, cov}` where `cov` is a map
  of `deviceKey → {add, akl, rem, method, needs}` — **read via `dev.covkey||dev.key`**, so a coverage row only
  needs one column per *family*. Base families: `im608, im508, km100, ktmax, smartpro, apropad, lonsdor`.
  Reusable per-platform matrices (`M_GM, M_FORD, M_TOYG, M_TOYH, M_HONDA, M_CHRY, M_NISS, M_HK, M_VAGOBD,
  M_VAGMQB, M_MAZDA, M_SUB, M_MITS, M_BMW, M_MB` + older-era `M_OLD_DOM, M_OLD_PIN, M_EURO_ADV`) built via
  `d(add,akl,method,needs,rem)` (defaults add=Yes, rem=Yes, method=OBD); `cov(make,sys,hint,ys,ye,M,notes)`
  stamps `confidence:'By platform — verify on device'` + `source` (SRC). **54 seed rows** across the major US
  makes incl. older PK3/PATS/Sentry-Key eras + Volvo/JLR/MINI/Genesis/Fiat/Suzuki.
- **Selectable tools (`owned` + `covkey`).** Devices carry `owned` (bool) and `covkey` (which coverage column
  they read). `SEED_DEVS` = **7 owned base tools + 7 catalog variants** (`apropad_turbo`/`apropad_g3` → `apropad`;
  `im608_orig` → `im608`; `im508s` → `im508`; `lonsdor_pro`/`lonsdor_ise` → `lonsdor`; `ktplus` → `ktmax`), the
  variants `owned:false`. **🧰 My tools** renders an Own? checkbox per row (owned-first sort, owned count);
  `renderCards`/`capSummary` filter `owned!==false` and key the matrix by `covkey`. CSV (`DKEYS`) round-trips
  `owned` (coerced on import); the dev editor exposes `covkey`; new custom tools default `owned:true,
  covkey=key`.
- **Lookup:** VIN (`TKS.decodeVin`) **or** make+year selects → `coverage().filter(make && yearMatch)` →
  `renderCards` draws a per-tool matrix table (only rows for devices currently in `tks_prog_devices`; a missing
  `cov[key]` renders "not recorded — verify on device"). `pill()` maps Yes→ok, No→no, blank/—→na, anything else
  (Verify/PIN/License/Bench/Dealer/Restricted)→warn with the literal label.
- **Editors:** `openDevEditor` (flat `DEV_FIELDS`; new device gets a slug `key`); `openCovEditor` (top-level
  `COV_TOP` + a per-device 5-input block built from `CAP_FIELDS`; on save, fully-empty device blocks are dropped).
  Coverage CSV keeps the nested `cov` in a single **`cov_json`** column (`CCOLS`); import re-parses it.
- **Honesty model (per the "no fabricated locksmith data" rule):** values are vendor-published coverage +
  aftermarket consensus, every row flagged verify-on-tool; unknowns render as "Verify"/"not recorded", never a
  fabricated Yes. AKL specifics (the uncertain, version-drifting part) carry caveats in `needs`. The corrections
  loop is the intended long-term source of truth. Research basis: none of the 7 vendors expose a clean exportable
  VIN→capability feed (Autel OTOFIX checker; Xhorse in-app+blog; AD Info Quest/ADS#; XTool supportedvehicles.com;
  Lonsdor center/menulistinfo) — all firmware/region-dependent.
- **Verified in a stubbed node harness:** seeds 14 catalog tools (7 owned) + 54 rows; 2021 Toyota → "Toyota H /
  4A" (Lonsdor AKL=Yes, KM100 AKL=No, IM608 AKL=Yes); G2 Turbo variant reads the AutoProPad column via `covkey`;
  v2 migration backfills `owned`/`covkey` on a simulated v1 install; new makes present; pills render.
  **Status = code-complete,
  pending mobile sign-off** (iPhone Safari + Android Chrome, manager + staff). Staff app only — not public.

## Update 2026-06-15 (c) — `lishi.html` linking a tool to a vehicle (keyway picker + add-from-lookup)
- Tool↔vehicle link is by **keyway** (`toolForKeyway(r.keyway)`), not a stored tool id. So adding a
  vehicle with the right keyway is what surfaces the "Recommended Lishi" on the card.
- `openEditor(type,id,prefill)`: gained a `prefill` arg; the vehicle **Keyway** field is now an
  `<input list="kwList">` backed by a `<datalist>` of every tool's keyway + designation (e.g.
  "HU100 — HU100(10) V.3 (10 Cut)") so a new vehicle is guaranteed to resolve to a real tool.
- Inferred ("Matched by keyway") cards get a **"➕ Add to Vehicles"** button (`data-addveh`). The
  `#cards` click handler opens the editor prefilled from `_inferRow` (source stripped → saves as
  owner-added). New module var `_inferRow` set in `runVehSearch()`.

## Update 2026-06-15 (b) — `lishi.html` "Ignition pickable": Yes/No/N/A + owner-set caution
- Removed fabricated "Caution" values: `P` shortcut now `{pick:'N/A'}` (proximity/push-to-start = no
  cylinder); SEED proximity rows → `N/A`; the two true-cylinder rows (VW Golf MQB, Audi A4) → `Yes`.
- `pill()`: added `.pill.na` (muted) branch for `N/A`/blank; `caution` now renders `⚠ Caution`.
- **Owner-set caution:** each vehicle card with an `id` shows a `.cautbtn` "⚠ caution note". Click →
  `prompt()` for a note → sets `row.can_pick_ignition='Caution'` + `row.ign_caution=note` (blank clears
  back to `N/A`). Saved via `saveVeh`; re-renders via `_lastView` (set in `renderCards` from `ctx`).
  New optional field **`ign_caution`** on vehicle rows; shown next to the pill.
- Migration `sv<8` in `ensureSeed()` rewrites already-installed rows whose `can_pick_ignition==='Caution'`
  AND have no `ign_caution` (owner-added cautions are preserved), copying the corrected value from
  `ALL_VEH` (fallback `N/A`). `SEEDVER` 7 → 8.

## Update 2026-06-15 — `lishi.html` tools: 7-source cross-reference + 31 additions
- **`CROSSREF_ADD`** (new array after `LISHI_OFFICIAL`, ~423): 31 automotive tools via `tdef(...)`,
  source const `XR` ("Cross-ref 2026-06-15: Classic+Original Lishi, UHS, AKS, CLK, Key Innovations,
  LockPickWorld"). `ALL_TOOLS = LISHI_OFFICIAL.concat(CROSSREF_ADD)`.
- **`SEEDVER` 6 → 7**: existing installs merge the 31 new tools by `tool_designation` via the
  `sv<SEEDVER` branch in `ensureSeed()` (notes preserved, no clobber).
- **`KW_ALIAS`**: removed `DAT17:'DAT12R'` — a real DAT17 (Subaru) tool now exists, so it resolves to
  itself instead of the Isuzu/Hino DAT12R. Remaining alias conflicts (KK10→HY20, B102→B111) are NOT
  changed — flagged in `LISHI_CROSSREF_REVIEW.md`.
- **`LISHI_CROSSREF_REVIEW.md`** (repo root): owner-approval checklist of conflicts found between the
  live data and the 7 supplier sources (TOY43R, ICF03, DAT12R, NE38, HU46, HU101 make attributions;
  KK10/B102 aliases; GM37/B102 label). Apply only what the owner ticks.
- Sources scrubbed (automotive only): Classic Lishi 123, Original Lishi 93, UHS 136, AKS 92, Key
  Innovations 74, CLK 46, LockPickWorld 32 (variants counted separately).

## Update 2026-06-15 06:06 — `lishi.html` lookup: year-filtered models + keyway inference
- **`MODELS` catalog** (`const MODELS={...}`, ~447): per-make array of `[model, yearStart, yearEnd]`, 27
  makes. Drives the Model `<select>` and carries real production spans so discontinued models drop out for
  current-year lookups.
- **`populateModels()`** now reads both `fMake` and `fYear`: it unions `MODELS[mk]` (filtered to
  `yr>=start && yr<=end`) with the distinct models from verified `veh()` rows that match the year. Empty
  year = show all. `fYear`'s change listener now calls `populateModels()` then `runVehSearch()`.
- **`inferKeyway(make,year)`** (~477): switch of era rules per make family (Ford/Lincoln <2012 FO38 else
  HU101; GM brands <2010 B102 else HU100; Toyota/Lexus <2004 TOY43 else TOY48; BMW <2012 HU92 else HU100R;
  Mercedes HU64; Volvo <2008 NE66 else HU101; …). Returns '' if unknown.
- **`runVehSearch()` fallback chain:** verified `veh()` rows → if none and a model+inferred keyway exist,
  build a synthetic row `{…, keyway:inferKeyway, transponder/programming from MK defaults,
  source:'Matched by keyway (inferred — verify in field)'}` and render it → else a hint listing the make's
  on-file keyways. `populateMakes()` unions `Object.keys(MODELS)` with `veh()` makes.
- **Card tag:** `renderCards()` shows an amber `pill warn` "⚙ Matched by keyway — verify in field" when
  `r.source` starts with "Matched by keyway", so inferred cards are visually distinct from verified rows.
- Pending real-device sign-off (iPhone Safari + Android Chrome, owner + staff).

## Update 2026-06-14 23:55 — NEW page `lishi.html` (Lishi & Programming Reference)
- Self-contained staff-app page (own `readLS`/`writeLS`, `tks_` keys), loads `app/cloud-config.js` +
  `app/store.js` for `TKS.decodeVin`. Linked from the Home tile **🔑 Lishi & Keys** (`data-open="lishi.html"`).
- **Stores:** `tks_lishi_tools`, `tks_vehicle_keyways` (schemas per the changelog), `tks_lishi_corrections`,
  `tks_vin_cache`. `ensureSeed()` writes the bundled `SEED_TOOLS` (26) / `SEED_VEH` (58, via the `v()`
  helper) once, guarded by `tks_lishi_seeded` — never overwrites edits. Re-seed by clearing that flag +
  the store.
- **Card:** `toolForKeyway()` resolves keyway→tool; `inStock()` scans `tks_inventory`
  (name/sku/fitment/notes contains keyway or blank, qty>0); OEM/NASTF → red badge. VIN path matches
  make + year range (`yearMatch`) then narrows by model.
- **Corrections loop:** log entries {id,text,ts}; export `.md` (with a "Code: apply then clear" header)
  or `.csv`; Clear after export. Code reads the file, edits the two stores (or has the owner CSV-import),
  clears the log.
- **CSV import/export** per table (id-keyed upsert); duplicate detection on make/model/year+keyway (veh)
  and tool_designation (tools). Local-only (could later sync via TKS if needed). Mobile-first CSS; tables
  scroll-x; editor modal full-screen on phones. Pending real-device sign-off.

## Update 2026-06-13 12:56 — "owner"→"manager" relabel + per-manager PINs + two hours sets
- **Terminology (UI text only):** every **user-visible** "owner" is now "**manager**". Changed strings
  only — the role badge (`index.html` `MANAGER`/`STAFF`), tile PIN badges (`MANAGER`), "Managers only"
  alerts (index/bittings/setup), scheduler EN/ES `t()` **values** (`owner_quick`, `owner_only`,
  `pin_title`, `owner_denied`, `owner_unlocked`; ES `dueño`→`gerente`), and Setup's Access step +
  Review label. **Code identifiers are unchanged** (`TKS.auth.isOwner/ownerEmails/role()=='owner'`,
  `e.owner`, `.owner-only`/`.owner-soft` CSS, `requestOwnerAccess`, `TKS_OWNER.OWNER_EMAILS`,
  `quickFormPin`, `ownerPin()`) to avoid breaking saved cloud configs + cross-file refs. cloud-config.js
  comments reworded to "manager" (keys kept). Vehicle-**owner** copy in `bittings.html` (NASTF) and the
  jsPDF `ownerPassword` lib left untouched.
- **Per-manager PINs:** each employee row marked as a manager can have its **own PIN**.
  - `store.js` (both copies): employee objects gain a `pin`. New `TKS.auth.managerByPin(entered)` →
    returns the matching manager `{name,email}` if `entered` equals ANY manager's personal PIN, OR a
    generic `{name:'Manager'}` if it equals the **shared fallback** (`access.quickFormPin` /
    `TKS_OWNER.QUICK_FORM_PIN`); else `null`. `TKS.auth.hasManagerPin()` → any PIN gate exists.
    `ownerPin()` kept for back-compat.
  - **PIN consumers switched** from `entered === ownerPin()` to `managerByPin()`: `index.html` `chgGate`
    (payments), `scheduler.html` `submitOwnerPin`/`ownerPinConfigured`, `bittings.html`
    `requestQuickInvoice`. So any manager's PIN unlocks; the old single shared PIN still works as a
    fallback.
  - **setup.html Access step:** `renderEmployees()` row gains a narrow **PIN** input (`.e_pin`, shown
    only when the row's Manager box is ticked; toggling re-renders). The old single "Owner PIN" field is
    relabeled **"Shared fallback PIN (optional)"** (still `access.quickFormPin`). Review shows
    `N personal PIN(s)` + `shared PIN set`. `pin` survives `gather`/`save`/`mergeConfig` (rides on the
    employees array).
- **Two hours sets (12:47):** `store.js` config gains **`serviceHours`** alongside `hours` (same per-day
  `{mode,open,close}` shape; `normalizeHours(h, def)` now takes a default set; added to `mergeConfig`,
  `save()` merge list, and a `Config.serviceHours()` accessor; both store.js copies). `hours` = 🏪
  storefront/walk-in; `serviceHours` = 🚐 field/service (overnight = open<close, e.g. Sun 00:00–04:00).
  `setup.html` hours step renders **two** editors (`renderHoursEditor(elId,key)` generalized); Review
  lists both (🏪 Shop / 🚐 Service). No consumer reads hours yet — capture only.
- **Hours "Copy to…" (15:10):** each row in `renderHoursEditor` has a `.h_copy` `<select>` (All days /
  Mon–Fri / Sat–Sun). On change it clones the source day's `{mode,open,close}` onto the target days
  (excluding itself), re-renders, and `flash()`es a confirmation. Native select (mobile-safe);
  `.hours-row select.h_copy` is width-constrained so the row stays tidy.

## Update 2026-06-10 — scheduler/forms/VIN/images

**`app/store.js` (data layer) — new API**
- `TKS.Bookings`: `STATUSES`, `get`, `save` (insert/update by id), `setStatus`, `remove`,
  `active()`, `archived()`, `isArchived(b)`, `forCustomer(cust)`. `isArchived` = status
  Completed/Canceled **or** `date < today` (local TZ). Booking shape gained `customerId`,
  `status`, `serviceCategory`/`serviceLabel`, `vehicle.ignition`, `images[]`.
- `TKS.Services`: canonical 5-item catalog (`{value,en,es,cat}`) + `fromJob(jobType,subType)` →
  `{value,cat}` so the scheduler **auto-derives** the service category from the coaching tiles.
- `TKS.decodeVin(vin)`: the only networked helper — NHTSA vPIC
  (`/decodevinvalues/<vin>`), returns `{year,make,model,vin}`. (No VIN API pre-existed in the repo.)
- `Inventory.search` now also matches `fitment` + `vin`. `Customers.upsert` already dedupes by
  phone→name; the scheduler + both contact forms now write through it.
- **Sync note:** `site/app/store.js` is a copy kept in sync for the public forms.

**`scheduler.html`** — now loads `app/store.js` and writes bookings/customers through TKS
(fallback to localStorage if TKS is absent). New `booking` detail view (status picker, Add-to-
Schedule, edit, delete); status color tags via `STATUS_META`; vehicle step requires VIN **or**
Y/M/M + ignition; `decodeVinNow()` auto-fills from the VIN; `googleUrl()` adds
`add=turbokeysmith@gmail.com`. Job-photo slots are gated off (`.job-photos{display:none}` until
`images[]` is non-empty).

**Forced guided flow + owner PIN bypass (2026-06-10).** Booking can ONLY start via the guided flow
(`startFlow`) or the PIN-gated quick form — the Day-view "+ Book" shortcut and `startFlowAt()` were
removed (Day view is view/open-only). `validateStep` now also requires `jobtype`, `subtype`, and the
`upsell` answer (messages via `#stepMsg`/`stepMsgSet`). The owner bypass is a single swap point:
`requestOwnerAccess(onGranted)` (today a PIN screen → `submitOwnerPin` checks
`window.TKS_OWNER.QUICK_FORM_PIN` from `app/cloud-config.js`; later replace its body with an
owner-role check). On success → `startQuickForm` → `renderQuickForm` (a one-screen plain form using
the same `booking` object + `bindInputs()`), saved via the shared `saveBooking` (so customer upsert
+ serviceCategory derivation are identical). It's per-booking: the only entries to the quick form are
through the PIN each time; "New booking" and "Book another" always call `startFlow`.

**A4 — Receipts→TKS, login gating, owner role (2026-06-10).** `store.js` gained `TKS.auth`
(`user/email/isSignedIn/isOwner/role/signOut`); `connectCloud` captures the user via
`sb.auth.getUser()` + `onAuthStateChange`. Owner = email allowlist `window.TKS_OWNER.OWNER_EMAILS`
(`app/cloud-config.js`). `bittings.html` now loads supabase-js + cloud-config + store.js, routes its
`getCustomers/saveCustomers/getShops/saveShops/getHistory/saveHistory` through `TKS.list/saveList`
(localStorage fallback), and has the standard `getSession→connectCloud` bootstrap that calls
`renderCustList`/`renderHistList` after hydrate. `index.html` has a `#authBar` (`updateAuthUI()`)
showing email + OWNER/STAFF badge + Sign out, refreshed on `TKS.onChange` and after connect.
`scheduler.html` `requestOwnerAccess()` now: owner signed in → grant; signed-in non-owner → deny;
nobody signed in → PIN fallback. Soft gate (no hard block when logged out).

**`index.html`** — customer form shows read-only **Job history** (`TKS.Bookings.forCustomer`);
customer rows show an **ES badge** when `lang==='es'`; Inventory has a **🔎 VIN** decode→filter and
a **Fits (vehicles/VIN)** field.

**Public contact forms** — EN (`site/contact/`, hand-maintained) and ES (`site/es/contact/`,
**generated** by `_build/generate.mjs → esContact()`). Both use the canonical 5-option dropdown
with **fixed English `value`** (Spanish only changes the displayed text), an "Other (describe)"
free-text box stored as typed, and `addLead(..., {lang:'es'})` on the Spanish side. **Edit the ES
form in the generator, not the output file** (regeneration overwrites it).

**City photos** — `_build/engine.mjs photoSlots(label, photos)` and `generate.mjs esPhotoSlots`
are now conditional: real `<figure class="photo">` gallery when a city has `photos:[...]` in
`_build/cities.mjs`, else a hidden HTML comment (no empty boxes). Images live in
`site/assets/cities/` (`<city>-1.jpg`, `<city>-2.jpg`); only the 4 original cities have them.
Regenerate with `node _build/generate.mjs`.

---

## Update 2026-06-12 — payments engine (Stripe + cash/check + closeout)
Supersedes #9 ("Payments tile UI shell … demo stub"): the demo stub is gone. Full architecture +
ops in **`supabase/PAYMENTS.md`**; deployed function sources in **`supabase/functions/`**; schema in
**`supabase/payments_setup.sql`**. Single-shop, **single-account direct charges (NOT Connect)**, all
**TEST mode** until `sk_live_` is swapped in.

**Shared engine — `app/pay.js` (`window.TKPay`)** — one swap point both pay screens call:
- `openForReceipt(receipt,{title,onDone})` — upserts the receipt to Supabase (so the server reads the
  authoritative total), opens the reader + typed-card modal, calls the `pay-*` functions.
- `recordCashCheck(receipt, method, {onDone,onError})` — POST `pay-record` (cash/check; no Stripe, **no
  surcharge**).
- `dayTransactions(fromISO,toISO)` — queries `payment_transactions` for the closeout history.
Uses `window.TKS_CLOUD` + a supabase client carrying the staff session JWT; the client **never** sends
an amount.

**Two entry points** (both owner-gated, both offer 💳 Card / 💵 Cash / 🧾 Check):
- `bittings.html` **Invoice → Pay Now** — pays a finished receipt by id (inline `openPayNow` engine).
- `index.html` **Payments tile → New Charge** — no-invoice jobs (lockouts): amount + service label +
  optional customer → auto-creates a minimal receipt → same engine → files into customer history if
  named, else anonymous. `chgEls/chgGate/renderChgBreakdown/chgBuildReceipt`; `chgCard` → `TKPay
  .openForReceipt`; `chgCash`/`chgCheck` → `chgRecord(method)` → `TKPay.recordCashCheck`.

**Day closeout** — `index.html` `view-history` (in the `views` array; back-target → payments).
`openHistory()`/`renderHistory()` call `TKPay.dayTransactions`, render summary chips (collected, #
charges, card/cash/check split, surcharge, refunded) + rows (time · method · funding · status · amount).

**Edge functions** (`verify_jwt:true` except the signature-verified webhook): `pay-create-intent`
(manual-capture PI base+2%, records `description`), **`pay-record`** (cash/check → `completed` row,
surcharge 0, idempotent `inv_<id>_<method>`), `stripe-webhook` (source of truth, captures credit-only
surcharge), `pay-status`, `pay-refund`, `pay-terminal`. `payment_transactions` gained a `description`
column (closeout label) and `method` now also accepts `cash`/`check`.

**Owner-gating** mirrors the scheduler swap point: owner signed in → grant; signed-in employee → deny;
nobody signed in → PIN fallback (`window.TKS_OWNER.QUICK_FORM_PIN`).

**Owner-only money tiles (2026-06-12 PM).** Closeout + Transaction History are now **two top-level Home
tiles** (`.owner-only`, hidden by `syncOwnerTiles()`/`ownerVisible()` — visible to a signed-in owner or
an un-signed-in device, hidden for signed-in staff). Data-go handler early-returns to `openHistory()` /
`openReports()`; `views` gained `reports`; both back to Home.
- **Closeout** = the existing `view-history` (today's drawer; `renderHistory`).
- **Transaction History** = new `view-reports` (`openReports`/`renderReports`/`drawRepChart`). Period
  dropdown → `repRange()` (today/week/month/quarter/year) + `repBuckets()`/`repGran()` (today→hour,
  week|month→day, quarter|year→month). Aggregates completed `payment_transactions` into Total **Jobs/
  Sales/Cost/Profit**; each metric is a persisted toggle (`tks_report_metrics`) driving both the cards
  and the graph datasets. View prefs persist in `tks_report_view`. **Chart.js v4** (CDN UMD) renders
  bar/line/area (money on `y`, job-count on `y1`) or pie/doughnut (Sales by method); single `repChart`
  instance is `.destroy()`-ed before each redraw; if `window.Chart` is absent it degrades to a message.
  The list lands on **today** (daily-reset default) and widens with the period; nothing is deleted.
- **Profit/commission hooks:** `payment_transactions.cost_cents` (profit = captured − coalesce(cost,0))
  + `.technician` (indexed) added by migration `payment_transactions_cost_and_technician`. **Now
  populated** (see next section). `inventory.cost` exists (form field `pCost`, mapped in `store.js`).

## Update 2026-06-12 PM — parts → cost/profit, technician, inventory stock (`bittings.html`)
A sale can reference real Inventory parts so the system computes **profit** and keeps **stock** accurate.
- **Line-item model** gained `{ partId, qty, unitCost, cost }` (`cost = unitCost × qty`, via `lineCost()`).
  The customer-facing line still shows `amount` (sale price) only — cost rides behind it.
- **Shared helpers** (top-level in `bittings.html`, before the Quick-invoice IIFE):
  `pickInventoryPart(onPick)` — owner-gated searchable picker reusing `TKS.Inventory.search` (name/SKU/
  fitment/VIN), shows each part's qty + cost; `applyStockForReceipt(r)` / `reverseStockForReceipt(r)`
  (decrement/restore via `TKS.Inventory.adjustQty`, idempotent through `r.stockApplied`);
  `_syncReceiptInHistory(r)`; `currentTechnician()` (defaults to the signed-in email).
- **Capture surfaces:** Quick-invoice line rows got a **📦 pick** button + **Qty / Cost** inputs + a
  **Technician** field; the chat job-picker got an owner-only **"📦 From Inventory (captures cost)"**
  option. `pushItem()` and the Quick-invoice `submit()` write the new line fields; `finish()` and
  Quick-invoice set `receipt.technician`.
- **Stock timing:** `finish()` (paid receipt) and the Pay-Now poll-`completed` branch call
  `applyStockForReceipt`; history **Mark Paid** applies, **Delete** of a paid sale reverses. Only on
  paid/completed, never drafts.
- **Server-side cost:** `pay-create-intent` + `pay-record` compute `cost_cents` (sum of non-discount
  line `cost`) and `technician` from the **stored receipt** (client never sends cost) → Transaction
  History shows real **Total Cost / Profit** and the tech. Verified: $9.00 parts → `cost_cents` 900.

## Update 2026-06-12 PM — send receipt (device-native), refund/void, technician filter
- **Send receipt — no email service.** Reuses the existing `shareDocument()` in `bittings.html`
  (Web Share L2: `makePDF(...,returnBlob)` → `navigator.share({files})`, with a `canShare` guard +
  download fallback). Added **`sendByText()`/`sendByEmail()`** (`sms:?&body=` / `mailto:`, text summary
  only) + `receiptSummaryText()`. Surfaced: receipt-card actions (📤 Share + conditional 💬 Text /
  ✉️ Email when `r.phone`/`r.email`), the **Pay-Now success** branch (a `.pnSend` button), and
  saved-receipt **history rows** (`data-act="share"`). `index.html` New Charge has its own
  `sendChargeReceipt()`/`showChgSend()` (text-summary share; `#chgSendRow`) since it has no jsPDF.
- **Refund/void (Transaction History, `index.html`).** Per completed row an **↩︎ Refund** button:
  card → `TKPay.refundCard(pi)` (`pay-refund`), cash/check → `TKPay.voidCashCheck(id)` (new **`pay-void`**
  edge fn) — both set status `refunded`; then `reverseStockForInvoice(invoiceId)` returns parts to stock
  (mirrors `bittings.html`'s `reverseStockForReceipt`). New `TKPay.refundCard` / `TKPay.voidCashCheck`
  in `app/pay.js`.
- **Technician filter.** `#repTech` dropdown built from the period's distinct `technician` values;
  `repView().tech` persists; filters the cards, graph, and list. (Commission *totals* still to come.)
- **Mobile:** all new controls are tap/click, no hover; `bittings.html` has `user-scalable=no` (no
  zoom-on-focus). **Not yet run on real iPhone/Android from here** — pending the owner's device sign-off
  per the CLAUDE.md rule.

## Update 2026-06-12 PM2 — mobile-layout cleanup (from the full app audit)
Consolidated fixes for the audit findings (CSS/markup only; logic untouched):
- **Receipt action bar** (`bittings.html` `.rc-actions`): removed the redundant 💬 Text / ✉️ Email
  buttons (📤 Share covers Messages/Mail via the share sheet); `flex-wrap` + `flex:1 1 45%;min-width:140px;
  min-height:44px` → 2×2, no clipping. Removed the now-dead `sendByText/sendByEmail/receiptSummaryText`.
- **Closeout** (`index.html` `.invsummary`): added `flex-wrap:wrap` + `.chip{flex:1 1 90px}` so the 7
  chips wrap (matches `.rep-cards`).
- **Tap targets → ~44px:** modal close ✕ in `app/pay.js` + both bittings modals (`#pnX/#ipX/#qiX`),
  Transaction-History `refBtn`, Quick-invoice `.qiPick`/`.qiDel`.
- **Sub-16px inputs → 16px** (stops iOS zoom-on-focus on the zoom-allowed pages): `cloud-test.html`
  `input`, `index.html` `.rep-select`, `scheduler.html` `.daybar input[type=date]`. (Scheduler's
  customer typeahead already inherited 17px; `bittings.html` is `user-scalable=no` so its small inputs
  don't zoom.)
- **Typed-card key:** replaced the `prompt()` paste with an inline `#pnPK` input (16px) in `renderKeyed`
  — in **both** `app/pay.js` and the `bittings.html` inline Pay Now; `startKeyed` reads/saves it.

## Update 2026-06-13 09:32 CDT — live verification pass (report-only, no code changed)
Audited the repo + the **live Supabase project** for a status report.
- **Tables (live, RLS on):** `customers` (2 rows), `inventory` (0), `bookings` (1, jsonb `data`),
  `receipts` (0, jsonb), `payment_transactions` (1; has `description`, `cost_cents`, `technician`,
  `tax_cents`, plus dormant `org_id`/`connected_account_id` for the future Connect/multi-tenant path),
  `payment_events` (0), `shop_config` (1; `tax_rate`, `taxable_categories`, jsonb `data` = the full
  cloud-synced owner config). All columns match these notes.
- **Edge functions (live, ACTIVE):** `pay-create-intent` v6, `pay-record` v3, `pay-refund` v3,
  `pay-status` v2, `pay-terminal` v3, `pay-void` v1, `stripe-webhook` v2 (`verify_jwt:false`, correct).
  **Also still deployed:** `spike-stripe`, `spike-terminal` (verification leftovers) — delete at cutover.
- **Security advisors:** leaked-password protection off (Pro-only, deferred); `payment_events` has RLS
  on but no policy (fine — service-role/webhook-only); every table's INSERT/UPDATE/DELETE policy is
  `authenticated = true` (full access to any signed-in user) — **correct for single-shop, must become
  per-org RLS for Track F**.
- **Confirmed NOT built (at the time of this audit):** `TKS.ServiceCats` (A5 — *built later same day*);
  a printable Closeout **deposit slip** (*built later same day — see the 10:22 note below*);
  `bittings.html` `sendByText`/`sendByEmail` (removed in the PM2
  cleanup, as intended — share is via `navigator.share`). The `connectCloud` docblock in `store.js`
  still says "NOT wired yet, on purpose" — that comment is stale (cloud IS wired); cosmetic only.

## Update 2026-06-13 — per-category "+ Add a service" (setup.html)
- `renderServices()` now emits a `.svc-addone` button (`data-cat`) inside **each** category group;
  click pushes `{value:'',en:'',es:'',cat:b.dataset.cat,price:''}` to `cfg.services` and re-renders.
  Removed the single bottom button that always used `cats[0]` (Automotive). Services logic
  (pre-check seed, Select-all/Clear, per-category add, `gather` shape) logic-tested in node: 11/12,
  the 1 "fail" was a stale test assertion (priced then Cleared+Select-all'd a category → price reset,
  which is correct). Committed `db8479e`.

## Update 2026-06-13 10:37 — Deposit Slip: carryover float, shortfall, Settings float
*The float is now a carryover (previous close → next open), editable per-day at Closeout (owner-only),
defaulting to a configurable Settings float. Plus a shortfall check. Math re-tested in node.*
- **Settings float:** `store.js` `CONFIG_DEFAULTS.payments.drawerFloatCents = 12000` (mirrored to
  `site/app/store.js`). `setup.html` Payments step gains `#f_float` (dollars) → `gather('payments')`
  writes `cfg.payments.drawerFloatCents` (cents); Review line shows it.
- **index.html:** `settingsFloatCents()` = `Config.payments().drawerFloatCents` (default 12000).
  `startingFloatPrefill()` = `tks_drawer_float_carry` (localStorage) ?? settings float. The Closeout
  float input (`#drawerFloat`) is relabeled **"Starting float"**, prefilled from the carry/settings, and
  **owner-editable** (read live by `floatCents()`).
- **`depositData()` (new fields):** `deposit = max(0, counted − startFloat)`,
  `floatShort = max(0, startFloat − counted)`, `retained = counted − deposit` (= next opening float),
  `overShort = counted − startFloat − expected`.
- **Shortfall UI** (`recalcDrawer`): when `floatShort>0`, a `.float-warn` block tells the owner exactly
  how much cash to add to restore the starting float, or to continue (deposit $0; the slip/summary note
  the shortfall — `depositSummaryText` + `makeDepositPDF` print a "Float shortfall" line).
- **Carryover:** `finalizeCloseout(d)` (owner-gated) writes `tks_drawer_float_carry = d.retained`; called
  by `shareDepositSlip` and `copyDepositSummary` so the day's retained float becomes tomorrow's opening
  float. Removed the old per-keystroke `tks_drawer_float` write.

## Update 2026-06-13 10:22 — Closeout: end-of-day Deposit Slip (BUILT)
*A denomination drawer count in Closeout (`index.html` `view-history`) that produces a branded PDF
deposit slip + copyable summary. Owner-only; integer-cents; receipt-style PDF. Syntax-checked; math
logic-tested in node (balanced/over/short + float parsing).*
- **jsPDF** added to `index.html` via CDN (`jspdf@2.5.1/dist/jspdf.umd.min.js`) — same lib the receipt
  builder uses. If it doesn't load (offline), `shareDepositSlip()` falls back to copying the text summary.
- **`DENOMS`** = 13 US denominations `{id,label,cents}` ($100…1¢; integer cents). **`DEFAULT_FLOAT_CENTS`
  = 12000**. `lastCloseout = {date, cashCents}` is set by `setCloseoutAndDrawer(date, cashCents)`, called
  from `renderHistory` in all branches (`cashCents` = `byM.cash` = the day's recorded cash sales =
  "expected cash"; 0 in the no-engine/error branches).
- **UI:** `#drawerWrap` (between `#histSummary` and `#histList`). `renderDrawer()` builds the
  denomination rows (count inputs, live per-row amount), a **float** input (persisted in
  `tks_drawer_float`), a live totals block (`#drawerTotals` via `recalcDrawer()`), and two buttons
  (📤 Share/Save, 📋 Copy). Owner-gated by `ownerHard()` (renders empty for non-owners).
- **Math (`depositData()`):** `counted = Σ count×cents`; `deposit = counted − floatCents()`;
  `overShort = deposit − expected`. `floatCents()` parses the dollars input → cents (default 12000).
- **PDF (`makeDepositPDF`):** mirrors `bittings.html` `makePDF` — dark header bar, logo fit-to-aspect via
  `getImageProperties`, business identity from `TKS.Config.identity()`, red "DEPOSIT SLIP" label, a
  Denomination/Count/Amount table (nonzero rows), totals (counted / −float / **deposit** / expected /
  over-short), and a "Counted by <signed-in email>" + footer line. `shareDepositSlip()` mirrors
  `shareDocument` (`navigator.canShare`/`share` with the File, download fallback). `filename =
  deposit-slip-<date>.pdf`. `copyDepositSummary()` uses `navigator.clipboard` with a textarea fallback.
- **No schema change** — the slip is computed client-side from the existing day totals + the live count;
  nothing new is persisted to the cloud (only the float preference, locally).

## Update 2026-06-13 09:50 — `TKS.ServiceCats`: Setup as single source of truth (BUILT)
*The owner's `serviceCats` + `services` now drive the scheduler AND invoice; the hardcoded auto/res/com
lists are gone. Source = the `shop_config` row via `TKS.Config`. Plan: `~/.claude/plans/eventual-stirring-puffin.md`.
All four files syntax-checked (`new Function` per inline script) + ServiceCats logic-tested in node.*
- **store.js — `SERVICE_CATS` table + `TKS.ServiceCats` module** (defined just before `Services`,
  exported on `global.TKS`): canonical `{key, code, en, es, invoice, emoji}` for the 7 keys
  (`automotive↔auto`, `residential↔res`, `commercial↔com`, `safe`, `emergency`, `accesscontrol`,
  `other`) — keys match `setup.html` `SVC_CATS2` exactly. API: `all`, `byKey/byCode`,
  `keyToCode/codeToKey`, `active()` (= `getConfig().serviceCats`, fallback `CORE_CAT_KEYS` when empty,
  canonical order), `label(key,lang)`, `invoiceLabel(key)`, `keyForInvoice(label)`, `invoiceActive()`,
  `servicesFor(key)` (= offered services filtered by `cat`), `hasDetail(code)` (true only auto/res/com).
  `Services.fromJob` now sets `cat = _catByCode[jobType].key` for non-core codes (so `fromJob('safe')` →
  `cat:'safe'`, not `'other'`). **Mirrored verbatim to `site/app/store.js`** (the two are kept identical).
- **scheduler.html:** `schedCats()` (= `ServiceCats.active()`, with a 3-core offline fallback) +
  `catLabelSched(c)` (keeps the scheduler's own Car/House/Business labels for core, `ServiceCats.label`
  for new cats). `stepJobType` tiles + the Quick-form `<select>` loop `schedCats()`. `hasSub(code)=
  !!SUBTYPES[code]`; `shouldSkipStep` skips **both** the `subtype` and `upsell` steps for no-detail cats
  (so they don't get the auto-only upsell script), and `goNext`/`goBack` step over skipped steps;
  `validateStep` requires subtype/upsell only when `hasSub`. `subLabel` falls back to
  `ServiceCats.label(codeToKey(type),LANG)`. **Personalization:** `{biz}`/`{techClause}`/`{tech}` tokens
  substituted in `line()` via `personalize()` — `bizName()` = `Config.identity().name` (fallback
  "our shop"/"nuestra cerrajería"), `techFirstName()` = first name from `Config.access().employees`
  matched on `TKS.auth.email()`. Tokens added to `SCRIPT.greeting` (×3 EN/ES) + `SCRIPT.closing`; ICS
  `PRODID` uses `bizName()` (ASCII-stripped). No literal "Turbo Keysmith" remains.
- **bittings.html:** `askServiceType` options ← `ServiceCats.invoiceActive()` (try/catch → 3-core
  fallback; keeps the literal `"Automotive"` test for the NASTF/vehicle branch + saved receipts).
  `showJobPickerForCategory` is now **combined**: for `ServiceCats.keyForInvoice(receipt.serviceType)`,
  the owner's `servicesFor(key)` are floated to the top (★, Setup `price` → `itemDraft.lastPrice`),
  resolving each to a line category + `taxable` via a `COMMON_JOBS_SEED` name match, else a keyword
  heuristic (parts→Materials/taxable, else Labor/non-taxable); shown only when the resolved line
  category === the picker's `catKey`, de-duped against built-in jobs. The "Edit common job" admin
  `svcOptions` dropdown also reads `invoiceActive()` (+ keeps the job's current svc selectable).
  **Caveat:** the custom-name heuristic can mis-tag taxability on a service not in the built-in catalog —
  flagged in the handoff for receipt verification.
- **No migration:** core `jobType` (auto/res/com) + `serviceType` ("Automotive"/…) stored values
  unchanged; new categories use new values old records never had. Offline/un-configured → 3 core
  categories everywhere (identical to pre-A5 behavior).

## Update 2026-06-13 PM12 — Services: 2-step pick-and-price (catalog) flow
- **Config:** `config.services` default now **[]** (offered services `{value,cat,price,en,es}`);
  `config.serviceCats` = the categories the shop offers (Setup step 1). `mergeConfig` defaults services
  to `[]` and derives `serviceCats` from saved services' cats when not explicit. `TKS.Config.serviceCats()`
  accessor; save() array-replace includes `serviceCats`. (`DEFAULT_SERVICES` no longer the services
  default — kept but unused; `Services.list()` still falls back to the canonical `SERVICES` 5 when empty.)
- **setup.html:** `catalog`/old grid replaced by two steps — `servicetypes` (category checkboxes, 7 cats
  `SVC_CATS2` incl. Access Control) and `services` (per selected category, the **`CATALOG`** common list
  as checkboxes + a price box each; `toggleSvc`/`setSvcPrice` live-bind to `cfg.services`; specialty/
  custom rows + "+ Add a service"). `gather` for both; Review shows types + offered/priced counts.
  Old `SVC_CATS`/`renderServices` grid + `moveSvc` removed.
  - **Pre-check:** the step-1 `.stype` onchange seeds all `CATALOG[cat]` services into `cfg.services` when
    a category is checked (and removes them when unchecked). Step-2 each category header has a
    `.svc-allbtn` (Select all / Clear) that adds/removes the whole catalog group **without** touching
    `serviceCats` (the category stays selected even when emptied). No auto-seed on render, so Clear sticks.

## Update 2026-06-12 PM11 — quick links split into categories; Services its own step
- **Config:** `config.vendors` (flat) → `config.quickLinks` = array of CATEGORIES
  `{key,label,icon,links:[{label,url}]}` (`DEFAULT_QUICKLINKS`: vendors, nastf, programming, reference,
  associations, other). `normalizeQuickLinks(saved, legacyVendors)` keeps the predefined skeleton, fills
  saved links (empty stays empty), and migrates a legacy flat `vendors` once. `mergeConfig` →
  `quickLinks: normalizeQuickLinks(...)`. `TKS.Config.quickLinks()` + `vendors()` (back-compat = vendors
  category links). save() array-replace list swaps `vendors`→`quickLinks`.
- **setup.html:** the `catalog` step is now TWO steps — `quicklinks` (`renderQuickLinks()`: per-category
  link rows + "Add link") and `services` (the existing grouped editor). `gather` split accordingly;
  Review shows link-count + service-count separately.
- **index.html:** `#quickTiles` rendered by `renderQuickTiles()` (in `updateAuthUI`): built-in **Keycodes**
  tile (always) + a tile per config category **with ≥1 link** (empty → no tile). `openLinks(cat)`:
  `keycodes` → `KEYCODES`; `ql:<key>` → that config category's links. Old `renderVendorTiles` removed.

## Update 2026-06-12 PM10 — Setup: structured business hours (dropdowns)
- `config.hours` is now a per-day object `{mon..sun:{mode:'open'|'closed'|'24', open:'HH:MM', close:'HH:MM'}}`.
  `store.js` `normalizeHours()` coerces/migrates (old free-text string → default object); `mergeConfig`
  runs `normalizeHours(c.hours)`. `setup.html` `renderHoursEditor()` (per-day mode + open/close
  `<select>` via `timeOpts()`), live-bound to `cfg.hours`; `gather('hours')` only reads the footer now.
  Review uses `hoursSummary()` (groups consecutive same-schedule days, e.g. "Mon–Sat 8a–5p · Sun closed").
  (First of a planned "dropdown where sensible" pass.)

## Update 2026-06-12 PM9 — Setup fixes: catalog, employees, inventory import, sizing
- **Services (store.js `DEFAULT_SERVICES`):** full grouped catalog (cats automotive/residential/
  commercial/safe/emergency/other, incl. "Other (describe)"); `CONFIG_DEFAULTS.services` uses it.
  `setup.html` `renderServices()` groups by `SVC_CATS` with per-row ▲▼ (`moveSvc` reorders within cat),
  rename, category select, delete; `+ Add service`.
- **Employees (`access.employees=[{name,email,owner}]`):** `renderEmployees()` rows (Name+Email+Owner+
  delete) + "Add user". `gather('access')` derives `access.ownerEmails`/`staffEmails` from rows.
  `TKS.auth.ownerEmails()` now = cloud-config bootstrap ∪ `access.ownerEmails` ∪ employees where
  `owner`.
- **Inventory import (`app/inventory-import.js`, `window.TKImport.open({onDone})`):** shared by the
  Setup `inventory` step and the Inventory-tile `#invImport` button (built once). SheetJS (CDN) for
  `.xlsx`, hand CSV parser otherwise. `FIELDS[]` mirrors the Inventory schema (name*, sku, category,
  qty, lowAt, unit, cost, location, supplier, reorderQty, fitment, notes); `autoMap()` guesses from
  headers; preview; dedupe by SKU (else name) vs `TKS.Inventory.all()`; `TKS.Inventory.save` per row;
  reports imported/skipped/blank. Loaded in `setup.html` + `index.html`.
- **Sizing:** trimmed paddings/margins/font-sizes in `setup.html` (inputs stay 16px → no iOS zoom) so
  short steps fit above the fold. **Placeholders** genericized (no real business data).
- **Persistence:** `persistCurrent()` (gather+save) runs on chip-jump and Back, plus the existing
  Save/Skip/Finish-later. Stored in `shop_config.data` (jsonb) + localStorage `tks_shop_config`.

## Update 2026-06-12 PM8 — Vendor tools: Vendors / Keycodes / NASTF link lists
- `index.html`: replaced the two direct vendor tiles with three `data-links` tiles (`t-vendor`/
  `t-keycodes`/`t-nastf`). `openLinks(cat)` builds a bottom-sheet overlay (`.ll-ov`/`.ll-sheet`) of
  `.ll-row` anchors (`target=_blank`, ≥56px). **Not owner-gated** (field tools for any signed-in staff).
- **Vendors** = `TKS.Config.vendors()` (editable in Setup; defaults now `www.americankeysupply.com/`
  + `keyinnovations.com/`). **Keycodes** = `KEYCODES[]` (11 dealer/OEM portals, by make — no
  aggregators). **NASTF** = SDRM login.
- **Per-make icon:** `llRow()` tries `app/assets/keycode-logos/<slug>.png` → site favicon
  (`google.com/s2/favicons`) → initial-letter chip, via chained `img.onerror`. Slugs: toyota, honda,
  hyundai, nissan, mazda, gm, ford, mopar, kia, mitsubishi, subaru (README in that folder).
- `renderVendorTiles()` is now a harmless no-op (its `#vendorTiles` container was removed).

## Update 2026-06-12 PM7 — guided Setup wizard (= Settings), cloud-synced config
- **Config store (`store.js` `TKS.Config`):** `CONFIG_DEFAULTS` is now a grouped object — `taxRate`/
  `taxableByCategory` (top-level, back-compat) + `identity`, `payments`, `access`
  (ownerEmails/staffEmails/quickFormPin/quickInvoiceEnabled/Default), `vendors`, `services`, `hours`,
  `setup` (completed/done/skipped). `save(partial)` deep-merges a single group/step without clobbering
  others and persists to **`shop_config.data` jsonb** (+ mirrors `tax_rate`/`taxable_categories`);
  `load()` reads `data` (fallback to tax columns). Accessors: `identity/access/payments/vendors/
  services/hours/setupState/isSetupComplete/ownerPin`. `TKS.auth.ownerEmails()` = cloud-config.js
  bootstrap owners ∪ `access.ownerEmails`.
- **`setup.html`:** one page, two modes — first-run **wizard** (stepped, jumps to first incomplete step)
  and editable **Settings** (chips jump anywhere). 7 steps, each Skip/Save (sets `setup.done`/`skipped`),
  Finish-later (sets `sessionStorage tks_setup_later`, persists), Review surfaces skipped/empty. Logo
  upload (canvas-resized data-URI). Owner-gated (staff see a block). Connects cloud then loads config.
- **First-run gating (`index.html`):** `maybeRedirectToSetup()` (in cloudBootstrap) → `setup.html`
  when `!isSetupComplete()` && not staff && not the finish-later session flag. `⚙ Setup` link in the
  auth bar (ownerSoft). Vendor tiles render from `TKS.Config.vendors()` (`#vendorTiles`).
- **Consumer wiring:** `bittings.html` `hydrateIdentityFromConfig()` (boot + onChange) copies
  `Config.identity()` into receipt `SETTINGS` → receipts/PDF; PDF footer uses `SETTINGS.footer`; the ⚙
  gear → `setup.html`. PIN consumers (index `chgGate`, bittings quick-invoice, scheduler
  `ownerPinConfigured`/`submitOwnerPin`) use `TKS.Config.ownerPin()` (fallback cloud-config.js).
  Quick-invoice enabled/default read `Config.access()`. `TKS.Services.list()` returns `Config.services`
  when set. **Verified** the full config round-trips through `shop_config.data` (cloud).
- **Multi-tenant ready:** config is grouped + per-shop-shaped; RLS note — `shop_config` is
  authenticated-write (single-shop, owner-gated UI); a multi-tenant version adds `org_id` + per-org RLS.

## Update 2026-06-12 PM6 — owner-only UI hidden (not disabled), offline-aware
- **Offline-capable ownership** (`store.js` `TKS.auth`): `rememberedEmail()` parses the email from the
  stored supabase token (`sb-*-auth-token`, no network); `email()` = live session email **or**
  remembered email; `isSignedIn()`/`isOwner()`/`role()` all use it. So a dropped connection never
  demotes an owner.
- **index.html two tiers:** `ownerHard()` (owner only) hides `.owner-only` (Closeout, Transaction
  History) for staff **and** signed-out; `ownerSoft()` (owner OR signed-out→PIN) hides `.owner-soft`
  (Payments/New Charge tile) for staff only. `syncOwnerTiles()` toggles both; runs in `updateAuthUI`
  (load + `TKS.onChange`). Payments tile defaults `display:none`, revealed by sync.
- **bittings.html:** `syncOwnerUI()` hides the `#settingsBtn` ⚙ for signed-in staff; `openSettings()`
  blocks staff; runs in `boot()` + `_receiptsRefresh` (auth change). New Charge `chgGate` + Quick
  invoice gate already use `TKS.auth` (now offline-aware).
- **Matrix:** owner online → all owner UI; owner offline (remembered) → all owner UI; staff → none;
  signed-out/no-session → hard hidden, soft (Payments/Settings) reachable via owner PIN.
- **TODO (same task):** guided first-run Setup **wizard** = the larger remaining build; the config
  inventory (cloud-config owner/PIN/switches, receipt identity, surcharge 2%, tax, vendor links,
  service catalog, Supabase keys; hours absent) is its spec.

## Update 2026-06-12 PM5 — text contrast (WCAG AA) + 2 tap targets
- **Root bug:** `index.html .tile h2` had **no `color`** → the `<button>` tiles fell back to the UA
  default (near-black) while `.tile p` was `--dim` → titles darker than descriptions (inverted). Fix:
  `.tile h2{color:var(--ink)}` (primary ~15:1), `.tile p` stays `--dim` (~6:1, secondary).
- **index.html:** `.tile .soon` `--off`→`--dim`; the Tax-collected "· pass-through" qualifier
  `#6b7280`→`var(--dim)`.
- **bittings.html** (`--bg:#1c1c1c`, body `#eee`): dark-context grays `#888`/`#777`/`#6b7280`→`#9a9a9a`
  (~5:1 AA) — `.hint`, `.field-hint`, `.cj-tag.no-tax`, `.pp-empty`, the Settings rate hint, the
  quick-invoice tech/tax labels. White-receipt grays `#888`→`#595959` (~7:1) — estimate status + NASTF
  type line. `.rc-subrow`/`.rc-pm` `#777` on white left as-is (≈4.6:1, already AA).
- **Tap targets → 44px:** `.pp-head button` (panel "Done") and `.hist-item .hi-actions button`
  (history-row PDF/Edit/Send/Delete) got `min-height:44px` + padding bump.
- **No changes needed:** `scheduler.html` (`.tile` already sets `color:var(--ink)`; `--ink-soft` is AA
  in light **and** dark themes) and `cloud-test.html` (all text `--ink`/`--dim`).

## Update 2026-06-12 PM4 — entry gate (login-first, offline-safe) + real logo
- **Entry gate** (top of `index.html` `<body>`, runs before render; `app/cloud-config.js` is now also
  loaded in `<head>` so `TKS_CLOUD` is available early): if `AUTO_CONNECT` and **no Supabase session
  token in localStorage** (`sb-*-auth-token`, checked synchronously — no network) and `navigator.onLine`
  and not `sessionStorage.tks_use_local`, `location.replace('cloud-test.html?next=…')`. Otherwise it
  stays → Home. So: remembered token → Home; offline + no token → Home (local); online + no token →
  login. **No network is ever required to reach a usable app.**
- **`cloud-test.html` (login):** `refresh()` now `location.replace(safeNext())` on a valid session
  (route straight Home; `?next=` is sanitized to a same-origin relative path). Added a **"Use the app
  offline"** button → sets `sessionStorage.tks_use_local='1'` then goes to the app (so the gate won't
  bounce back) — the no-dead-end escape. Added the full-lockup logo.
- **Logo assets** (served from the app folder): `tks_logo.png` (full lockup, login) and `tks_mark.png`
  (cropped turbo mark — header + receipt). `index.html` header/favicon → `tks_mark.png` (CSS
  `height:38;width:auto;object-fit:contain`). `bittings.html` `DEFAULT_LOGO` data-URI → the mark;
  header/`.rc-head img` switched to `object-fit:contain`; **PDF `addImage` fits to real aspect via
  `getImageProperties`** (never stretched). Migration in `boot()`: adopt `DEFAULT_LOGO` unless
  `SETTINGS.logoCustom` (set true when the owner uploads a logo). The old `bittings_logo.png` was the
  unrelated "Bittings" receipt-app icon.

## Update 2026-06-12 PM3 — configurable sales tax (server-authoritative, pass-through)
- **Cloud-synced config:** new Supabase `shop_config` table (single row id=1: `tax_rate`,
  `taxable_categories` jsonb) + RLS. `TKS.Config` in `store.js` (`get/save/load/taxableDefault`) with
  localStorage fallback; `connectCloud` calls `Config.load()` to pull. `site/app/store.js` synced.
- **bittings.html:** `catDefaultTax(key)` now reads `TKS.Config` overrides; new `configTaxRate()` /
  `receiptTaxRate(r)`. `computeTotals(its, payment, taxRatePct)` (was `SETTINGS.taxRate`). `finish()`
  snapshots `receipt.taxRate` (override → config). Settings panel: tax-rate field + per-category
  taxable toggles (`#taxCatToggles`), **owner-gated** (`_isOwnerForCosts`), saved to `TKS.Config`.
  Per-receipt override: Quick-invoice `#qiTaxRate` field + Receipts → Edit → **Tax rate** (recomputes
  on save). Pay Now amount box shows the **subtotal / tax / amount / surcharge** breakdown.
- **Edge functions:** `pay-create-intent` + `pay-record` gained `authoritativeTotals(data)` — an exact
  port of `computeTotals` (base = goods+labor+tax; **parity unit-tested 7/7 + live-checked**), so tax is
  computed **server-side from the stored receipt** (client sends neither amount nor tax). Records
  `tax_cents` (new column on `payment_transactions`).
- **index.html reports:** Sales = `base_cents − tax_cents` (excludes pass-through tax **and** the
  surcharge, since `base` excludes it); Profit = Sales − cost. Transaction History adds an always-on
  **Tax collected** chip; Closeout adds a **sales tax** chip. Order of operations: tax → base →
  2% credit-only surcharge at capture.

**`bittings.html` Quick invoice** — owner-only one-screen alternative to the chat (trainees can't see
it). `window.quickInvoiceAvailable`/`requestQuickInvoice`/`openQuickInvoice`; on/off via
`TKS_OWNER.QUICK_INVOICE_ENABLED`, auto-open (owner signed-in only, never PIN) via
`QUICK_INVOICE_DEFAULT` + `quickInvoiceAutoForOwner`. `boot()` runs at the very end of the script so
the module is defined first. **NASTF D1** (Customer / Auction-Fleet / Contracting) is now an optional
section in this modal when Service = Automotive — see Update 2026-06-16 (j).

---

## ✅ CLOUD IS NOW WIRED (using your existing project)
The staff app (`index.html`) now loads supabase-js + `app/cloud-config.js` (the SAME project
URL + publishable key already in `cloud-test.html`) and **auto-connects when an employee is
signed in**. Not signed in / offline / table missing → it stays on localStorage. A status pill
in the header shows **☁ Synced** vs **On this device**.

Verified offline against a mock Supabase: insert / update / delete and all field mapping
(name↔customer, reorderQty↔reorder_qty, local-id→adopted-uuid) are correct. I could **not**
run it against the live project from here (no network in my environment) — so please verify:

### To see it sync (your 2 steps)
1. **Run the SQL** in Supabase → SQL Editor: `supabase/app_tables_setup.sql`
   (creates `inventory`, `bookings`, `receipts`; the `customers` table already exists).
2. **Sign in** via the Staff Login (`cloud-test.html`), then open the app. The pill should
   read **☁ Synced**. Add a part in Inventory / a customer in Customers and confirm the row
   appears in the matching Supabase table.
   - To force everything back to local while testing: set `AUTO_CONNECT: false` in
     `app/cloud-config.js`.

### Heads-up / decisions
- **Scheduler + Receipts still read customers from localStorage.** When you're signed in, the
  shell's Customers + Inventory tiles use the cloud, but `scheduler.html` / `bittings.html`
  don't yet — so their customer lists can diverge from the cloud. They each need the same
  3-line bootstrap + their customer reads routed through `TKS`. **Want me to wire those two as
  well?** (Bigger edit in `bittings.html`; I'd want you to spot-check after.)
- **Public contact form can't write to the cloud yet.** Website visitors aren't signed in, and
  RLS only allows authenticated inserts — so leads still save locally. To land website leads in
  the cloud we need either a public-insert policy or a small Supabase **edge function**
  (recommended). Your call.
- **Migration:** I did NOT auto-push your local demo data to the cloud (avoids duplicates). If
  you want existing local customers/parts copied up once, say so and I'll add a one-time import.

## ❓ Still need decisions on
- **Google Calendar** — real 2-way sync (needs Google OAuth + a server) or keep the current
  open/add-to-Google-Calendar deep links? (Sync needs a Google Cloud project + consent screen.)
- **Payments** — processor (Stripe / Square / other) and whether to fold payments into this app
  (needs server-side keys) or open the existing separate payment app (send its URL).
- **Spanish coverage** — chrome + homepage + contact are translated now. Want the full city/
  service page bodies translated too? (That's content work — I can do it page by page.)
- **Email/SMS on new leads** — where should contact-form submissions notify you?

---

## File map (this workstream)
- `app/store.js` — data layer + CloudAdapter (source of truth)
- `site/app/store.js` — public-site copy (kept in sync)
- `supabase/app_tables_setup.sql` — inventory/bookings/receipts schema
- `site/assets/i18n.js` — language toggle
- `index.html` — staff shell (Inventory + Payments live here)
- `scheduler.html` — day view added
- `site/contact/index.html` — contact form

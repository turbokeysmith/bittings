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
the module is defined first.

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

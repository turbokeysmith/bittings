# Turbo Keysmith — App structure build (front-end only)

Branch: **`app-structure`** (off `public-website`). Nothing published. No cloud spend, no
credentials wired. All data is **localStorage today**; every read/write goes through one
data layer (`app/store.js`, `window.TKS`) with a single **CLOUD SWAP POINT**.

## Preview (local, still running)
- **Staff app** (dark): http://127.0.0.1:8088/  → Customers · Receipts · Scheduler · Payments · Inventory
- **Public site** (light): http://127.0.0.1:8099/  → contact form `/contact/`, language toggle 🌐 in the header

## 2026-11-11 — bittings.app · 8z36 fee by tier · 8z37 direct charges · connect-oauth
Supersedes the destination-charge routing described further down (Phase 5 Connect section). Full payment
detail: `supabase/PAYMENTS.md` (2026-11-11 section).
- **Second address.** The app is served from its own Pages project `bittings-app` → `https://bittings.app`
  (app at the site root: `/`, `/signin`) as well as `turbokeysmith.com/staff/`. Deploy:
  `node website/_tools/publish-staff.mjs && node website/_tools/deploy-app.mjs` (`--dry-run` builds
  `.build/bittings-app/` only; `.build/` is git-ignored). It ships the same published copy
  (`website/site/staff/`) and writes its own `_headers`. No GA on the app, so the GA deploy guard does not apply.
- **`_shared/auth.ts` → `appBase(req)`:** maps the request `Origin` to the app base
  (`https://bittings.app` | `https://turbokeysmith.com/staff`), else `APP_URL` (now `https://bittings.app`).
  Used for every return link (connect-onboard, connect-oauth, billing-checkout, billing-portal), so a person
  lands back on the address they started from, still signed in. CORS allow-headers now include
  `x-client-info, x-supabase-api-version, x-region` (supabase-js `functions.invoke()` sends them; without
  them the preflight failed). `staff-invite` accepts bittings.app.
- **8z36 `shops.platform_fee_bps`** (int, 0–1000, NULL = by tier: starter 1%, pro 0%). Turbo Keysmith LLC = 100.
  Read by `pay-create-intent` (service_role); owners cannot change it (5e column grant).
- **8z74 true profit · job-form freeze · pick-lists · one bottom bar (2026-11-12, owner report from a real job).**
  - *Cost of a stock part on a sale.* `index.html jobToInvoiceDraft` now puts `unitCost` on each part line; `bittings.html jobDraftToPrefill` passes it; `addItem` fills `.qiCost` from `TKS.Inventory.get(partId).cost` when a line with a `partId` has none. **Server:** trigger `trg_payment_txn_cost` (BEFORE INSERT on `payment_transactions`, function `payment_txn_fill_cost`) sets `cost_cents` = sum of line costs, using `inventory.cost × qty` for part lines with no cost; `greatest()` with what the caller sent; whole body in an exception handler so it can never block a payment. Needed because `inventory_safe` / `receipts_safe` hide costs from technicians, and the pay functions (`pay-record`, `pay-create-intent` `costCentsOf`) only add up what is written on the receipt. Commission (`a_base = sale − tax − refunds − cost`) reads the same column.
  - *Reports profit.* `repFeeRates()` / `repCardFee(t)` (estimate: reader + imported `card` = tap rate, `keyed` = typed rate, on `captured_cents`); `renderReports` profit per payment = sales − cost − fee + surcharge collected − contractor (once per job); card `#repProfitCard` replaces "Net revenue". Rates: `Config.payments.feeTapPct / feeTapCents / feeTypedPct / feeTypedCents` (Settings → Payments). CSV has "Card fee (estimated)".
  - *`app/fitment.js catalog()`* was re-reading and `JSON.parse`-ing `localStorage.tks_vehicle_keyways` on every call (thousands per `TKS_FIT.filter`). Now: reuse for 2 s, then compare the raw text before parsing. Probe: `tools/qa/rebuild-jobform-perf.js` (real stock list from the nightly backup, `SLOW=6`, `PROFILE=1`).
  - *Pick-lists.* No more `<datalist>` for services: Scheduler charges use `.chPick` (▾) + `.chSug`; invoice lines use `.qiSug` (opens on focus of an empty description and while typing). `#qiCustList` (customer names) is still a datalist, with the picker button beside it.
  - *Bottom bar.* The main app writes `localStorage.tks_bottombar_view` (`[{go, ic, label}]`) whenever it draws its bar; `bittings.html #appnav` is rebuilt from it + "More" → `index.html?menu=1` (opens the drawer, then drops the query).
  - *`drawRepChart`* no longer replaces the canvas with the "no connection" text (that crashed the next `renderReports` before the numbers and list); message lives in `#repNoChart`.
- **8z73 Year lists emptied by 8z67 — fixed.** In `app/ymm.js yearOptionsHTML` the 8z67 edit appended a `//` note to `var hi=…, items=[];`, which sat on the same line as `for(var y=hi;y>=low;y--) items.push(String(y));` and commented the loop out (live ~05:49–11:33 UTC 2026-11-12). The loop is on its own line again. **Lesson for scripted edits: never append a `//` note to a line that is replaced by prefix — replace whole lines, or put the note on the line above.** `tools/qa/rebuild-quote-test.js` now asserts the Year list has >20 options.
- **8z72 update button · error log · offline shell · backup · export (2026-11-12).** `#updNowBtn` in `#authBar` (`updateAuthUI`): `TKS.refresh(true)` then `TKS_UPDATE.update()`; `#updBtn` in the `bittings.html` header. **Error log:** `app/store.js` listens for `error`, `unhandledrejection` and `tks:save-failed` → `TKS.reportError(kind, msg, extra)` → RPC `log_activity('app_error', kind, page, detail{msg,screen,at,online,device,file,line,stack})`; max 8 per page load, each message once; signed out → `localStorage.tks_err_queue` (last 20), flushed 3 s after connect. Activity view: `#actErrors` → `showAppErrors()` (queries `audit_log` where `action='app_error'`, 200 newest). **Offline:** `bittings-unified/sw.js` (published; registered on https by both pages): same-origin GET only, network-first always, saved copy only when the network fails (pages: also after 6 s); copies are filed without the query string and stored as plain 200 responses (so a Cloudflare clean-URL redirect does not break an offline navigation); `version.json` is never intercepted. `store.js`: `online` event → retry unsaved tables + `TKS.refresh()`. NOT done: unsaved changes do not survive closing the page. **Backup:** `tools/backup/backup-db.mjs` (+ README) — every public table as JSON + functions/columns/policies/indexes/triggers via `supabase db query --remote --read-only --agent no`; Windows task "Bittings database backup" 02:30 daily → `D:\Work\Backups\db`; keeps 30 + first of month. (`supabase db dump` needs Docker, which this PC does not have; `supabase backups list` shows none for the project.) **Export:** `repExportCsv()` from `_repExport.rows` (the rows `renderReports` just drew).
- **8z71 website leads (2026-11-12; migration `supabase/phase8/8z71_web_leads.sql`, APPLIED live).** Table `web_leads` (shop-fenced RLS: staff select/update, manager delete; no anon access) + `submit_web_lead(p_shop, p_name, p_phone, p_email, p_address, p_service, p_notes, p_lang, p_page)` — SECURITY DEFINER, granted to `anon`; trims lengths, needs a name and phone-or-email, ignores an exact repeat inside 10 min, stops at 40 leads/hour/shop, always returns true. Public site `website/site/contact/index.html` and `es/contact/index.html` POST to `/rest/v1/rpc/submit_web_lead` with the publishable key and the Turbo Keysmith shop id (`7a1754e6-…`), alongside the existing Web3Forms e-mail. App: `TKS.Leads.list()/setStatus()` (`store.js`, never cached on the device); sidebar `data-go="leads"` (`#navLeads`, `data-badge` = new count via CSS `::after`); `view-leads` + `renderLeads()`; `leadsCheck()` 2.5 s after `TKS.ready`, every 5 min and on return to the app (toast when the count rises). Book → `setStatus('scheduled')` + `window.TKS_openJobFromDraft(d)` (the scheduler's hand-over function, shared with estimate → job; sets `tks_sj_draft` and opens the Quick form; `fromLead` kept on the booking). Quote → `setStatus('quoted')` + `sessionStorage.tks_job_draft` + `bittings.html?quote=1` (boot now applies the draft AND opens as an estimate). Dismiss → `setStatus('dismissed')` (hidden, not erased).
- **8z70 dark-mode readability + Receipts paging (2026-11-12).** New `app/ui/contrast-guard.js` (loaded last on `index.html`, `bittings.html`, `signin.html`; `window.TKS_CONTRAST {run, clear, busy}`). Active only when `<html data-bt-theme="dark">`. (a) Injects `#tkContrastCss`: `--text-tertiary:#98a0ac`, bottom-bar inactive colour, placeholder colour via `--tk-ph`, light ink for white islands (`#stkCard`), `#backBtn` / `#signOutBtn`, active side-menu item, `.qi-box .req`. (b) Guard: a TreeWalker over text nodes + every input/textarea/select; per element it composites the real background up the ancestor chain (memoised per pass; last gradient stop counts), composites the text colour with cumulative opacity, and if WCAG contrast < 4.5 (3 for ≥18px or ≥14px bold) moves the SAME hue lighter or darker (`readable()`, tries both directions) and sets `color` (+ `-webkit-text-fill-color` on fields) inline `!important` with `data-tkc`; sets `--tk-ph` on fields. Runs 180 ms after DOM / class / style mutations in idle slices of 14 ms; elements are remembered in a WeakSet; a class/style change on a small control (≤40 descendants) forgets it and re-checks; switching to light removes every change. Hidden elements are skipped until shown. Why the mix exists: `.view` pins the LIGHT `--dim` / `--ink` for white cards while the page is dark, and dark-theme vars leak into white pop-ups. Sweep tool: `tools/qa/rebuild-contrast-sweep.js phone|desktop` (demo data, dark, every view + main pop-ups; prints low-contrast groups, saves screenshots under `tools/qa/audit/contrast`). `app/receipts-view.js`: `PAGE=60`, `shown`, `#rcMore` — search/filter run on everything, only the first `shown` are drawn (was all ~1,800 + an O(n²) lookup per row).
- **8z69 seven till risks (2026-11-12; no DB change).** (1) `stockSafetyNet()` in `index.html`: for receipts with server `paidAt` > `STOCK_NET_FROM` (2026-11-12T06:00Z), 3 min–7 days old, `Paid in Full`, part lines, no `posStockApplied`/`stockApplied`/`stockReversedAt`, id not `rcpt_mb_*` → `TKS.POS.decrementStock(id)` (server-idempotent), max 5 per run; runs 4 s after `TKS.ready` and every 4 min while visible; logs `stock_caught_up`. (2) `CLOUD_MAP.inventory.serverOwned=['qty']` → `doFlush` strips it from UPDATEs; list ± (`qStep`) opens `[data-stock]` when `TKS.isCloud('inventory')`; part page `#pQty` read-only for an existing cloud part and `pSave` drops `qty`. (3) `payMethodAsk(r)` + the `#invPaid` handler: `TKPay.recordCashCheck(r, method, {skipUpsert:true})` (pay-record) → `decrementStock` → `TKS.refresh()`; card → `sessionStorage.tks_pay_receipt` → `bittings.html boot()` shows the document and calls `openPayNow`. History "Mark Paid" in `bittings.html` uses `showModal` + `recordCashSale(r, method)`. Signed out / demo keep the old local behaviour. (4) `hardware.js wantsDrawer(r)` = payment matches cash|check; manual open logs `drawer_open_manual`. (5) `CLOUD_MAP.receipts.skip` hides rows with id `pos_*` and `data.status==='Unpaid'` (hydrate + refresh treat them as gone); `invStatusTag` shows UNPAID / PART PAID for receipts. (6) `fSave`: same-name match → fill blanks silently if nothing would be replaced, else `uiConfirm` "Update them" / "Add as new". (7) `gather('services')` keeps `taxable`; Register service lines send `taxable:!!s.taxable` (`pos_checkout` already honoured the flag for non-part lines). Test: `tools/qa/rebuild-risks-test.js`.
- **8z68 failed saves (`app/store.js` `doFlush`).** Every delete / update / insert result is checked (`settle` + `note`). A failed op keeps its row out of the new `shadow` (failed update → old shadow row kept; failed insert → left out; failed delete → put back), so it stays "local, not saved", is never written to DevCache, survives `refresh()`, and is retried by the next flush. Transient failures (no status, 5xx, 408, 429) auto-retry with back-off (`TKS._retryMs` default 5 s, ×2, max 60 s, 6 tries; `saveRaw` resets the count); 4xx = refused, reported once, not retried. Events on `window`: `tks:save-failed` `{key,count,refused,retrying}` and `tks:save-ok` — both pages show a toast. Inserts for uuid tables (customers / shops) now mint the id on the device (`crypto.randomUUID()`) and always send it, and a `23505` duplicate on a retry counts as saved, so a lost answer cannot create a second record. NOT covered: an UPDATE that RLS silently filters to 0 rows still looks saved (needs `.select()` + checking the grants on the base tables).
- **8z67 clean-ups from the module review.** `app/ilco-2025.js` and `app/corrections.js` are no longer loaded (files kept; only the removed Start a job card read them). Year lists: `ymm.js yearOptionsHTML`, Programmers and Lishi `populateYears` go to `max(2026, this year + 1)`; `ymm.js modelList` clamps a year above 2026 to 2026 (catalog end). Lishi `inStock()` reads `TKS.Inventory.all()`. `dashMonthBounds`, `dashWeekJobs` deleted. `window.toast` defined page-wide (update bar + bottom-bar editor called an undefined `toast`).
- **8z66 Start a job REMOVED (owner, 2026-11-11).** `view-startjob` + `view-matsvc` markup and their script (VIN result card, `openMatSvc`, materials screen, `tks_service_prices`) are gone from `index.html`; the block keeps only the header/logo + phone "More" drawer wiring and a stub `window.openStartJob → goHomeView()`. New `homeView()` (`schedule` on a phone ≤720px, `payments` otherwise) and `goHomeView()` (clicks that nav item; falls back to Customers if the plan/role keeps it shut). `show()` Back target, `backBtn`, resume (`tks_view` of `startjob`/`matsvc` is ignored), popstate fallback, landing (`?go=` absent → `goHomeView()` on both phone and desktop) and Settings `goHome` all use it. `[data-go="startjob"]` clicks (old links) → home. Bottom bar `DEF=['schedule','quote','receipts','inventory']`. `view-receipts` head has `#rcNewDoc` (→ `bittings.html`) and `#rcNewQuote` (→ `bittings.html?quote=1`), wired the first time the Receipts nav item is clicked — the phone's way into the builder now that Start a job is gone. `app/corrections.js` (`TKS_CORR`) is now loaded but unused. Last version of the removed code: git tag `working-2026-11-11`.
- **8z65 Quick quote + estimate actions.** Sidebar item `data-go="quote"` → `location.href='bittings.html?quote=1'` (special-cased in the `[data-go]` handler; it is not a view). `bittings.html` `boot()`: `?quote=1` → `openNewDocument({docType:'estimate', quote:true})` (title "💬 Quick quote"). `submit()`: an estimate with no name saves `customer:'Phone quote'`, `noCustomer:true`; `finish()` skips the customer upsert when `receipt.noCustomer`. `finishedActions()` on an estimate adds `estimateToJob(r)` (writes `sessionStorage.tks_quote_job` = `{fromEstimate, serviceType, customer{name,phone,email}, address, vehicle{year,make,model,vin}, items[{desc,qty,each,amount,taxable,partId}], ts}` → `index.html?go=schedule`) and `estimateToInvoice(r)` (NEW id + INV number; also used by History "→ Invoice", which used to copy the estimate's id). Scheduler IIFE (end): a `tks_quote_job` younger than 10 min becomes the Quick form draft (`jobDraftSet('tks_sj_draft', …)`) and `openForm(null)` opens — the URL query is already gone by then (the back-button code rewrites it), so the stored value is the signal.
- **8z64 device cache / fast start (`app/store.js`).** `DevCache` (IndexedDB `tks_cache`, keys `<uid>:<table>` + `<uid>:role`) holds the adapter's `shadow` (server-confirmed rows only). `connectCloud`: `storedSessionUser()` (from the `sb-*-auth-token` in localStorage, no network) → `adoptCached()` → adapter live at once, promise resolves, `TKS.ready` = background `refresh()` + who/role/config in parallel. No copy → `hydrate()` ∥ who/role/config (was: tables, then getUser, then role, then config, one after another). `refresh(forceFull)` = per table `fetchRows(key, since)` + `applyFresh()` which updates the SAME array and row objects in place, leaves locally-changed rows alone, and resets `shadow`; refresh and `flush` of one table are serialized (`enqueue`). Receipts are `delta:true` (`updated_at > newest seen − 2 min`, full read every 15 min; soft-deleted rows returned by a delta are removed). New API: `TKS.refresh()`, `TKS.ready`, `TKS.hasStoredSession()`, `TKS.clearDeviceCache()`. Wipes: `TKS.auth.signOut()`, any `SIGNED_OUT` event (then reload), page load with no session, `signin.html`. Auth events for the same user no longer blank the role. Pages: no probe client; `visibilitychange` → `TKS.refresh()` if >30 s; `bittings.html` waits for `window.TKS_CONNECTING` (max 1.2 s) before `boot()`. `index.html` `TKS.onChange` handler is debounced 60 ms and `rerenderActive()` also repaints Scheduler (not under an open `.sch-modal`) and the Receipts list. `tier.js load(force)` asks the server at most once a minute. Supabase JS is now `app/vendor/supabase-js-2.119.0.js` on both pages (was CDN; `bittings.html` used unpinned `@2`); Stripe.js and Chart.js are `async`. **Screen-code rule: never keep a list position across a prompt or a network call — re-find the record (`indexOf`).** Tests: `tools/qa/store-cache-test.js`, `cloud-boot-test.js`, `app-test.js`, `quote-test.js`.
- **8z63 tax flag on job parts.** `jobToInvoiceDraft()` now sends `job_parts` lines as `{category:'Materials', taxable: TKS.Config.taxableDefault('Materials')}`; before they had neither, so the builder guessed Labor (untaxed).
- **8z62 Clock in / out button (index.html).** `#clkSlot` in `#authBar` (`updateAuthUI`), painted by `clkPaint()` from `clkState`; `clkRefresh()` calls `shift_status` (at most every 60 s, forced on focus / visibilitychange); `clkIn()` → `shift_clock_in`, `clkAskOut()` → reason sheet (`.clk-ov`) → `clkOut()` → `shift_clock_out(p_reason)`. No sign-out, except when `TKS_CLOCK.isActive()` (registered workstation) where it signs out like the lock screen. Shown when signed in, not demo, `staffRole()` set and not `owner`. No schema change (7a functions). Status: code-complete, pending mobile sign-off.
- **8z61 running totals in the builder.** `#qiTot` (`.qi-tot`) under the Add item / Discount buttons in `openQuickInvoice`; `paintTotals()` reads the rows like `submit()` (skips half-typed lines, declined lines; locked dispatch rows use `dispatchAmount × qty/dispatchQty`) and calls `computeTotals(its, pay, rate)` — same numbers the saved document gets. Repaints on modal `input`/`change`/`click` plus a 700 ms interval (parts picked / keys scanned fill a line with no event); the interval stops when the modal leaves the DOM. Status: code-complete, pending mobile sign-off.
- **8z60** locked dispatch rows (roles without editPricing): the qty `change` handler now allows raising above `dispatchQty` (amount = `lineAmountFor(v)`, max 99) instead of clamping; `submit` already scales `dispatchAmount × qty/dispatchQty`.
- **8z59** bittings.html Pay Now `poll()` retries failed `pay-status` calls (6×) and ends with a do-not-recharge message; `finish()` matches an existing document by `id` (number only for id-less legacy rows). OPEN: `nextDocNumber` is per-device (count of today's numbers in the local cache) → duplicates across devices; needs a server-side sequence.
- **8z57 drafts / might-fit keys / contractor role.** Drafts: `localStorage.tks_sj_draft` (Quick form, via `sjCollect()` on input/change/click, restored in `openForm(null)`) and `tks_wiz_draft` (`{b, step}` saved in `wzRender`); `openNewJob` prompts to continue; cleared on create; 14-day expiry; per device, never synced. `kfvList` now also returns `maybe[]` (loose make+year matches of any key subcategory, plus blank-Fits keys whose NAME parses to the make/year via `TKS_FIT.filter([{fitment:name}], veh, {loose:true})`); `renderKeys` shows them under "Might fit". Contractor UI uses `conLock` (owner/manager only). **8z58:** Reports `Net revenue` chip = `tot.sales − tot.cost − Σ booking.contract.amount` for the period's receipts (`receipt.jobId`, each job once).
- **8z55 Reports row → customer page.** `.repRow[data-inv]` on Reports + Closeout rows; a document-level click handler calls `openCustomerForReceipt(invId)` → sets `mode`, `openForm(idx)`, then `openInvoiceModal(r, c)`. **8z56 contracted-out jobs.** `booking.contract = {name, amount, paidAt?}` (bookings.data; no schema change), edited in `#sjContract` (hidden when `staffRole()===technician`), shown in the charges totals and on `card()`; `renderContractors()` fills `#contractBox` on view-commission from `TKS.list(bookings)` (owner/manager) and stamps `contract.paidAt`. Reports profit does NOT yet subtract it (profit = captured − receipt line costs).
- **8z53 after-hours = shop closed AND off the clock** (`phase8/8z53_after_hours_means_closed.sql`): `shop_open_at(shop, timestamptz)` reads `shop_config.data.hours` (America/Chicago); `commission_day_rows` part (2) adds `and not shop_open_at(v_shop, ah.a_at)`. **8z54:** `#paySched` modal in `renderPayroll` calls `payroll_set_schedule` (anchor = chosen period start, lag = pay day − period end).
- **8z52 per-person overtime** (`phase8/8z52_payroll_overtime_per_person.sql`): `staff.pay_overtime` (default false, not client-readable), `staff_set_overtime(uuid, boolean)`; `payroll_overview` / `payroll_mark_paid` use multiplier 1 unless the person has it on. `_payroll_calc` also returns `entries[]` (every shift) for the "See every shift" list. The shop-level toggle in the UI was removed.
- **8z49 payroll** (`phase8/8z49_payroll.sql`, applied 2026-11-11). `staff.hourly_rate_cents` (deliberately NOT in the authenticated column grant), `payroll_settings` (anchor 2026-10-25, 14 days, payday lag 4, OT after 2400 min/week ×1.5), `pay_runs`; both tables RLS-on with no grants. Owner-only SECURITY DEFINER RPCs: `payroll_overview(p_start)`, `payroll_mark_paid`, `payroll_unmark`, `staff_set_hourly_rate`, `payroll_set_schedule`. Hours = closed `time_entries` bucketed by America/Chicago clock-in date; weeks are 7-day blocks from the period start. UI: `renderPayroll()` into `#payrollBox` (top of view-commission), `payReminder()` bar (`#payDueBar`, snooze key `tks_pay_snooze_<period>`), `.ctRate` input in `renderCloudTeam`. **8z50:** `guessCategory` returns Labor for lockout/unlock/rekey/service call before `presetTaxable` (whose regex matches the bare word "lock").
- **8z48 closed-receipt lock.** `receiptClosed(r)` = status Paid in Full and not (payment Card without `paidAt`); `receiptLockedForMe(r)` adds role (owner/manager exempt). Enforced in `editReceipt`, `finishedActions` (Edit + Pay Now) in bittings.html and the Edit button in receipts-view.js. CLIENT-SIDE ONLY — RLS still lets any staff member update a receipt row; a DB guard would have to allow the pay/stock stamps a technician's own sale writes.
- **8z47 typed-card key.** bittings.html carries its OWN copy of the Pay Now sheet (not app/pay.js). Its keyed path still read `localStorage.tks_pay_pk` (prompting for a pk) and called `Stripe(pk)` without `stripeAccount`, which cannot see a direct-charge PaymentIntent. Both copies now use `pay-terminal {action:config}` for the key, have no typed fallback, and pass `stripeAccount` from `pay-create-intent`. Keep the two copies in step until the builder is folded into index.html.
- **8z46 edit in place.** `sessionStorage.tks_edit_receipt` (the receipt JSON) is written by receipts-view.js (Edit button) and by `jobInvoiceGuard`; bittings.html boot consumes it and calls `editReceipt(doc)` (takes precedence over `tks_job_draft`). `finish()` updates by id/number, so no new row.
- **8z45 internal notes / removed receipts / numbering.** `booking.internalNotes` (job form `#sjINotes`, shown on `card()`) → draft → `receipt.internalNotes` (`#qiINotes`); no card/PDF/share renderer reads the field. `CLOUD_MAP.receipts.hideDeleted` drops rows with `deleted_at` at hydrate (the `receipts_safe` view still returns them to managers; there is no in-app receipt delete — TKS-2026-1111A was soft-deleted by SQL on 2026-11-11). `nextDocNumber` skips letters already in use (count-based numbering would have reissued …1111B and `finish()` matches on number, overwriting it).
- **8z44 warranty rule / duplicate guard / result screen.** `receiptHasHardware(items)` (partId, lineType part, or category Materials) gates the warranty in `finish()` (bittings.html). `warrantyView(r)` (bittings.html + app/receipts-engine.js) derives the standard warranty for `source:pos` receipts with hardware from `paidAt` (the server writes no warranty fields). `jobInvoiceGuard(b)` (index.html) blocks a second receipt for a job (`receipt.jobId`) behind a confirm that opens the existing one in Receipts. Result screen wording + `← Back to Scheduler` action. NOTE: never run `sed -i` on index.html in Git Bash — it strips the CRLFs.
- **8z42 job charges / 8z43 paid mark.** Scheduler job form (`#sjCharges`, index.html) edits `booking.items[] = {desc, qty, each, amount, taxable}` and `booking.quote = {subtotal, tax, total, taxRate}` (stored inside bookings.data; no schema change). Totals add job keys (`jobParts`/`pendingParts` at `sellPriceCents`, taxed per `taxableDefault(Materials)`). Read-only when `staffRole()===technician` and not written back on their save. `jobToInvoiceDraft` sends `items` (price = line amount) instead of the single service line; they arrive `fromDispatch` so pricing is locked for roles without editPricing. `card()` shows `quote.total` and, via `jobPaid(b)` (status completed + a receipt with `jobId===b.id` and status Paid in Full), the `.sch-paid` look.
- **8z41 job → invoice hand-off.** `jobToInvoiceDraft` used `b.jobType` (a code: auto/residential/commercial) as the service line and category; now the line is `serviceLabel||subType` and the category goes through `ServiceCats.codeToKey`. `jobDraftToPrefill` (bittings.html) now passes `address`. Technician is still not prefilled (the builder has no technician field in the prefill path).
- **8z40 scheduler team retry.** `renderSchedule` fetched `TKS.Fleet.staff()` once per page load and latched `loaded`; an empty first answer (request before the session was restored, or an error) left `teamMembers()` on the `cfg.access.employees` fallback forever (ids `name:…`, so no real `technicianId`). `teamRetry()` re-asks at 2.5/7/15 s and on every `renderSchedule` while `STAFF` is empty, then re-renders. Jayden's Nov time_entries were corrected by SQL on 2026-11-11 (rows carry `note` + `edited_by`).
- **8z39 Register completion + receipts paging.** (a) `posCheckoutThen` `done()` called `TKS.POS.decrementStock(rid).catch(...)`; a supabase-js builder is thenable but has no `.catch`, so it threw, and `pay.js` swallowed the throw in `try{onDoneCb(j)}catch(_){}` → no stock RPC, no `posClear()`, no `showChgSend`. Now wrapped in a real promise; `pay.js` reports a failed after-payment step in the sheet. **Never chain `.catch` straight onto a Supabase call.** (b) `hydrateKey` (store.js) did one unpaged `select(*)`; PostgREST caps at 1000 rows, receipts has 1,763 → now pages with `.order(id).range()`. (c) `receipts-view.js` sorts by `savedAt` else `paidAt` (number ms on POS receipts) and labels the date from `paidAt`. Receipt `pos_f49f…` (2026-11-11) never had `pos_decrement_stock` run (`posStockApplied` unset).
- **8z38 staff pay-plan read grant** (`phase8/8z38_staff_pay_plan_read_grant.sql`, applied 2026-11-11). Phase 1a uses column-level SELECT on `staff` for `authenticated`; 8z22 added `pay_plan`/`after_hours_pct` and `renderCloudTeam` selected them without a grant → PostgREST 42501 on the whole query → card rendered "No staff rows yet.". Now granted (pin_hash/phone/address still not readable; those go through `staff_contacts()`). `renderCloudTeam` shows `r.error` instead of an empty list. Scheduler `fin()` re-renders when staff/vans resolve after the 1.6 s fallback. **Any new staff column the client selects needs its own column grant.**
- **8z38 roster merge.** `TKS_rosterMergeStaff(rows, contact)` (index.html, settings closure) runs inside `renderCloudTeam` once the `staff` rows + `staff_contacts` arrive: every ACTIVE staff row missing from `cfg.access.employees` is appended (match by email, else full/first name; `owner` = role owner/manager). Working copy only — persisted by the normal settings Save. Never removes or renames.
- **8z37 direct charges.** PaymentIntent, Terminal Location and readers live on the shop's connected account
  (every Stripe call carries `Stripe-Account`); Bittings gets only `application_fee_amount` (on the
  pre-surcharge base). `payment_transactions.charge_type` (`destination` | `direct`, default `destination`)
  tells pay-refund / pay-status / pay-terminal which account the intent is on. The migration nulls every
  `shops.terminal_location_id` (readers must be paired again) and clears Turbo Keysmith's unfinished TEST
  Express account. `pay.js` opens Stripe.js with `{stripeAccount}` when the server returns one.
- **`connect-onboard`:** new accounts use `controller` settings (fees.payer=account, losses.payments=stripe,
  full dashboard, Stripe collects requirements) instead of legacy Express; `{action:"status"}` reports
  `none | needs_info | verifying | connected` (+ what is missing) without creating or redirecting.
  UI: `TKS_BILLING.connectStatus()`.
- **`connect-oauth` (new):** link an existing Stripe account. `available` / `start` / `finish`; `state` is an
  HMAC over shop + user + time (30 min), nothing stored in between. Needs `STRIPE_CONNECT_CLIENT_ID`;
  redirect URI is `${appBase(req)}/`, so both addresses are registered in the platform's OAuth settings.
  UI: `TKS_BILLING.connectExistingAvailable/Start/Finish`.
- **`stripe-webhook`:** verifies with `STRIPE_WEBHOOK_SECRET` (account scope) or
  `STRIPE_CONNECT_WEBHOOK_SECRET` (connected-accounts scope). Without the Connect endpoint, card charges
  authorize but never capture.
- **Stale-copy guard.** `_headers`: `/staff/` and `/staff/signin` are `Cache-Control: no-store` (same on
  bittings.app); `signin.html` appends `?_=<time>` to the post-sign-in address.
- **Print helper** (`tools/print-helper/helper.js`): `ALLOWED` includes `https://bittings.app`. The copy
  installed on the counter PC is NOT updated yet.
- **Open:** Supabase Site URL still `turbokeysmith.com/staff/signin.html` (switch at cutover); public-site
  "Staff Login" links still `/staff/`; Turbo Keysmith live connection not charge-enabled, reader not re-paired,
  no live charge + refund yet; typed-card path untested (no publishable key set); OAuth path untested with an
  owner login from bittings.app; `billing-webhook` reuses `STRIPE_WEBHOOK_SECRET` and has no price IDs.
- **Status:** sandbox-tested; code-complete, pending mobile sign-off. Uncommitted.

## 2026-11-09 — 8z13: each shop pairs its own card reader (Settings → Payments → Card readers)
- **Why:** a new shop must be able to set up its reader itself instead of sending ids/keys to anyone.
- **Server:** `pay-terminal` actions `list` (this shop's readers only), `register` {code,label,address?} (owner/manager; first time
  creates the shop's Terminal Location on the platform account, claimed with a compare-and-set on `shops.terminal_location_id`),
  `rename`, `remove`, `config` (publishable key from secret `STRIPE_PUBLISHABLE_KEY`). `ownReader()` fence: reader must be at the
  shop's location — used by simulate/cancel/cancel_intent/rename/remove. `pay-create-intent` checks the same before creating the PI.
  Readers live on the PLATFORM account because charges are destination charges (on_behalf_of + transfer_data) created there; the old
  list used `stripeAccount: <connect id>`, which would never have found the real reader.
- **DB:** phase8/8z13_shop_terminal_location.sql (`shops.terminal_location_id`; browser can't write it — column grant is name only).
- **UI:** index.html `TKS_readersRender` / `TKS_readersForm` / `TKS_rdParseAddr`; app/pay.js `TKPay.readers(action, body)`, `getPK()`
  (server key first, old localStorage key as fallback); empty reader list says "add one in Settings → Payments".
- **Verified:** live functions, Stripe TEST, QA shop — 16/16 (incl. charge → webhook completed → refund). Phone sweep 124 / 0 issues.

## 2026-11-08 (night) — 8s: stock lives at the shop · real location labels · phone layout for part rows

**Owner (from a phone screenshot):** the part rows were unreadable on mobile (text squeezed between the qty controls and
4–5 buttons) and every row said "🚐 Van" although all stock is at the shop. Findings: the cloud truth is
`inventory_locations` (353 items / 2,210 units at `shop`, one item with 4 units in a van) while the row label came from the
legacy per-device `p.loc` flag via `defaultLoc()` (= van whenever van+shop were both enabled).
- **SQL `phase8/8s_inventory_locations_all.sql` (APPLIED):** `inv_locations_all()` (staff; every item/location/qty row
  for the caller's shop in one call — the client has no grant on the table) + a one-time fold of the van-held stock into the
  shop row (item "ford": 5 → 9; logged in audit_log). Now 336 items / 2,214 units at `shop`, 0 in vans.
- **index.html:** `defaultLoc()` → `shop` whenever the shop exists; signed-in mode (`invCloudLoc()`) loads
  `inv_locations_all` + `TKS.Fleet.list()` (30 s cache, `window.invLocRefresh(true)` after a stock change), rows show
  "🏪 Shop 9 · 🚐 <van nickname> 4" from real data (`invRowLocText`), and the location segment is **All / 🏪 Shop /
  each active van** filtering on real stock (`invAtLoc`); offline keeps the legacy flag with Shop listed first.
- **Phone layout (≤600px, was ≤480px):** `.crow.part .pinfo{order:-1;flex:1 1 100%}` — name + details full-width on
  top, qty controls left / action buttons right underneath, price tag last; `.sub` wraps anywhere.
- **8t phone sweep:** script walks 15 views + part form, Reorder, Scan-a-key, guided booking, customer form, all 10
  Settings steps, the invoice builder and the read-only Receipts page at 375 and 430 px, light and dark (124 screens):
  zero horizontal overflow / nothing past the right edge before or after; fixed every control under 44px and every
  dropdown under 16px (`#signOutBtn`, `#backBtn`, Start-a-job VIN / Y-M-M toggle, Fleet selects, Reports metric chips,
  Commission/Timesheets reload + Rules, `#roX`, Services "Select all", Hours "Copy to…", builder header buttons,
  `#roSearch`). Phone rules only (`@media (max-width:600px)`). After: 124/124 clean, 0 page errors.
- **8u always-visible bottom menu on phones:** `.bt-bottomnav` z-index above every overlay; sheets / pop-ups / camera
  stop above it; a capture-phase listener closes any open full-screen layer (and the camera) before switching screens
  (`window.closeAllOverlays`). bittings.html `#appnav` is now pinned (fixed, above the builder) on ≤720px with the same
  tabs as the app: Start job · Receipts · Customers · Stock · Scheduler.
- **8v strict vehicle match (owner: "a 2020 Charger needs the one just for the 2020 Charger"):** `fitment.js` scores a
  make-only fits entry ("Chrysler/Dodge/Jeep 04-19", "GM") as 0.5 when a model is chosen and `filter(items, veh, {loose})`
  drops it unless `loose`; `Inventory.forVehicle(veh, opts)` passes it through. The finder status line shows "+ N that
  list only “Dodge” (no model)" to opt in, and "pick the model to see only its keys" while only year/make are set. Live
  data: 2020 Dodge Charger 3 → 1 (CHRY-1604); 52 of 352 parts (mostly transponder blanks) list only a make.
- **8w swipe-back + booking scroll (owner, phone):** `show(name)` pushes `history.pushState({tksView})` per screen change
  (skipped while `window._tksPopping`); a `popstate` listener closes overlays and re-fires that view's `[data-go]`/sub-tab
  button (editor screens part/form/matsvc fall back to their parent). The first history entry is a `__root` guard: swiping
  back past the first screen shows "Swipe back again to leave the app". Returning from bittings.html with a `tksView` state
  reopens that screen. Guided booking `wzRender()` keeps `.wz-body` scroll when the same step redraws (year/make/model,
  ignition, sub-type); only a new step scrolls to the top.
- **8x vehicle catalog:** `app/ymm-catalog.js` (generated, ~24 KB) is loaded right after `lishi-seed.js` in index.html and
  bittings.html and APPENDS NHTSA vPIC rows (1995–2026) to `TKS_LISHI_SEED.models` — the hand-made rows stay first and keep
  their names (vPIC "Silverado HD" → "Silverado 2500/3500", BMW "328i" → "3 Series", Mercedes "GLC-Class" ↔ "GLC"), so
  TKS_YMM, the Start-a-job cascade and the fitment matcher all read the same list. `TKS_YMM.MAKES` (49 makes) is the one
  make list; Start-a-job reads it. Years 1995–2026. Rebuild: `tools/ymm-catalog/vpic-fetch.js` (~15 min) → `vpic-build.js`
  (filters heavy trucks, aliases, year runs). Fitment results are unchanged with/without the catalog (checked).
- **8z3 brand by supplier:** index.html `supplierFind(txt)` (name / initials / first+last-word code e.g. KIN / website) + `supplierOfBrand(brand)`; `pBrandFill` groups brands per supplier; pBrand change fills pSupplier; pSupplier change normalizes a code to the full name.
- **8z2 vendor logos:** index.html `VENDOR_LOGOS` {host:{icon,wide}} + `vendorLogo(url)`; `llRow` uses the icon as the row image and shows the wordmark (`.ll-wide`) above the label; `supRowHTML` shows `.sup-logo`. Files in app/assets/vendor-logos/.
- **8z missing FCC chip:** index.html `invNoFccOnly` + `invNeedsFcc(p)` (category sub in `INV_FCC_SUBS` = same list as the part form FCC box, empty `fccId`; a Transponder counts when `chip` is empty); chip `#invFccNudge` in `renderInvStrip`, hidden without the fitment plan; part of Clear all.
- **8y list years:** `fitment.js` tokenizer marks a NEW LINE (`␞`, `{t:'sep',line:true}`) apart from commas/semicolons (`␟`);
  `parse()` gives each segment a `line` index and, after building segments, a segment with no years inherits: from the
  previous years-FIRST segment ("2005-2008 Dodge Magnum, Charger"), else the next years-AFTER segment ("Camaro, Cruze,
  Malibu 2016-2020"), else the previous one. Not across lines when the segment starts with its own make, unless the source
  is a bare make line ("Hyundai Elantra" + "Hyundai 21-22"). Real-data diff: 2 of 352 items changed (both fixes).
- Start-a-job vehicle result: **"Start all-keys-lost job" → "Start new job"** (no preset service; the tech picks it).

## 2026-11-08 (evening) — 8r: dispatched lines, running log, camera scan out / back in, tech-discount cap · published under /staff/

**Owner decisions:** techs get the dispatched job and may ADD lines but not remove dispatched ones ("Didn't do this" +
reason instead); every such change goes to a running log; techs cannot discount in THIS shop but that is a per-shop
setting; keys are scanned OUT with the phone camera when sold and BACK IN when a customer declines; texting / tech
tracking parked (ROADMAP_AND_IDEAS.md); no paid services for testing.

**Server (`supabase/phase8/8r_field_log_scan_units.sql`, APPLIED live):** `log_activity(action, entity_type, entity_id,
detail)` (any staff → audit_log row; the client has no table grant on audit_log so this is the one door);
`unit_return_to_stock(unit, location, reason)` (staff; a SOLD unit → in_stock at a location, sale fields cleared,
logged, idempotent); `pos_decrement_stock` now sells the units listed in a line's `unitIds` first (FIFO for the rest)
and skips `declined:true` lines. `ALLOWED_ORIGINS` secret set to turbokeysmith.com / www / turbokeysmith.pages.dev.

**Data layer (store.js):** `access.techDiscountMaxPct` (default 0) + `Config.techDiscountMaxPct()`; `TKS.Audit.log()`
→ `log_activity` (no-op demo/offline).

**Camera (`app/camera-scan.js`, `window.TKS_CAM`):** full-screen themed scanner; BarcodeDetector (Chrome/Android: QR +
Code-128) else jsQR (`app/vendor/jsqr-1.4.0.js`; iPhone Safari: QR only); typed-code fallback; needs https/localhost.
Loaded by index.html and bittings.html. Scan-a-key panel has "📷 Scan with the camera". The site's `_headers` grant
`camera=(self)` for `/staff/*` (the rest of the site stays `camera=()`).

**Scheduler → invoice:** the Edit-job sheet (board card) and the Customers job modal gained **🧾 Invoice this job**
(`jobToInvoiceDraft(b)` → `sessionStorage.tks_job_draft` with `jobId`, customer/customerInfo, vehicle/vin, address,
tech, the booked service priced from Setup › Services, the job's parts (TKS.Jobs.parts) — all `fromDispatch:true`) and a
**Job log** (audit_log rows with entity_type 'job' / entity_id = jobId: Not done / Added / Key scanned out / back in).

**Builder (bittings.html):** dispatched lines show "📋 from dispatch"; for non-`canEditPricing()` users desc / category /
price / cost / tax are read-only, × becomes **Didn't do this**, qty can only go down (partial → `declinedQty`, amount
re-derived from `dispatchAmount × qty / dispatchQty`); themed reason prompt (Customer declined · Wrong key sent ·
Couldn't do it on site · Other+text). Receipt item fields: `fromDispatch, jobId, dispatchQty, dispatchAmount, unitIds[],
declined, declineReason, declinedQty` (+ `declineLoggedQty/addLogged/unitIdsLogged` bookkeeping). Totals skip declined
lines (builder, `receipts-engine.js`, server). Card + PDF render them struck at $0 with "— not done (reason)" (Spanish
"no realizado"). Tech discounts: hidden at cap 0, else percent-only up to the cap, validated on submit; a tech's
dispatched price is re-derived so it can never be discounted. **📷 per line**: unit label → `inventory_units` lookup
(must be in_stock) → attached (`unitIds`, "🔑 N scanned" chips, qty follows); SKU barcode → like 📦; wedge `tks-scan`
listener. **Scan back in**: after a decline on a line with units, or "↩ Scan back in" on the result screen → must match
one of that line's ids → removed; if stock was already applied → `unit_return_to_stock` (location = the tech's van
when known) + log. Camera button shows on touch devices / when permission was already granted (headless/desktop hide
it; typed-code fallback everywhere). Audit actions: `dispatch_line_declined`, `dispatch_line_added` (entity job),
`unit_scanned_out`, `unit_scanned_in` (entity inventory_units).

**Setup › Access:** "Technician discounts — up to __ %" (0 = none; this shop 0).

**Published under the website:** `website/site/staff/` = index.html, bittings.html, signin.html, cloud-test.html (stub),
icons, `app/` (no docs/supabase/tools/demo pages); every "Staff Login" link (239 pages) → `/staff/signin.html`,
pinned bottom-right in the footer; `_headers`: `/staff/*` noindex + camera allowed + no-cache; `ga-tag.mjs` skips
`/staff`. Re-publish = `node website/_tools/publish-staff.mjs` (copies + rewrites links) then `node website/_tools/deploy-site.mjs`
(wrangler needs `CLOUDFLARE_API_TOKEN` — a Pages:Edit user token — AND `CLOUDFLARE_ACCOUNT_ID`; both are saved in this PC's user
environment via setx on 2026-11-08; the token cannot list accounts/zones, so cache purges are done in the dashboard).
Cloudflare Pages serves clean URLs: `/staff/signin.html` 308 → `/staff/signin`; the app's relative links survive it.
A root `website/site/cloud-test.html` forwarder catches old cached pages / bookmarks → `/staff/signin.html`. `_headers` detaches
the site-wide `Permissions-Policy` on `/staff/*` (`! Permissions-Policy`) before re-adding it with camera=(self).
DEPLOYED 2026-11-08 ~19:15 CST (deploys aafd3999 / 6cbcd52f); the edge cache still had the pre-deploy HTML for URLs already
visited — purge in Cloudflare (Caching → Configuration → Purge Everything) or wait for it to expire.
**Supabase Auth → URL configuration still needs** https://turbokeysmith.com/staff/signin.html (+ pages.dev) for the
Forgot-password link to land back on the page; password sign-in itself works from the new origin.

**Verified:** builder dispatch suite 41/41; invoice-this-job draft (tech, demo) carries the dispatched service at the
Setup price; final app regression zero page errors; QR label previewed via Labelary. Live-cloud paths (unit lookup,
return RPC, log) exercised with stubs only — the owner's phone test on /staff is the first real run.

## 2026-11-08 (late afternoon) — "implement all your ideas": 8l/8m server gates & seats · 8n inventory + app upgrades

**Owner:** "implement all your ideas" (the list at the end of the clean-up report) + "don't type the aftermarket name on
the receipt" (checked: `brand` is never rendered by bittings.html / receipts-engine.js / receipts-view.js — it stays on the
part row, the Unit panel and the finder only) + "RC = OEM recased (refurbished, no logo)" (recorded; stays OEM Refurbished).

**8l — plan checks INSIDE the gated RPCs (APPLIED live).** `supabase/phase8/8l_require_tier_in_rpcs.sql` adds
`perform public.require_tier('<feature>');` as the first statement of 25 plpgsql functions (pos: pos_checkout,
pos_decrement_stock, pos_restock · inventory: inv_adjust, inv_move, inv_receive, unit_receive, unit_move, unit_set_status,
unit_ensure_serialized, cycle_start/save_line/complete/cancel, key_failed, return_update, warranty_replace · scheduler:
job_set_status, job_cancel, job_reconcile_part, job_release_hold · move_requests: move_request_approve/deny · commission:
commission_day_rows · nastf: nastf_worklist). Originals saved verbatim in `8l_rollback_original_rpcs.sql`. Verified all 25
now contain require_tier; no edge function calls them as service_role; both live shops are Pro → no behavior change.
A locked shop gets `TIER_LOCKED: <feature> requires a higher plan` from the server even if the UI is bypassed.

**8m — seat limits (APPLIED + DEPLOYED).** `staff-invite` refuses a new active member when used ≥ allowed:
`402 {error:'SEAT_LIMIT', used, allowed, tier, message}` (re-invites still 409; shops with no subscription row are not
limited). DB guard `8m_seat_limit_guard.sql`: BEFORE INSERT/UPDATE trigger `trg_staff_seat_limit` → `staff_seat_guard()`
raises `42501 SEAT_LIMIT: …` when a non-owner row becomes active past the entitlement (owners, de-activations, already-active
edits pass). `tier.js`: `TKS_TIER.seatsLeft()`, pill shows "x/y seats · full" in amber. Settings › Access shows "Seats full —
… Upgrade ↑" on that error (index.html).

**Sign-in page renamed:** `cloud-test.html` → **`signin.html`**; the old name is a forwarding stub (keeps query + hash)
so the ~240 public-site "Staff Login" links and old bookmarks keep working. All app references switched (index.html,
pay.js, bittings.html/cloud-config.js comments). **Supabase Auth URL config (read via `config pull --dry-run`): Site URL
= http://localhost:3000, redirect list EMPTY → Forgot-password links currently land on localhost:3000.** Owner must add
http://localhost:8088/signin.html, http://127.0.0.1:8088/signin.html and https://app.turbokeysmith.com/signin.html (and any
tunnel URL) in Dashboard › Auth › URL Configuration.

**8n — Inventory upgrades (index.html, inventory-traceability.js, hardware.js):**
- **Per-unit labels + scan-to-unit.** `TKS_HW.labels.buildUnitZPL/printUnit/printUnits` — **QR code** of the unit id (owner's call, 8o: Code-128
  of 34 chars was too fine), QR left / name · SKU · rcvd date · id text right; previewed via Labelary at 2.25×1.25 in, 203 dpi. After a
  serialized receive: "🏷️ Print N unit labels". `window.openUnitPanel(code)` / `unitLookup(code)`: the unit's story
  (part, SKU, brand + grade, unit id, status/location, supplier, invoice/order #, received date + staff, cost, sale
  receipt/customer/date, disposition) with 🛡️ warranty / ⚠️ failed / 📍 move. `tks-scan` of a `u_…` id opens it from any
  screen; on the Register it adds the unit's PART. Toolbar **🔎 Scan a key** `#invScanKey` (type/paste a unit id or SKU;
  SKU → part + last 25 units). Demo → "Unit lookup needs the live app".
- **Receiving:** "Supplier invoice / order # (recommended)", supplier prefilled from the part, blank order # → themed
  confirm before receiving.
- **Reorder list** `#invReorder` (inventoryWrite): low/out parts grouped by supplier, suggested qty (`reorderQty` or
  max(lowAt*2−qty,1)), cost, line + supplier totals, contact line, **Copy list**, **✉️ Email** (pre-addressed to the
  supplier's new **Order email** — `Config.suppliers[].email`, editable in Setup › Inventory; Key Innovations seeded with
  info@keyinnovations.com), **⇩ CSV**.
- **One summary strip:** `#invDash` removed; `#invSummary` = fit-vehicle · parts · low/out · missing cost (tap-to-filter) ·
  stock value at retail / cost (`#invValueChip`, cloud `inventory_dashboard` via `invStripSetCloud`, else local; editPricing
  roles) · open returns (`#invRetChip`, cloud only, tap → Reports › Returns).
- **Start-a-job draft** now carries `vin` and the customer (`customer` name string + `customerInfo{id,name,phone,email}`;
  new optional Customer block `#msCustName/#msCustPick` on the materials step); bittings.html `jobDraftToPrefill` reads
  both → name, phone, email, customerId prefilled.
- **Dialogs:** zero native alert/confirm/prompt left in index.html (Programmers ×6, Lishi ×9, Scheduler ×1 → uiAlert /
  uiConfirm / uiPrompt) and in inventory-traceability.js.
- **Services in ONE place:** the Setup "Service types" step is folded into **Services** (categories on top, priced list
  below, one save); review row renamed "Kinds of work". Register, invoice builder and Scheduler all read the same config.

**8p — vendor SKU (APPLIED live):** `inventory.vendor_sku text default ''` (+ `inventory_safe`), `store.js` `vendorSku` in fromRow/toRow and
in `Inventory.search`; part form `#pVendorSku` next to Supplier (Reorder qty moved to its own row); row sub-line shows
"vendor # …"; Reorder list shows it bold before our SKU in the modal, the Copy/Email text
and the CSV (`vendor_sku` + `our_sku` columns); CSV export column; importer field (hints: vendor sku / supplier part / aks #).

**8q — supplier-facing reorder text:** `reorderText()` (Copy / ✉️ Email) now sends only "Order request - <shop> - <date> / To: <supplier>"
+ "qty x <vendor SKU>  <part name>" lines + a closing line. Our SKU, on-hand and cost appear only on screen and in the CSV (ours).
Lines without a vendor SKU are flagged on screen (`.ro-missing`, tap → `openPart`) with a count note (`.ro-note`) so the owner fills them in before sending.

**Verified:** inventory batch 62/62 Puppeteer checks (owner + tech, 1280/375, light/dark); final app regression zero page
errors / zero overflow across all views; builder suite 0 fails; stub redirect keeps query+hash; staff-invite anon → 401.
Not possible here: a real Zebra print of the unit label, real phones.

## 2026-11-08 (afternoon) — 8j clean-up · 8k "vehicle fitment" plan gate · ONE invoice builder · ONE scheduler

**Owner (remote):** "plan it all out and start" on the review findings (dead/duplicate code, chat invoice → delete
or rework, guided scheduler, fitment as a paid feature). Nothing committed; the owner commits when happy.
Backups of every file before each phase sit in %TEMP%\bittings-bak-phase{A,C,D,E}\.

### 8j — de-duplication and dead code (no behavior change)
- **jsPDF 2.5.1 once:** `app/vendor/jspdf.umd.min.js` (extracted byte-identical from the embedded copy). index.html
  loads it instead of the CDN; `app/receipts-engine.js` (396 KB → 32 KB) and `bittings.html` lost their embedded
  copies (−364 KB each). The engine still reads `window.jspdf`.
- **Lishi seed once:** the native Lishi view in index.html no longer carries a second copy of the tool/vehicle seed
  (−85 KB); it reads `TKS_LISHI_SEED` (`lishi-seed.js` now also exports `toolFields, vehFields, mk, inferKeyway`).
  The one label the view had changed ("Lishi picks (door / ignition / trunk — optional override)") is re-applied in the shim.
- `cloud-config.js` loaded once (was twice). Removed: `posManageServices`, `ownerVisible`, `setupLinkHTML`,
  Scheduler `doStatus`, `_btApp`, `DEVKEYS`, the dead global `[data-open]` handler, `store.js DEFAULT_SERVICES`
  (never read), 39 CSS rules whose selectors appear nowhere (grep-verified, `.pl-*`/`.tile` kept).
- **Deep links** `?go=reconcile` / `?go=returns` now open Inventory › Reconcile / Reports › Returns (their nav
  buttons stay hidden); `_tryGo` runs after the script has defined the renderers (it used to hit a TDZ on
  `invSearchEl`).
- **Pages archived to `_archive/`:** `lishi.html` (fully ported), `setup.html` (Settings lives in index.html;
  bittings.html's ⚙ now goes to `index.html?go=settings`), `scheduler.html` (see Phase D). Nav tabs in
  `appnav.js` + bittings.html point at `index.html?go=lishi|schedule`. Also archived: `_devserver.py` ×2 (the
  launcher uses `_devserver.js`), the pitch scripts/screenshots, and six historical docs → `_archive/docs/`.
- **Dark palette bug fixed:** the comment above `html[data-bt-theme="dark"]{…}` contained `--surface-*/--text-*`;
  the `*/` closed the comment early and Chrome discarded the whole dark palette rule, so `--card/--ink/--bg`
  never flipped. Fixed; the many explicit white-card dark overrides still win where they exist, so the look is unchanged
  except where tokens were relied on (Scheduler modals now theme).
- **Demo noise:** demo/sandbox no longer makes cloud round-trips (hydrate, shop_config load/save, Stripe-connect
  status, mfa_pending, inventory_dashboard, job_parts). Only the fake token's `auth/v1/user` 403 remains.
- cloud-test.html (the real sign-in page): **Forgot password?** → `resetPasswordForEmail` (redirect back to the
  page) and a `PASSWORD_RECOVERY` → "Set a new password" view (`updateUser`). **Needs the app's address in
  Supabase Auth › URL configuration › Redirect URLs** before the email link will land here.
- `hardware.js` settings window uses `var(--card/--ink/--bg/--edge/--dim)` (was dark-only hard-coded colors).

### 8k — "finding keys by vehicle" is a plan feature (Starter and up)
- SQL `supabase/phase8/8k_fitment_tier.sql` (APPLIED live 14:0x CST): `tier_allows('fitment')` = starter/pro;
  `inventory_safe` returns `fitment`, `fcc_id`, `chip` as '' unless the plan allows it; new table
  `public.vin_decodes` (per-shop usage log; managers read their own shop). Both live shops are Pro → unchanged.
- Edge function **`vin-decode`** (DEPLOYED, `functions deploy vin-decode --yes --project-ref …` from
  bittings-unified/): `requireStaff`, reads the shop's subscription, 402 `TIER_LOCKED` for lookup plans,
  proxies NHTSA vPIC, logs to `vin_decodes`. `store.js decodeVin`: signed-in shops call the function; a
  `TIER_LOCKED` answer surfaces as `err.code==='TIER_LOCKED'` (never falls back); an unreachable function falls
  back to the direct NHTSA call; demo/offline go direct. `toRow` omits `fitment/fcc_id/chip` while locked so a
  Lookup-plan edit can't wipe them.
- `tier.js`: `fitment` in the client matrix, `FEATURE_LABEL`, `showUpgrade('fitment')` accepts a feature key,
  Starter copy mentions keys-by-vehicle, and `applyGates()` re-renders Inventory when the tier arrives.
- index.html: `fitmentAllowed()` / `invFitmentGate()` replace the Year-Make-Model, VIN and FCC rows with a
  🔒 lock + Upgrade button; the part form hides Fits / FCC / chip; the VIN box shows the upgrade prompt on
  `TIER_LOCKED`. (On a Lookup plan Inventory itself is locked, so today the in-finder lock only shows if the owner
  later moves `fitment` to Pro.)

### Phase C — ONE invoice builder (bittings.html 297 KB → 218 KB)
The Quick invoice is the only builder for every role; the field-by-field chat flow, its undo stack, bubbles,
signature pad screen, HEAD_FLOW/VEHICLE_MAKES/decodeVIN, the unreachable in-page Settings + Welcome tour, backup/restore
and the 19 KB base64 default logo are deleted. Added to the builder: role-based hiding of **Cost $ / Discount /
tax-rate override** (`canEditPricing()` = `TKS.auth.can('editPricing')`), Individual/Business + Contact person +
📇 contracting-shop picker, discount rows (chat shape `{isDiscount, discountMode, discountValue}`), payment
Cash/Card/Zelle/Check/Other + status Paid in full / Partial (`amountPaid`, new) / Unpaid, per-line **Category**
(Labor/Materials/Travel/Programming/AfterHours — fixes the old "Automotive" bug), service types from
`TKS.ServiceCats.invoiceActive()`, VIN required for Auction/Fleet D1, NASTF photo checklist (`nastfChecklist`,
new), ✍ signature modal, ☆ Save as common job, legacy free-text vehicle. **Edit merges** into the existing receipt
(deep copy; only form-owned fields change). `boot()` reads + clears `sessionStorage.tks_job_draft` (Start-a-job
handoff finally works). `recordCashSale` + edge `pay-record` (REDEPLOYED) now accept **zelle/other** paid sales so
Closeout/Reports see them; `receipts-engine.js` shows "Paid: $x · Balance due: $y" on Partial receipts (card + PDF).
Retired everywhere: `access.quickInvoiceEnabled/quickInvoiceDefault`, `TKS_OWNER.QUICK_INVOICE_*`, the Settings
toggles, demo seeds. QA: 55 Puppeteer checks (owner + technician, 1280/375, light/dark) pass.

### Phase D — ONE scheduler (guided booking inside index.html)
`+ New job` opens the ported guided wizard in a `.sch-modal` sheet: Greeting → Customer → Job type (Setup) →
Sub-type → Details (VIN via `TKS.decodeVin` or Y/M/M, ignition, address) → Schedule (date/time/duration/tech from the
board roster) → Upsell → Confirm → Done; EN/ES script library ported; progress bar; Back everywhere; "⚡ Quick form"
(the old plain form) for `can('setup')`/owner only, no PIN. Both paths write through `persistJob(rec)`
(TKS.Bookings.save → TKS.Jobs.assign); the wizard also upserts the caller into Customers. Record shape adds
`addr{street,city,state,zip}`, `vehicle.ignition`, `upsell{offered,accepted}`, `bookedVia:'guided'`.
`?go=schedule` self-renders. `scheduler.html` archived (`TKS.Jobs.meta/unassignRole/staffOnJob` now unused).
QA: 50 checks pass, 0 page errors, no overflow at 375px.

**Verified overall (final regression, demo, owner light + dark 1280px, technician dark 375px):** all 12 main views
render, zero page errors, zero horizontal overflow, wizard opens EN/ES, bittings.html opens the builder, no
chat remnants. Real-phone sign-off still pending.

## 2026-11-08 (later) — 8i: Inventory finder — Category / Sub-category / Year-Make-Model / FCC ID / VIN boxes + tap-to-filter "missing cost"

**Why (owner, remote session):** "on inventory we need a filter by category … select this box [83 missing cost]
and filter to all of those … we carry aftermarket, OEM new, OEM refurbished, accessories and services — all of
these are SKUs … a drop box for year make and model, a search for FCC ID, a search for VIN — separate the
searches, each in their own box (merge later) … a subcategory filter like remote, smart, mechanical."

**UI (`index.html`, Inventory → Stock):** the toolbar keeps Import / Export / + Add / Hardware; the
🔎 VIN and 🚗 Fits vehicle buttons are gone. Below it sits one card, `.invfind`, with labelled boxes:
- **Category** `#invCatSel` — All / Aftermarket / OEM New / OEM Refurbished / Accessories / Services, each
  with a live count; a "Keys — unsorted (no AM / OEM / REF on the SKU)" option appears only when such rows exist.
- **Sub-category** `#invSubSel` — built from what is actually in stock inside the chosen category (Smart Key,
  Remote / Fob, Remote Head / Flip, Transponder, Key Shell, Mechanical, the accessory subs, the new service subs),
  in `INV_SUB_ORDER`, with counts. A pick that no longer exists after the category changes resets to All.
- **Year / Make / Model** `#invFitYear/#invFitMake/#invFitModel` — the 8h fits finder, now always visible
  (`invFitActive()` no longer depends on a hidden bar; `invFitFill()` runs at load).
- **FCC ID** `#invFcc` — substring match on `fccId` with spaces/dashes/case ignored (`invFccNorm`), so
  "tq8rke" finds "TQ8-RKE-4F25" and "HYQ1ES" finds "HYQ1EA / HYQ1ES".
- **VIN** `#invVinBox` + **Find** `#invVinGo` (Enter works too) — validates 17 chars, calls `TKS.decodeVin`,
  writes the result into Year / Make / Model and says "Decoded: 2019 Buick Enclave — showing the keys that fit."
  Replaces the old `openVinModal` (deleted).
- **Search** `#invSearch` — unchanged free-text box (still understands "2019 enclave").
- A status line `#invFiltOn` ("Showing 12 of 390 · Aftermarket · Smart Key · fits … · FCC … · missing cost")
  and **✕ Clear all filters** `#invFitClear` show only while something is filtering; the empty state offers the
  same Clear button. All filters AND together, on top of the existing van/shop segment.
- **"missing cost" chip** `#invCostNudge` is now a button (`role=button`, Enter/Space): tap → the list shows
  only parts with no cost (`invNoCostOnly`), chip reads "showing only these · tap to show all"; tap again →
  everything. It resets itself when the count hits 0 or the viewer can't see cost (`editPricing`).

**How a key's Category is decided (`partGrade(p)`, no schema change):** Accessories / Services come from the
stored category's top half ("Accessories/…", "Services/…"). For keys the grade is read from the SKU (then the
part name) as whole tokens: `REF | REFURB | REFURBISHED | RECON | RC` → OEM Refurbished, `OEM` → OEM New,
`AM | AFTERMARKET` → Aftermarket, else **Unsorted**. An explicit `p.grade` field wins if a row ever has one
(there is no such column yet — adding `inventory.grade` + a form field is the clean follow-up if the owner wants
it instead of the SKU convention). Of the 390 SKUs in the 2026-11-08 cleanup list: 277 AM, 48 OEM, 7 REF/REFURB/RC,
~52 with no marker (mostly transponder/mechanical blanks and "UNIV-IKEY*" — these show under Unsorted until the
SKU gets a suffix). The part form now says so under SKU. **Owner confirmed:** "RC" = OEM **recased** (refurbished OEM internals in a new shell, no logo) → OEM Refurbished; 2 rows.

**Services as SKUs:** `INV_CATEGORIES` gained `Services → Key Cutting / Programming / Lockout / Rekey & Lock
Work / Labor / Other Service` (+ `INV_TOP_ORDER/LABEL/SUB_ORDER`), so service SKUs can be added like parts.
This is separate from Setup → Services (the booking catalog); nothing there changed.

**Verified (headless Chrome, demo seed + 6 synthetic rows, owner & technician, 1280px and 375px, light & dark):**
every category and sub-category pick narrows the list and the status line; FCC "tq8rke" → 1 row; 2019 / Buick /
Enclave → 1 row; VIN 5GAEVCKW4KJ123456 → "Decoded: 2019 Buick Enclave", boxes filled; the cost chip toggles
2 ↔ 28 rows; Clear all and the empty-state Clear reset everything; technician sees no cost chip; phone:
no horizontal overflow at 375px, every control 44–45px tall, Year/Make share a row with Model full-width
below. 0 page errors. **Real iPhone Safari / Android Chrome not run here → code-complete, pending the owner's
two-phone sign-off.** QA scripts live in the session scratchpad (`qa-8i.js`, `qa-8i-phone.js`), not the repo.

### 8i round 2 (same day) — every SKU gets its own Category / Sub-category / Brand; suppliers with house brands

**Owner, remotely:** "on each SKU we need a category / sub-category option … UNIV = universal keys, category +
sub-category smart key / remote / super remote …, mainly which company they are from (Xhorse, Autel, KeyDIY …)
— make those selectable in setup like the programmers … all UNIV IKEY are Autel universals." Then: "each supplier
has their own brand — American Key Supply → Blue Rocket (most of our keys), Key Innovations → Keyless2Go, Your Car
Key Guys → YCKG … add their address / phone / website … so a key scanned out for warranty tells us brand +
distributor (units are serialized)."

**Data — migration `supabase/phase8/8i_inventory_grade_brand.sql` (APPLIED live 2026-11-08 ~12:05 CST via
`npx supabase@3.0.0 db query --remote --yes -f …` from the repo root):** `inventory.grade text not null default ''`
('Aftermarket' | 'OEM New' | 'OEM Refurbished' | 'Universal'; blank for Accessories / Services) and
`inventory.brand text not null default ''`; `inventory_safe` recreated with `grade, brand` appended (same
additive pattern as 8h; no RLS change). Sub-category stays inside `category` ("Keys/<sub>" etc.).
`store.js` CLOUD_MAP: fromRow/toRow carry `grade`/`brand`. CSV export + importer (`TKImport` fields
`grade` — AM/OEM/REF/UNIV short forms expanded — and `brand`) updated.

**Backfill — `supabase/phase8/8i_backfill_grade_brand_2026-11-08.sql` (APPLIED, owner shop only, idempotent,
rollback = set both columns back to ''):** whole-token rule on SKU+name → 186 Aftermarket, 34 OEM New, 4 OEM
Refurbished, 6 Universal (5 × UNIV-IKEY → brand Autel; XH-XKTO22EN "UNIVERSAL WIRED RHK FOR VVDI" → brand
Xhorse, by hand), 100 accessories untouched, **23 keys left blank** (plain blanks / H86, K-B120, "ford", the
GM-928 pair …) → "Keys — unsorted" in the finder until the owner picks a category on the form. `supplier` is
blank on every row, so no brand was assumed for Aftermarket keys (the owner says most are Blue Rocket — a one-line
bulk update is ready if he wants it).

**Part form (`#view-part`):** the old single Category select is now **Category** `#pGrade` (Aftermarket / OEM
New / OEM Refurbished / Universal / Accessories / Services) + **Sub-category** `#pSub` (per category: key subs;
Universal adds **Super Remote**; accessory subs; service subs; "Other…" keeps free text) + **Brand** `#pBrand`
(hidden for Services). `pTaxFill(p)` seeds from `p.grade`, else the stored category top, else `partGrade`.
`pCategoryValue()` still returns "Keys/<sub>" etc.; `pGradeValue()`, `pBrandValue()` feed save. Supplier
`#pSupplier` is now a datalist of the configured suppliers; on supplier change `pBrandFill` regroups: "From
<supplier>" → (Universal only) "Universal key makers [you stock]" / "Other universal makers" → other suppliers'
brands → Other…. An Aftermarket key whose supplier has exactly one house brand gets it auto-selected when brand is
blank **or** currently another supplier's brand. `.form select` got the input styling (was a 19px native select;
caused horizontal overflow on phones). FCC/chip visibility (`FCC_SUBS`/`CHIP_SUBS`) includes Super Remote.

**Finder:** Category list gains **Universal**; `partGrade()` now prefers the stored grade, then tokens
(UNIV/UNIVERSAL/IKEY → Universal, REF… → Refurb, OEM, AM); a **Brand** box `#invBrandSel` appears once any
part has a brand (counts, within the chosen category); rows show the brand after the SKU. `partBrand()` =
stored brand, else IKEY → Autel.

**Shop config (`shop_config.data`, `TKS.Config`):** `univBrands: string[]` (makers ticked) and
`suppliers: [{name, brands[], phone, website, address}]` — defaults seeded with the owner's three distributors
(AKS → Blue Rocket, 800-692-1898, americankeysupply.com, 2895 W. Capovilla Ave Ste 100A Las Vegas NV 89119;
Key Innovations → Keyless2Go, 640-224-0031, keyinnovations.com, 633 Hickory Hill Dr Vernon Hills IL 60061;
Your Car Key Guys → YCKG, 931-451-7881, yourcarkeyguys.com, Spring Hill TN — street address not published).
Both whitelisted in `mergeConfig` + `Config.save`; accessors `Config.univBrands()`, `Config.suppliers()`.
Defaults apply until the owner edits (then the saved list wins; an emptied list stays empty).

**Where the owner edits them:** Setup › **Inventory** step renders `suppliersBlockHTML()` (card per supplier:
name, brands comma-separated, phone, website, address, Remove; "+ Add supplier"; debounced save on type) and
`univBrandsBlockHTML()` (checkbox tiles for the 11 makers; the big four first). The same brand checklist is
mounted in **Programmers › My tools** (`#univBrandsHost`, `data-cap="editReference"`) by
`window.renderProgrammers`. Receive-units modal (`inventory-traceability.js`) suggests the configured
suppliers on its Supplier field — units already store supplier/batch per unit (6a), so warranty/failed returns
resolve brand (part) + distributor (unit).

**Universal makers list (`UNIV_BRANDS`, index.html):** Autel (IKEY), Xhorse (VVDI / XM38 / XS), KeyDIY (KD /
ZB), Lonsdor (LT20) as the majors — every US distributor sweep returned those four; also OBDSTAR, Launch, Topdon,
JMA, Silca, Keyline, CGDI as lesser universal lines (vendor/distributor pages, not independently verified) —
"Other…" covers the rest.

**Verified (headless Chrome, demo + 4 synthetic rows, owner, 1280px + 375px):** AKS Aftermarket key opens with
Brand = Blue Rocket; switching supplier to Key Innovations flips it to Keyless2Go; switching Category to Universal
lists Super Remote + the makers; saving stores grade/category/brand; an unsorted key opens on "— pick a category —"
and saves OEM New / Transponder (finder Unsorted count drops); Setup editor saves ticks and typed edits to config
(`TKS.Config.univBrands()` / `suppliers()`), add + remove supplier works; Programmers › My tools shows the same
ticks; finder Brand box filters (Keyless2Go → 1 row). Phone: no horizontal overflow, selects 46px tall.
**Real iPhone / Android not run → code-complete, pending the owner's two-phone sign-off.**

## 2026-11-08 — 8h: vehicle fitment for keys (FCC ID · transponder chip · year/make/model matching)

**Why:** the owner wants to paste a distributor fits list ("2018-2021 enclave 2020-2021 encore 2018-2020
regal") + an FCC ID on a key, then have *any* year/make/model lookup find it (2019 Enclave and 2019 Regal
→ same key), with the FCC ID shown on smart/remote keys and the chip on remote/transponder keys.

**Data (migration `supabase/phase8/8h_inventory_key_fields.sql`, applied live 2026-11-08):**
`inventory.fcc_id text`, `inventory.chip text` (both `not null default ''`); `inventory_safe` recreated
with `fcc_id, chip, serialized` appended after `sell_price_cents` (additive `create or replace`; grants
and the `is_manager()` cost mask unchanged). No RLS change — the existing inventory policies + the 5b
`shop_id` fence apply. `store.js` CLOUD_MAP: `fromRow` → `fccId/chip/serialized`, `toRow` →
`fcc_id/chip` (never writes `serialized`, 6a owns it). The free-text `fitment` column is still the only
thing stored for vehicles — parsing is client-side.

**Parser `app/fitment.js` (`window.TKS_FIT`, also `module.exports` for node tests):**
- `parse(text)` → `[{ys, ye, make, model, raw, resolved}]`. Tokeniser: year ranges (`2018-2021`,
  `2018–21`, `2015 to 2020`, `2018+`), distributor 2-digit shorthand (`08-14`, `16+`, `ROGUE14-19`,
  `150019-24`, `Traverse-18-20`), hard separators (`, ; | · newline`, " - "), `/` lists split into model
  words (compound catalog names like `F-250/350`, `Silverado 2500/3500` still match), parentheticals
  dropped (also an unclosed one — the import truncated names at 30 chars), `HYQ14FBA/FBB` kept as one
  code. Words: STOP list (smart/remote/fob/w/ RS/trunk/4-Button…), ALIAS_WORD shorthand (`crv`→CR-V,
  `acrd`→Accord, `chrs`→Chrysler, `f-series`→F-150 F-250 F-350, `toy`→Toyota…), make aliases
  (`chevy`, `vw`, `landrover`, `gm`→**GM** brand group). Resolution per segment: any number of leading
  makes ("Chrysler Dodge Jeep 04-19" → one make-only entry each; "GMC Chevrolet Suburban Tahoe Yukon"
  → each model resolved within those makes), then catalog model matching left-to-right (longest name
  first, from `TKS_LISHI_SEED.models` + saved `tks_vehicle_keyways`), make inferred from the model
  when absent (Enclave → Buick), unknown words become unresolved entries under the current make,
  key-blank codes / part numbers / all-consonant junk skipped, a bare make with only junk after it →
  make-only entry (resolved). A make mid-list switches the current make ("Scion FR-S / Toyota 86").
- `itemFits(item, {year, make, model})` / `filter(items, veh)` (exact-model hits first): year within
  range (open ranges `ys..9999`), make equal or inside a brand group (`GM` covers Chevrolet/GMC/Buick/
  Cadillac/…), model equal or the query *more specific* than the entry ("Silverado" covers "Silverado
  1500"; "Encore" does **not** match an "Encore GX" entry). A make-only entry is a weak hit for any
  model of that make. `parseQuery(q)` turns a search-box string into a vehicle only when a catalog
  model/make was recognised ("2019 enclave", "buick regal"; never "hu101 blank" or "HYQ4EA").
- `label(e)` / `summary(text)` → "2018–2021 Buick Enclave · 2020–2021 Buick Encore". Results cached
  per text (bounded). Unit tests: scratch `test-fitment.js` 31/31; the real 253-row inventory parses
  208 rows fully, the rest partially (make-only) — none wrong after the junk rules.

**Store:** `Inventory.search(q)` also tries `TKS_FIT.parseQuery(q)` → fitting parts first, then text
hits (also matches `fccId`/`chip` text). New `Inventory.forVehicle(veh)` (non-deleted, score-sorted).

**UI (`index.html`):** part form — `#pCategory` is a `<select>` built from `INV_CATEGORIES`
(value `Top/Sub`, the same format the importer wrote, compared via `catParts`; `__other` reveals
`#pCategoryOther`); `#pKeyFields` row with `#pFcc` (shown for `FCC_SUBS`) and `#pChip` + datalist
`CHIP_SUGGEST` (shown for `CHIP_SUBS`); `#pFitment` textarea with live `#pFitPreview` ("Reads as: …",
unresolved entries amber with "?") and the `#pFitAdd` helper (year-from/to + make/model via `TKS_YMM`,
appends "YYYY-YYYY Make Model"). Save: `fccId` (upper-cased), `chip`, `category` from `pCategoryValue()`.
Inventory header: `#invFitBtn` toggles `#invFitBar` (year/make/model selects) → `renderInventory`
filters by `forVehicle` and adds a "N fit 2019 Buick Enclave" chip; `openVinModal` decode now calls
`invFitShow(veh)`. List rows show `FCC …`/`chip …` in the sub line. Register `posPickItem('part')`:
when `posJobType==='automotive'` and `posVeh` has make/model, a green `#piFit` bar pre-filters to
fitting parts (toggle); rows show FCC/chip. Start-a-job `renderResult`: `forVehicle` hits are
prepended to `vanParts` ("name · FCC"). CSV export adds `fccId, chip`. `bittings.html`
`pickInventoryPart(onPick, veh)` gains the same bar; both call sites pass the invoice vehicle
(chat flow: `receipt.vehYear/Make/Model`; quick-invoice modal: the `#qiV*` selects). Importer
`FIELDS`: `fccId` (hints fcc/fcc id) and `chip` (chip/transponder) placed **before** `category` so a
"Chip Type" column is not grabbed by category's `type` hint.

**Owner-data pass (one-off, 2026-11-08):** scratch `propose-cleanup.js` read the live inventory via the
CLI (postgres role, read-only), ran the parser + FCC extraction + chip-token rules + the web research
of 88 FCC IDs (4 agents → `fcc-research-*.json`), and emitted `apply-8h-cleanup.sql` (242 `update`s,
dollar-quoted, fenced by `shop_id`) + a rollback. Rules of thumb: description chip words beat research;
FCCs known to ship with two chips (`DUAL` set) never get a research chip; research is dropped when it
is for a different make *family* than the label (none hit); the distributor's own vehicles come first in
Fits; category is only ever changed on generic "Remote / Fob" rows (112 → Smart Key / Remote Head).
Owner report: repo-root `INVENTORY_CLEANUP_2026-11-08.md`; rollback:
`supabase/phase8/8h_cleanup_rollback_2026-11-08.sql`.

**Verified:** `probe-fitment-ui.js` 21/21 (form toggles by category, preview, add-vehicle helper, save
+ reopen, Other… path, finder 2019 Enclave/Regal yes · 2019 Encore no · 2021 Encore yes, typed
"2019 enclave" + FCC search, Register picker bar + toggle, Start-a-job list); sweep 28 passes 0 JS
errors 0 overflow; live `live-qa-8h.js` 6/6. Known pre-existing noise: demo mode still fires anon REST
calls that 401 (not caused by 8h; a cheap follow-up is to skip the cloud fetch when there is no session).

## 2026-11-07 — Deep review on the new shop PC (TK-Main): findings + 14 fixes

Full checklist with status: repo-root `DEEP_REVIEW_2026-11-07.md`. Environment facts for the next
session: app work happens in the git worktree **`D:\Work\Code\tk-phase3`** (branch
`phase3-frontend-unification`; `D:\Work\Code\turbokeysmith-main` stays on `main` for the website).
No Python on this PC → serve with `node bittings-unified/_devserver.js` (port 8088). Puppeteer +
Chrome-for-Testing + embedded-postgres are installed in the worktree's `node_modules`; QA harness runs
with `NODE_PATH=D:/Work/Code/tk-phase3/node_modules`. `isolation_test.js` refuses to run from an
elevated shell (embedded Postgres won't start as admin) — run it under a non-admin token, e.g.
`runas /trustlevel:0x20000 "cmd /c node …\isolation_test.js > log"` → **33/33 PASS** (2026-11-07).
**Supabase project `gcshuhlksjznksspbigl` resolves NXDOMAIN** (paused) — every cloud-bound check is
deferred until the owner restores it.

Fixes landed (one commit each, all headless-verified; nothing deployed — there is no deploy step):
- `index.html` `views` array gained `'activity','timesheets'` (show() never activated those views).
- `TKS_CAPS.inventoryAdjust` added (owner/manager); the Reconcile tab is ungated, `#rcStart` keeps the
  cap; reconcile list id `rcList` → `rcCountList` (`#view-receipts` already owned `#rcList`).
- `mergeConfig()` whitelists `warranty` (was dropped on every save/load → `Config.warranty()` always
  fell back to `{months:0}`).
- `renderInvReport()` reads `sellPriceCents` (camelCase from `fromRow`), not `sell_price_cents`.
- Native scheduler status label/write `'Cancelled'` → `'Canceled'` (matches `BOOKING_STATUSES`,
  `statusTagHTML`, `isArchived`, `.st-canceled`).
- `posCheckoutThen`: `_posBusy` + `posSetBusy()` in-flight guard; chain starts in
  `Promise.resolve().then(...)` so sync throws release; card/cash paths release via trailing `.then`.
- `bittings.html` Quick-invoice EDIT branch copies `stockApplied/stockAppliedAt/posStockApplied`.
- `pay.js` `call()` returns `{error, network:true}` on fetch rejection; `poll()` retries ≤5 network
  errors, stops when the sheet is closed, and names Transaction History before a retry.
- `timeclock.js` / `billing.js` unwrap `FunctionsHttpError.context.json()` for the server message.
- `?go=` deep link polls until the nav item is shown for the role (never fires for a hidden item);
  `message` listener checks `ev.origin`; `lishi.html`/`programmers.html` icon path.
- `hardware.js` scanner: ignores `e.repeat`; on a detected burst strips the code from the focused
  input (except `#hwScanTest`) and dispatches `input`.
- Contrast: dark `.rep-toggles .on` use the strong colors (chips are white in both themes);
  `.sub.reorder` #9a6a00; dark-theme `--dim` for `.hint/.note/.intro/.empty/.btn.skip` that sit on the
  page bg (`:not()` excludes the white card containers); `#9a9a9a` hints → `#6b7280`; `--ds-3` light
  `#6b7280` / dark `#8a92a0`; `.rep-chartwrap{min-width:0;overflow:hidden}` + `canvas{max-width:100%}`.
- Demo guard: `store.js _demoOn()` and `window.tksDemoOn()` (entry gate + `maybeEnsureShop`) require the
  stored `sb-*-auth-token` user id to NOT be a UUID; `cloud-test.html` removes `tks_demo_mode/role` on
  a successful password sign-in.
- `scheduler.html googleUrl()` invites `TKS.Config.identity().email` (omitted when unset) instead of
  the hardcoded Gmail.
- Launch: `_devserver.js` (Node), `START-BITTINGS.ps1` (server + Chrome app-mode at
  `http://localhost:8088`), `_make-shortcuts.ps1` `Bittings.lnk` → the launcher; Sandbox/Demo remain
  `file://` + own profiles. `tools/qa/audit/` is now gitignored.

### Evening batch (after the owner restored Supabase; owner suspended ask-first until go-live)
Supabase CLI is logged in on this PC (`npx supabase@3.0.0 … --linked`; mutations need `--yes`,
reads `--read-only`). Project linked from the worktree root. QA test-shop logins
(`qa-*@bittings-qa.test`) have a known temp password kept in the session scratchpad only.
- **8a** `pos_restock(receipt)` (manager, fenced, idempotent on `posStockApplied`) — inverse of
  `pos_decrement_stock`; `TKS.POS.restock()`; Reports refund/void calls it on a full refund;
  `applyStockForReceipt`/`reverseStockForReceipt` (bittings.html) + `markInvoicePaid` use the server
  RPCs when signed in (retry "not found" while the row lands), local adjust only offline/demo
  (`TKS.isDemo()`). isolation_test.js now mirrors inventory/locations/units + rollup triggers and
  runs the real 5j/8a text → 42/42.
- **8b** `receipt_mark_paid(receipt, shop, method, captured, surcharge, tax)` service_role-only jsonb
  merge (status/payment/paidAt/docType+number/totals); called by pay-record and the webhook
  `payment_intent.succeeded`. `pos_checkout` = live 5j text with `v_taxrate` from
  `shop_config.tax_rate`. Register `done(j)` prints/shares captured totals; builder Pay Now writes
  payment='Card' + real totals.
- C5: pay-create-intent checks the ledger insert (cancels PI on failure); pay-refund idempotencyKey
  + reported ledger failure; webhook capture failure deletes its event row and returns 500.
- C6: pay-terminal `cancel_intent` (shop-fenced; skips if already captured; row → canceled);
  pay.js/bittings.html `close()` cancels an uncompleted intent; `TKPay.cancelIntent`;
  `posCheckPendingCharges()` banner on Register open.
- **8c** `trg_shop_config_strip_pins` (+ scrub), `shop_members` sm_write dropped + client DML revoked;
  `_shared/auth.ts corsHeaders` omits ACAO when not allowed; store.js managerByPin/hasManagerPin/
  ownerPin retired (always null/false), `TKS.auth.setMyPin`; Settings Access: My PIN card, PIN
  inputs removed (index.html + setup.html).
- **8d** `shop_devices` + `device_register/device_revoke` (manager) + `device_check` (service_role);
  pin-unlock: switch requires deviceId+deviceToken → else 403 `untrusted_device` +
  `machine_switch_refused` audit; timeclock.js `registerDevice/unregisterDevice` (token in
  localStorage `tks_tc_device_id/_token`), Settings Time clock registers + lists/revokes devices.
- **8e** `aal_ok()`; `is_manager()`/`is_owner()` AND aal_ok; `mfa_pending()`; `staff_mfa_status()`;
  `_shared/auth.ts requireRole` enforces aal2 for enrolled managers/owners (403 "authenticator code
  required"); new edge fn **mfa-reset** (owner, same shop, not self, audited). cloud-test.html:
  `mfaView` (challengeAndVerify) + `enrollView` (enroll → QR → challenge/verify; `?enroll=1`;
  skippable via sessionStorage `tks_mfa_skip`); index.html boot redirects when `mfa_pending`;
  Settings Access "My login security" (status/setup/remove + change password via
  `auth.updateUser`); Team logins shows 🔐 2FA + owner "Reset 2FA". pay.js `call()` redirects to
  the login page on the 403.
- Owner temp password set via Auth admin API (service key fetched through the CLI, never written down);
  QA users too. Live QA scripts: scratchpad `live-qa-*.js` (C3/C4 12/12, C6 8/8, 8c 7/7, 8d 11/11,
  MFA 17/18 — the miss is the error wrapper dropping `code`, message is matched instead).
- **8f** inventory engine: `inv_receive` → `unit_receive` for serialized items;
  `trg_inventory_seed_location` (AFTER INSERT on inventory: qty>0 & non-serialized → shop location
  row); `warranty_replace` original lookup `status='sold'` + second replacement needs is_manager;
  `cycle_complete` FOR UPDATE + relative apply (`current on-hand + delta`, serialized = unit count);
  `move_request_approve(p_id)` / `move_request_deny(p_id)` (flip + inv_move in one txn) —
  `TKS.MoveReq.approve/deny`, manager modal uses them; inventory-import.js: cost hints lose
  'price', new `sellPrice` → `sellPriceCents`. Live 10/10.
- **8g** `job_set_status`: same-status no-op; completed/canceled → other = reopen, manager-only,
  audit `job_reopen` with `from`; client `sjSave` rolls the local label back when the server
  refuses. Live 8/8.
- Open after this batch: billing-webhook deploy (go-live); forgot-password flow needs the Auth
  redirect allow-list (dashboard setting); `inventory_safe.serialized`; decrement-sweep for paid
  receipts; hardware.js modal theme.

Known residual (not changed): the probe's "overflow" on Settings/Closeout inputs is placeholder text
scrolling inside inputs that fit (false positive); rgba-tinted pills/badges (`.hi-warr`, Fleet
badges, `.pay-banner`) read as low-contrast to the probe because it treats alpha>0.1 backgrounds as
solid — visually fine; `hardware.js` settings modal is hardcoded dark in both themes (low).

## 2026-07-02 (e) — Inventory import + categories + Inventory/Reports/Returns UI restructure

Owner imported physical inventory (MicroBiz PDF → 352 items) into the REAL Turbo Keysmith shop
(`7a17…1bce`), reversible via `inventory.notes='import:INV-2026-07-02'` (ids `imp_0001..0352`); each
item has one `inventory_locations`(shop) row + `inventory.category='<Top>/<Sub>'` (Keys 252 /
Accessories 100). See memory `inventory-import-microbiz`. Then, per owner UI requests (all in
`index.html` unless noted; each headless-verified in local mode via `sessionStorage.tks_use_local='1'`):

- **Inventory grouped by category — no dropdown.** `renderInventory` now sorts by `INV_TOP_ORDER`
  (Keys, Accessories) then `INV_SUB_ORDER`, and injects always-visible `.invcat-top` / `.invcat-sub`
  section headers (with counts) as the group changes. `catParts()` splits `category` on the FIRST
  '/' only (sub names contain '/', e.g. "Remote / Fob"). Row sub-line no longer repeats category.
- **Reconcile folded under Inventory.** Sidebar `data-go="reconcile"` hidden; `#view-inventory` and
  `#view-reconcile` each got a `.invsubtabs` `[ 🏪 Stock | 🔢 Reconcile ]` control (`[data-invtab]`
  wiring); `show('reconcile')` keeps the Inventory nav highlighted.
- **Reports = tabbed screen.** `.reptabs` bar (`[data-reptab]`, `data-cap="viewAudit"`) across the top
  of `#view-reports`/`#view-commission`/`#view-returns` + NEW `#view-invreport` (`renderInvReport()` —
  live stock retail/cost value + per-category breakdown from `TKS.Inventory`). Tabs: Sales · Inventory ·
  Returns · Commission. Sidebar `data-go="returns"` hidden (folded under Reports); `'invreport'` added
  to the `views` array; Reports nav stays highlighted on invreport/returns.
- **Returns started from the invoice.** `bittings.html` receipt viewer (`#roViewer`) gained a
  **↩ Return** button → `roStartReturn()` (postMessage `tks:start-return` to the parent when embedded,
  else `sessionStorage.tks_start_return` + navigate). `index.html` `tksStartReturnFlow()` + a `message`
  listener + boot check open the Returns tab. **Entry point only** — the deeper behavior (customer
  refund via Stripe pay-refund vs. supplier warranty return via `warranty_replace`, and auto-selecting
  the receipt's item) is a money-touching decision left for the owner (flagged).

Commits `fde9556` (inv grouping + reconcile), `604d659` (reports tabs), `3b5baa6` (invoice return).
On branch `phase3-frontend-unification`. Nothing deployed; local files only.

## 2026-07-02 (d) — Phase 7: shift + machine-lock + time-tracking (OFF by default)

Server (migrations 7a/7b/7c live):
- **7a `time_entries`** — one row per work segment; partial unique index (one OPEN segment per
  user); RLS: staff read OWN (te_sel_own), manager reads shop (te_sel_mgr), RESTRICTIVE tenant
  fence; NO write policies for authenticated (RPC-only). RPCs: `shift_clock_in` (idempotent),
  `shift_clock_out(reason∈lunch/personal/end_of_day)`, `shift_status`, `timesheet_rows` (staff
  hard-scoped to self; manager sees shop), `timesheet_edit` (mgr-only, own shop, writes old→new +
  for_user to audit_log).
- **7b PINs** — `set_my_pin` reworked: any active staff sets own; length by role (staff=4,
  mgr/owner=6); UNIQUE within shop (bcrypt compare); audit `pin_set`. `pin_identify(pin,caller,
  shop)` = lock-screen matcher, **service_role only**, self-throttling (5 fails/5min/machine via
  the `pin_fail` audit rows). `timesheet_travel` derives en_route→on_site pairs from the existing
  `job_status` audit events (no new tracking).
- **7c** — grant service_role INSERT on audit_log (for machine_switch rows).
- **isolation_test.js → 33/33** (adds time_entries probes: staff-own-only, manager-shop/zero-of-B,
  no-direct-edit (RPC-only), one-open-segment unique).

Edge fn **pin-unlock** (deployed): called with the LOCKED session JWT → shop known server-side.
same user → {mode:unlock}; different teammate → {mode:switch} minting a magiclink token_hash the
client verifies (verifyOtp) to become them — allowed only if they have an open shift, except a
6-digit manager/owner PIN which always switches (client clocks them in after if needed); wrong →
401. Every switch writes a `machine_switch` audit row. Distinct from override-approval (never
comes here, never switches).

Client:
- **app/timeclock.js** (`window.TKS_CLOCK`) — armed only when Config.timeclock.enabled AND the
  per-device localStorage `tks_tc_device` are BOTH on (both default off) AND signed in. Full-screen
  lock overlay (PIN pad + clock-out buttons + full-logout escape); auto clock-in on connect; idle
  timer; lockNow(); switch via verifyOtp then reload. Inert when off (no overlay, no listeners that
  matter).
- **store.js**: config schema gains `timeclock{enabled:false,idleMin:5}` (merge whitelists keys —
  required for the toggle to persist). **Exposed `global.TKS._sb = _sb`** — latent bug: it was
  private, so inventory-traceability/tier/timeclock all got undefined and fell back to "sign in
  first" while signed in.
- **index.html**: Settings "Time clock & lock" step; sidebar Lock-now (armed-only) + Timesheets
  nav; `#view-timesheets` + renderTimesheets (staff own / mgr all + ✎ edit modal → timesheet_edit)
  + travel section.

Live-verified on the QA shop: RPC suite 10/10, PIN rules (4/6/unique) + identify + throttle,
pin-unlock all paths incl. real token→session switch, Timesheets manager(5 rows/edit/travel) vs
tech(own 3/no-edit/no-filter). Headless-unverifiable (flagged): real idle timing, on-screen PIN
pad, shared-PC switch, clock-out→login on the shop machine. QA PINs: tech 1234 · manager 246810 ·
front-desk 4321.

## 2026-07-02 (c) — overnight pre-pilot build: the whole review list executed

Owner authorized the full `PRE_PILOT_REVIEW.md` run. 16 commits (96c9dbb…e436001), each verified;
isolation test extended to **29/29** (adds 5g shop_config probes). Migrations applied live:
- **5g** shop_config per-shop (id sequence + unique shop_id; store.js Config keys by shop)
- **5h** service_role staff DML (for staff-invite)
- **5i** current_subscription/shop_tier/seat_usage scoped by current_shop()
- **5j** ALL DEFINER RPCs shop-fenced (21 fns; also commission_config → per-shop; pos_checkout +
  warranty_replace read shop_config per-shop; inv_receive gained an item-exists guard)
- **5k** commission_day_rows: front_desk → empty (owner decision; tech already self-forced)
- **5l** audit_log SELECT grant (RLS still gates: is_manager + shop fence)

Edge functions: **staff-invite** (NEW: owner-gated temp-password invites), **billing-checkout**
(rewritten onto _shared auth, shop-scoped, stripe@16), **billing-portal** (NEW), **pay-terminal**
(server-side Connect account), **pay-create-intent/record/status** (shared CORS allow-list).
⚠️ `billing-webhook` is still NOT deployed; STRIPE_PRICE_* envs unset — billing go-live items.

Client: Team-logins card (Settings→Access) · Commission gating (front_desk hidden nav+view+demo
path; tech self-scope incl. demo) · 390px overflow fixes · AA contrast via theme-aware classes
(reports/closeout cards are WHITE in both themes — dark override must NOT re-apply dark palette)
· 📦 invReceiveUnits modal (+ row button) · 📜 view-activity (owner-only) · thermal.autoPrint pref
+ guarded print in posCheckoutThen done() (captured BEFORE posClear; fire-and-forget) ·
missing-cost chip in invSummary · billingPortalBtn (Settings→Payments). QA fixture data added:
subscriptions row for the QA shop (pro), `qa_serial_demo` item (serialized, 2 units).

## 2026-07-02 (b) — pre-pilot review: 5f EXECUTE hygiene + small fixes (see PRE_PILOT_REVIEW.md)

Repo-root `PRE_PILOT_REVIEW.md` holds the full findings (security / missed / redundancy / quick
wins) with 🔴🟡🟢 decisions for the owner. Code/DB changes this session (one commit each):

- **`phase5/5f_revoke_public_function_execute.sql`** (applied live as
  `phase5_5f_revoke_public_function_execute`): revoked PUBLIC/anon EXECUTE on the 15 functions
  the linter flagged — trigger fns fully revoked (`payment_txn_stamp_shop`,
  `payment_event_stamp_shop`, `fn_units_rollup`, `sync_staff_member`, `touch_updated_at`);
  client RPCs keep `authenticated` (`create_shop`, `current_shop`, `shop_tier`, `seat_usage`,
  `tier_allows`, `require_tier`, `strip_receipt_costs` — the last one because `receipts_safe`
  is security_invoker); server-internal helpers to service_role only (`current_subscription`,
  `inv_on_hand`); dropped leftover `_sweep_1b`. Isolation test extended with a post-revoke
  trigger probe → **25/25**; live-verified (anon = permission denied, QA-owner session works,
  touch trigger fires). Linter: zero anon-executable fns remain.
- **isolation_test.js is now portable** (temp-dir pgdata via `PG_DBDIR`, embedded-postgres
  resolved relative to repo root — was hardcoded to the old shop PC).
- **Customers edit/merge bumps `updatedAt`** (+ `createdAt` on new rows) in `index.html`
  (QA audit item; cloud trigger already did it server-side — local now matches).
- **Reconcile: “✕ Discard count” button** (`#rcCancel` in index.html + handler in
  `inventory-traceability.js`) wires the previously caller-less `cycle_cancel` RPC
  (manager-gated, confirm-first). Live QA-shop round-trip verified.
- Cosmetic/dev: `favicon.ico` added (404 noise), stale “cost not wired” comment corrected
  (pipeline verified 2026-07-01), unused `acorn`/`acorn-walk` dropped from package.json.

## 2026-07-01 — live payment verification (TEST mode) + Phase 5c fix (`service_role` tenant grant)

First true end-to-end exercise of the Stripe payment path through the **live edge functions** (test
mode, Teal Jumper account `acct_1SDsyb6E7RKZhKYS`), run against an **isolated QA test shop**
(`shop_id dddddddd-…-dddddddddddd`, users `qa-owner/manager/tech/frontdesk@bittings-qa.test`).

- **🔴 Blocker found + fixed — `phase5/5c_service_role_tenant_grant.sql`.** Every `pay-*` function
  returned **503 "tenant service unavailable"**. Root cause: `_shared/auth.ts` `requireRole()`
  resolves the caller's tenant as `service_role` via `admin.from("shop_members").select("shop_id")`,
  but Phase 5a granted SELECT on `shops`/`shop_members` to **`authenticated` only** — never
  `service_role`. Proven via `has_table_privilege('service_role','public.shop_members','SELECT') =
  false`. Fix = `grant select on public.shops, public.shop_members to service_role;` (applied live as
  migration `phase5_5c_service_role_tenant_grant`; exposes nothing new to clients — service_role
  already bypasses RLS everywhere else). Latent because the isolation test hits RLS via SQL (not the
  functions' service_role path) and no card charge had ever run through the live functions.
- **Verified (Stripe test ledger via MCP + `payment_transactions`/`payment_events`):**
  `pay-create-intent` (manual-capture PI, base+2% credit surcharge computed server-side) → card
  confirm (`tok_visa`/4242, publishable key, client-side like Stripe.js) → **webhook** captures on
  `amount_capturable_updated` (funding read = `credit` → surcharge applied; `card_funding`/`card_brand`
  stamped) → `succeeded`. `pay-refund` full (5100) and partial (1000) both `succeeded`; `pay-record`
  cash/check (Stripe-free) → `pay-void` flips to `refunded`. Refund/void role-gated to manager/owner.
- **🟡→✅ FIXED — partial refund mis-recorded (`phase5/5d`).** `pay-refund` used to set
  `status='refunded'` for any amount with no per-txn refunded total, so a **partial** refund read as
  **fully refunded** and net-collected was wrong. Fix: new `refunded_cents` column (migration
  `phase5_5d_partial_refund_tracking`); `pay-refund` now accumulates it, blocks over-refund past
  `captured_cents`, allows re-refunding a `partially_refunded` row, and only marks `refunded` when
  fully refunded (else `partially_refunded`); `pay-void` stamps `refunded_cents = captured_cents`;
  `index.html` Closeout + Transaction History net math reads `captured − refunded` and shows partials.
  Verified in the test shop: $40 charge → $15 partial (→`partially_refunded`, refunded 1500, over-refund
  blocked) → remainder (→`refunded`, refunded 4080). pay-refund v10 / pay-void v8 redeployed.
- **Harness:** roles signed in via `signInWithPassword` (real JWTs); write-paths driven through the
  same RPCs `store.js` calls. Test shop + QA logins are **left in place** for the owner's device sweep
  (card-entry UX on a real phone) — tear down only on the owner's say-so.

## 2026-07-02 — Inventory traceability (Phase 6): serialized units + reconciliation + returns

Server-first, all on the test shop; real-shop data untouched (nothing serializes until received).
Coexistence design (no rip-and-replace): units drive `inventory_locations.qty` via a rollup trigger
so every existing screen keeps working. Migrations `phase6/6a–6e` (applied live + repo files).

- **6a** `inventory_units` (serial id, supplier, batch, unit_cost, location, status
  `in_stock/sold/warranty_out/failed/lost/written_off`, `sold_receipt_id`/`sold_customer_id`,
  **`fitment jsonb` reserved for future per-unit vehicle fitment**) + `inventory.serialized` flag +
  `fn_units_rollup` trigger. RPCs `unit_receive` (front_desk+, flips serialized + converts existing
  qty→units), `unit_move` (tech+), `unit_set_status` (mgr+). Tenant-fenced + role-gated.
- **6b** `inv_move`/`inv_adjust`/`pos_decrement_stock` made **unit-aware** for serialized items
  (non-serialized path byte-identical). A sale marks a unit `sold` + links receipt/customer.
- **6c** cycle count: `cycle_counts`+`cycle_count_lines`; `cycle_start`(mgr+, assignable),
  `cycle_save_line`(assigned staff or mgr+; preset reason required for assigned staff on non-zero
  delta, optional for owner/mgr), `cycle_complete`(mgr+ → `inv_adjust`). `inv_on_hand()` helper.
- **6d** `supplier_returns`; `warranty_replace` (verify off original sale + warranty months → issue
  `warranty_out`, log defective key supplier-tagged+customer-linked), `key_failed` (no customer),
  `return_update` (mgr+: needs_return→sent→credited/replacement_received).
- **6e** `inventory_dashboard()` (mgr+): retail+cost of stock, warranty/failed/return counts.
- **Verified (real cloud sessions, test shop):** receive/move/adjust/sale 7/7; cycle count 8/8;
  warranty/failed/returns/dashboard 7/7. Harnesses in the session scratchpad.
- **Fitment hook:** `inventory_units.fitment` null now; `inventory.fitment` is the item default.
  Later per-unit fitment writes to `units.fitment` (serial→item→fitment join) with no schema change.
- **UI (Phase 5) — BUILT** (`app/inventory-traceability.js`, cloud-only, wired to the RPCs — engine
  not rebuilt): Reconcile screen (`#view-reconcile`, nav 🔢 — −(X)+ per item, manager assign/start,
  preset reason on discrepancies, Finish→cycle_complete summary; assigned staff auto-resume);
  Returns list (`#view-returns`, nav ↩ — Open/Warranty/Failed/Resolved/All, manager advance buttons);
  Inventory dashboard cards (`#invDash` on Inventory — retail/cost/warranty/failed/returns counts,
  mgr+); 🛡️ Warranty + ⚠️ Failed buttons on inventory rows (modals pick original sale / location /
  reason → warranty_replace / key_failed). Verified headless: boots with no console errors, functions
  defined, renders light+dark. **Live signed-in flow pending the owner's phone sweep** (the app shell
  can't be driven signed-in headless).

## 2026-07-01 (b) — Stripe Connect: per-shop payouts + 1% platform fee (TEST, verified)

Each shop now connects its OWN Stripe (Express) account and gets paid directly; customer card
charges are **destination charges** on the platform with a **1% application fee** to Bittings and the
**shop as merchant of record** (`on_behalf_of` → the shop bears Stripe's processing fee). Decisions
(owner): connected shop pays Stripe fees; status stored on `shops`; build server-first.

- **DB `phase5/5e`:** `shops` gains `stripe_connect_id`, `connect_charges_enabled`,
  `connect_payouts_enabled`, `connect_onboarded_at`. Column-level grant: owners may UPDATE only
  `name` — the connect_* flags are **service_role-only** (can't be spoofed to enable card charges).
- **`connect-onboard` (rewritten, deployed v1):** owner-gated + **shop-scoped** via `_shared/auth.ts`
  (replaces the old mis-scoped "latest subscription" version); creates/retrieves the shop's Express
  account, stores it on `shops`, caches live `charges/payouts_enabled`, returns the hosted onboarding
  link. Verified: creates a real Express account + link.
- **`stripe-webhook` (v6):** new `account.updated` handler caches the shop's connect flags.
- **`pay-create-intent` (v11):** resolves the shop's connected account SERVER-SIDE (ignores client
  input); **blocks card with 409 `connect_required`** when the shop isn't charge-enabled (cash/check
  still work via pay-record); on a connected shop creates a destination charge with
  `application_fee_amount` (tier-based since 8z36: Starter 1%, Pro 0%; `shops.platform_fee_bps` pins a shop to its own rate — Turbo Keysmith LLC is pinned to 1%), `transfer_data.destination`,
  and `on_behalf_of`. Stores `connected_account_id` on the txn.
- **`pay-refund` (v11):** for Connect (destination) charges, refunds on the platform with
  `reverse_transfer` + `refund_application_fee` (pulls money back from the shop + returns our fee).
- **UI (`index.html`, Settings → Payments):** "Card payouts — your Stripe account" card with a live
  status (✓ Connected / Setup incomplete / Not connected) + an owner-only Connect button
  (`TKS_refreshPayoutStatus` reads `shops`; `TKS_BILLING.connectOnboard`). The full Settings card's
  on-screen render is pending the device sweep (headless app-shell cloud-connect couldn't be driven).
- **Card button gated when not connected (both pay surfaces):** the **Register** (`index.html`
  `posLoadCardConnected`/`posRender`, `#chgCard`) shows a disabled **"💳 Connect Stripe to take card"**
  instead of erroring on tap; the invoice **Pay Now** (`bittings.html` `openPayNow`) blocks with a
  "Connect Stripe to take card" alert. Cash/check unaffected. `posCardConnected===null` (local/offline
  or unknown) leaves card shown — the gate only fires on a known-not-connected cloud shop. Register
  gate render **verified headless** (not-connected → disabled connect label; connected → normal).
- **Verified end-to-end in Stripe (test) + DB:** onboard → create Express acct + link; card blocked
  while not enabled (409); then (test shop pointed at Stripe's pre-enabled test connected account)
  $60 charge → PI `application_fee_amount=60`, real `application_fee` + `transfer` to the connected
  account, `on_behalf_of` (shop bore the $2.07 Stripe fee), credit surcharge applied → full refund
  reversed the transfer + fee. `livemode:false`.
- **Env note:** `connect-onboard` uses `APP_URL` for the onboarding return links (defaults to
  `app.turbokeysmith.com`); set it + add `account.updated` to the webhook events for production.
  The old repo-only `stripe_connect_id` on `subscriptions` (phase4/4b) is superseded by `shops`.

## 2026-06-29 — repo reorg: app consolidated under `bittings-unified/`, stale copy archived
- **`bittings-unified/` is now the single app home.** Loose app docs that lived at the repo root moved to
  **`bittings-unified/docs/`**; one-off dev/data/pitch tooling moved to **`bittings-unified/tools/`**
  (`_gen_ilco.js` + `_ilco_extract.py` + `_ilco_extracted.json`, `_vehicle_audit.js`, `_devserver.py`,
  `_pitch-seed.js`/`_pitch_moat.py`/`_pitch_shots.py`, `pitch-screenshots/`). All moved via `git mv` —
  history preserved.
- ⚠️ **The `tools/` scripts still hardcode the old `bittings-app/` path** (e.g. `_vehicle_audit.js` →
  `bittings-app/app/lishi-seed.js`; the pitch scripts → `…/bittings-app`). They were already stale relative
  to the active tree and are **not auto-fixed** — repoint them to `bittings-unified/` before re-running.
- **The stale earlier app copy is retired to `_archive/`** (`_archive/bittings-app/` + `bittings-app.zip`).
  Don't edit under `_archive/`. The live app (`index.html` + `app/*.js` + `supabase/`) was untouched and
  references none of the moved files (verified) — nothing in the running app broke.
- **Website-only docs** (`DEPLOY_CLOUDFLARE.md`, `SITE_PAGES_AUDIT.md`) moved to `website/`. The root
  deploy wrapper `_deploy-website.sh` **stayed at root** (it resolves `$HERE/website/site` + `$HERE/.secrets`
  relative to its own location — moving it would break those paths).
- Shop-PC parity work (hardware module + shop-scoped payment edge functions) committed & pushed first, as a
  separate commit, so the reorg lands as renames-only.

## 2026-06-26 22:00 CST — repo: Git installed on the new PC, full GitHub backup
- The new PC had **no Git CLI installed** (it's at `C:\Program Files\Git\cmd\git.exe`; a fresh shell will have it
  on PATH). All recent work (NASTF/D1, Ilco import, demo, blog #2, 20+ edited files) was **uncommitted**.
- Committed that batch to `phase2-pos-commission` and **pushed every local branch to `origin`**
  (`github.com/turbokeysmith/bittings`). Before today only `main`/`repo-cleanup` existed on the remote; now
  `phase1-roles-security`, `phase2-pos-commission`, `app-structure`, `public-website`, `restructure` are all there too.
- `.gitignore` now excludes `.wrangler/` (Cloudflare deploy cache) and `bittings-app.zip` (regenerable demo bundle).

## 2026-06-26 PM — self-contained demo + warranty/Reports fixes
- **Reports toggles:** the metric pill click handler (`renderRepToggles` in `index.html`) now calls
  `renderRepToggles()` as well as `renderReports()`, so the pill's `.on` state re-renders on each click (it was
  desyncing from `tks_report_metrics`).
- **Warranty on the live Receipts viewer:** `roRenderList` (the `.ro-` read-only list, the screen actually shown)
  had no warranty pill. Added `warrantyPillCompactHTML(r)` into `.ro-top` (between `.ro-num`/`.ro-amt`) and the full
  `warrantyPillHTML(r)` into `.ro-badges`. `.hi-warr` CSS was un-scoped from `.hist-item` so it works in both lists.
- **Warranty colors / math:** both pill fns now use dark-orange `#c2410c` for the ≤30-day state (green / dark-orange
  / red). Demo warranty is **6 months** and `warrantyUntil = addMonths(jobDate, 6)` (consistent with the doc date);
  service-only jobs get `warranty:false`.
- **Demo seed rewrite (`START-DEMO.html`):** one loop over `DAYS_AGO` (30 entries, ~today→196d) builds a receipt and
  (for paid ones) a matching `tks_demo_txns` row, so Receipts/Reports/History/Closeout/Commission are consistent.
  Some receipts get `nastf:{type,d1Days,d1DueDate,d1Filed,...}`. Also seeds `tks_demo_vans` (3), `tks_demo_staff`
  (5, with `user_id`s matching the txn `tech_id`s), inventory split across `shop`/`van:van_N` via a per-item `locs`
  array, and `tks_vin_cache` (5 VINs).
- **Demo data layer (`app/store.js`):** added `_demoOn()/_demoGet/_demoSet/_demoOk` + `_demoCommissionRows` +
  `_demoNastfWorklist`. Each cloud-only read (TKS.Fleet.list/staff/save/setStatus/remove, TKS.Commission.config/
  saveConfig/dayRows/awaitingSignoff, TKS.NASTF.worklist/setFiled/canFile, TKS.InvOps.locations/move/receive/adjust)
  short-circuits to seeded local data when `tks_demo_mode==='1'`. `app/pay.js` `dayTransactions()` already does the
  same for `tks_demo_txns`. **All guarded by the flag → inert in production.**
  - Commission demo math: 8% of (base − tax) per tech/day with a $150/day minimum.
  - VINs: `1FTEW1EP5JFA12345` 2018 Ford F-150 · `4T1B11HK5KU123456` 2019 Toyota Camry · `1HGCV1F34JA123456` 2018
    Honda Accord · `3GCUYDED5LG123456` 2020 Chevy Silverado · `1N4AL3AP5GC123456` 2016 Nissan Altima.

## 2026-06-26 — desktop launchers, Settings rail, warranty-on-tiles, demo Reports
- **Desktop shortcuts:** `bittings-app/_make-shortcut.ps1` (run via `Create Desktop Shortcut.bat`) creates
  **two** `.lnk` files on the Desktop pointing at `chrome.exe` with
  `--app="file:///…/index.html"` and `--app="file:///…/START-DEMO.html"`, each with its own
  `--user-data-dir` (`%LOCALAPPDATA%\TurboKeysmith\{app,demo}-profile`) for storage isolation, icon =
  `Bittings.ico`. App mode = frameless. Falls back to Edge if Chrome is absent. No server needed (app runs
  from `file://`); the separate profiles are what keep the demo seed from clobbering real data.
- **Settings left-rail:** `setup.html` `render()` now emits `.setupShell` = `.setupRail` (vertical category
  list, mirrors the app's `.bt-sidebar`/`.bt-nav__item`, one emoji icon per `STEPS[]` entry via the new `ic`
  field) + `.setupBody` (panel + step nav). Responsive: ≤620px the rail becomes a compact 64px icon+label
  column. The old `.chips` markup is gone (its CSS lingers, unused). Step nav button ids unchanged.
- **Warranty on receipt tiles:** `bittings.html` adds `warrantyPillCompactHTML(r)` (short "Nd left"/"Expired"
  pill, class `.hi-warr`) injected into `.hi-top` between `.hi-num` and `.hi-amt`. The original full pill below
  the description is **kept** (both show).
- **Demo Reports fix:** Reports/History/Closeout read `TKPay.dayTransactions()` → cloud `payment_transactions`,
  which the offline demo can't reach. `app/pay.js` `dayTransactions()` now short-circuits to a local
  `tks_demo_txns` array (date-filtered) **when `localStorage.tks_demo_mode === '1'`**. `START-DEMO.html` sets
  that flag and seeds ~90 days of transactions (row shape matches the cloud table) + varied warranty dates on
  the seeded receipts. Production never sets the flag, so the branch is inert outside the demo.

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

## Update 2026-06-24 — Ilco 2025 dataset import + lookup wiring; chrome theme unified
- **`app/ilco-2025.js`** — `window.TKS_ILCO_2025` = 1,642 `{mk,md,ys,ye,s,c,k}` records, **extracted from the owner's 2025 Ilco Auto/Truck PDF** via `_ilco_extract.py` (pdfplumber table extraction; make from the Model Index; deduped) → `_ilco_extracted.json` → `_gen_ilco.js` → the JS file. Validated: MKZ/Silverado/F-150 match the prior seed. Loaded in `index.html` after `lishi-seed.js`.
- **`codeSeriesFor(make,model,year)`** (index.html Start-a-Job) now checks the curated seed `codeSeries` first, then `TKS_ILCO_2025` with a normalized fuzzy model match (`_nmod` strips non-alphanumerics). Returns `{series,card,note,keyway}`. `renderResult` uses it for the **Code series** cell (independent of any keyway record) **and** as the **keyway** fallback when there's no Lishi record. `matchVeh` no longer returns a different model's record when the named model is absent (returns null → "verify").
- Coverage: ~70% of the 343 catalog model-lines now resolve to a code series. `lishi-seed.js` exposes `codeSeries` on `TKS_LISHI_SEED`. Re-extract by re-running `_ilco_extract.py` + `_gen_ilco.js` on a newer PDF.
- **Chrome theme** — `bittings.html` header (`#fbfcfd` light / `#1f232a` dark) + `#appnav`, and `scheduler.html` `--header-bg/--header-fg` now follow light/dark instead of always-dark. Role chip (`access.js #tks-role-chip`) moved from top-right to bottom-left (was covering header buttons).

## Update 2026-06-23 — Receipts viewer → HTML render; PDF wrap fix; RO bottom-nav pin
- **In-app viewer now renders HTML, not a blob-PDF iframe** (iOS/Android iframes showed the blob PDF blank → "View does nothing"). `renderReceiptCard` was split into **`buildReceiptCardHTML(r, actionsHTML)`** (returns the `<div class="receipt-card">…</div>` string) + a thin `renderReceiptCard(r)` chat wrapper. `roOpenViewer(r)` injects `buildReceiptCardHTML(r)` into `#roViewerDoc`; **Download** = `makePDF(r,'en',false)` (saves), **Print** = `makePDF(…,true)` → `window.open(blobUrl)`. Removed `#roViewerFrame`/`roViewerBlob`/`roViewerUrl`. The card shows sell prices only (no cost leak). 
- **PDF bill-to wrap fix** — `makePDF` `bl()` now `splitTextToSize(…,260)` and advances `yy` by 15×lines, so a wrapped Address no longer overlaps the VIN/next field.
- **RO bottom-nav** — `body.ro-mode #roWrap{flex:1 1 auto;min-height:0;overflow-y:auto}` so `#appnav` stays pinned to the bottom (was floating to mid-screen because the block didn't fill height). Removed the floating `.ro-viewcue` (overlapped the `.ro-amt` dollar value).

## Update 2026-06-23 — Mobile audit fixes (Receipts setup removed, theme sync, stock overflow)
- **bittings.html `boot()`** — removed the welcome/setup gate. Now: `SETTINGS = getSettings()||DEFAULT`, then `hydrateIdentityFromConfig()` (pulls name/address/phone/email/license/logo from `TKS.Config.identity()`), `saveSettingsObj(SETTINGS)` to cache, then `RO_RECEIPTS?roOpen():startInterview()`; also `TKS.Config.load().then(re-hydrate)` for async cloud config. The `#welcome`/`firstRunSetup()` path is now unreachable (identity is owned by the main-app Setup wizard). Fixes "set up business again" + the RO Receipts tab no longer falls into chat mode.
- **cloud-test.html** — added the pre-paint theme script + `html[data-bt-theme="dark"]` var overrides (`--bg/--card/--edge/--ink/--dim`, `color-scheme:dark`). Was always-light → caused the "light login in a dark app" mismatch.
- **index.html inventory toolbar** — `.bar` gained `flex-wrap:wrap`; `@media(max-width:600px)` makes `.bar .search` full-width and `.bar .add` wrap/share rows. Was overflowing on phones (search + Import/Export/VIN/Add in one nowrap row → forced zoom-out).
- **index.html stock modal** — `#stkCard select,#stkCard input{width:100%;min-width:0;max-width:100%}` (themed); the Move grid is now `.mv-grid` (`1fr auto 1fr`) that collapses to one column under 480px (`.mv-arrow` hidden).
- **Verified:** viewport meta present on all pages (lishi included — earlier audit note was wrong). scheduler.html follows `bt_theme` but sets `data-theme` (its own CSS namespace) — functionally tracks the global theme; left as-is. No service worker, so files served fresh. Register stays `pos-desktop-only`; Receipts viewer/NASTF/D1 + themed pop-ups are mobile.

## Update 2026-06-23 — Dashboard dark-mode fix + pop-up sweep finished (index/bittings/setup)
- **Dashboard dark mode (`index.html`):** `[data-bt-theme="dark"] #view-dashboard .dash` overrode the `--ds-*` vars but not the base `background:#f6f7f9` → added `background:#14171b`. `dashKpiCard` puts its accent on `.kpi-num`; "Jobs" + "Avg ticket" passed hardcoded `#14171b` (dark-on-dark in dark mode) → now `var(--ds-ink)`; "Tax collected" → `var(--ds-2)`. Colored KPIs (green/blue/red) unchanged.
- **Pop-up sweep to 0 native dialogs** in `index.html`, `bittings.html`, `setup.html`:
  - `index.html`: all remaining `alert()` → `uiAlert` (job/invoice-open errors, importer, deposit copy, PDF-not-loaded, refund). 0 native `alert/confirm/prompt`.
  - `bittings.html`: added **`appPrompt(title,opts)`** (showModal-style input); converted all `alert()`→`appAlert` and both `prompt()`→`appPrompt` (model-typing, quick-invoice manager PIN). 0 native (excluding the embedded jsPDF lib internals).
  - `setup.html`: `appAlertLite(t,m)` is now a themed centered overlay (`--card`/`--ink`/`--edge`) instead of `alert()`.
  - **Still native (deferred — fold in when next editing):** `programmers.html`, `lishi.html`, `scheduler.html`, `cloud-test.html`.

## Update 2026-06-23 — Register "Other" items + themed pop-up sweep
- **"Other" (unlisted) part/service (`index.html`):** picker `otherBtnHTML()`/`wireOther()` add an **➕ Other** row → `posOtherEntry(kind, svcType)` (themed modal: name + price + taxable). Adds a **custom line** (`type:'custom'`, `lineType` = `'part'` or `posInferLineType(name)` → programming/labor/service). `posBuildPayload` else-branch now emits `{type:'custom', desc, priceCents, qty, taxable, lineType}`.
- **Server (`phase2_pos_checkout_other_lines`):** `pos_checkout` else-branch **no longer manager-gates** a custom/Other line (any staff may set a price for an unlisted item — needs `priceCents>0`; honors `lineType`; maps `'custom'`→`'service'`). Discounts + changing a **set** catalog price stay manager-only.
- **Save-to-catalog:** `maybeOfferSaveService(name,cents,cat,taxable)` — themed offer with a **"Don't ask again"** checkbox → `TKS.Config.save({prefs:{offerSaveOtherService:false}})`. Saving appends `{value,en,cat,price,taxable}` to `cfg.services`; **cat = `automotive`|`residential`** per the picker tab so it re-lists correctly. Config: `prefs` group added (defaults/merge/save-group/`Config.prefs()`).
- **Themed pop-up sweep (`index.html`):** `uiConfirm`/`uiPrompt`/`uiAlert`/`uiAskPriceCents` (built on `.chg-modal-ov`/`.chg-modal`, centered, `var(--card)`/`var(--ink)`; exposed on `window`). Replaced native `prompt`/`confirm` in: posEditLinePrice, posCustomLine (→ `posOtherEntry('service')`), posDiscountPrompt, posClear, pinPrompt, mark-paid, `commSignoff`, service-delete. **0 interactive native dialogs** remain in index.html; a few rare error `alert()`s kept. Verified all custom overlays centered + themed (`--surface-*/--text-*` ≡ `--card/--ink/--dim/--edge` via `app/ui/bittings-ui.css`); bittings `showModal`/`appAlert`/`appConfirm` already centered/themed.

## Update 2026-06-23 — NASTF consolidation + D1 filing-deadline tracking (Phase 2 tweak)
Branch `phase2-pos-commission`. SQL: `bittings-app/supabase/phase2/2e_nastf_d1_tracking.sql`. Shared badge: `app/d1.js`.
- **Data shape:** a NASTF receipt carries `data.nastf = {type, d1Days, d1DueDate:'YYYY-MM-DD', d1Filed, d1FiledAt?, d1FiledBy?, d1FiledByName?}`. Window = `shop_config.data.nastf.d1Days` (default 5). Countdown anchor = the receipt date; cleared when `d1Filed`.
- **Server (all SECURITY DEFINER, self-enforcing — standard pattern, WARN-only advisor):**
  - `pos_checkout` stamps `data.nastf` when `payload.nastf` (the D1 type) is set, reading `d1Days` from config (`d1DueDate = current_date + d1Days`).
  - `can_file_d1(receipt)→bool` — job-scope: `is_manager()` OR `technicianId == auth.uid()` (walk-up POS seller) OR in `job_staff` for `data.bookingId`.
  - `set_d1_filed(receipt, filed)` — gated by `can_file_d1` (raises otherwise); merges into `data.nastf`; audit `d1_filed`/`d1_unfiled`.
  - `nastf_worklist(include_filed)` — shared worklist, `order by d1_filed asc, d1DueDate asc nulls last`; each row carries `can_file`.
- **`TKS_D1` (`app/d1.js`):** `badge(nastf)`/`pillHTML(nastf,opts)` — color ladder ≥4 green · 3 yellow · 2 orange · 1 red · ≤0 dark-red (pulse). Loaded in `index.html` + `bittings.html`.
- **Data layer (`store.js`):** config `nastf.d1Days` (defaults/merge/save group + `Config.nastf()`/`Config.d1Days()`); `TKS.NASTF.worklist/setFiled/canFile`.
- **Register (`index.html`):** `posNastf` state + `#posNastfSeg` selector inside the Automotive vehicle panel; `posSetNastf`/`posRenderNastfBadge`; `posBuildPayload` sends `nastf`. `@keyframes d1pulse`.
- **Builder (`bittings.html`):** `stampD1Nastf(info, prior)` in `finish()` stamps the deadline on a saved NASTF receipt (preserves prior deadline/filed on re-save).
- **Read-only Receipts (`bittings.html?receipts=1`):** `RO_RECEIPTS` flag suppresses `startInterview()`/builder (`body.ro-mode` hides `#chat`/`#inputbar`/History btn); `#roWrap` with `[All|NASTF]` tabs (`roSetTab`/`roRenderAll`/`roRenderNastf`), search, D1 pills, and the **D1-filed checkbox** (enabled per `can_file`; calls `TKS.NASTF.setFiled`). All/NASTF are **view/search/reprint only** (Send/PDF reuse `shareDocument`/`makePDF`; no New/edit/charge/delete). `TKS.onChange` re-renders All on cloud sync. Nav "Receipts" (sidebar `data-embed` + phone bottom-nav `data-open`) → `?receipts=1`; **Start-a-Job still opens the builder** (`bittings.html`, no param). `openEmbed` cache-bust now uses `&` when the URL already has a query.
- **In-app invoice viewer (`bittings.html`, RO mode):** tap a row's `.ro-open` → `roOpenViewer(r)` builds the PDF via `makePDF(r,'en',false,true)` (returns `{blob,filename}`), `URL.createObjectURL` → `#roViewerFrame` iframe (inline, **no download**). `#roViewer` modal: Print (`iframe.contentWindow.print()`, fallback `window.open(blobUrl)`) · Download (`<a download>` the blob) · Close (Esc/backdrop). Legacy receipts get `totals`/`items` rebuilt first (same as `renderHistList`). Object URLs revoked on close. **Role-safe by construction:** `makePDF` renders `it.amount` + sell-side totals only — **cost/margin never appear in the PDF**, so any role can view. Row actions: View · Send (customer copy share) · PDF (ES).
- **Setup (`setup.html`):** Payments step gains "NASTF D1 filing window (days)" → `cfg.nastf.d1Days`.
- **Verified server-side** (owner + technician test users): config-driven deadline (window=3 → due today+3); job-scoped filing (manager + seller PASS, non-assigned tech BLOCKED); worklist urgency sort + per-row `can_file`. No new ERROR advisors.

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
  `<h1>`) and `#btWorkspaceName` (sidebar workspace line) to `bizName()`; `document.title` is the hardcoded
  product brand `'Bittings'` (window/tab = product chrome, not the shop — same rationale as the sidebar mark);
  `#appLogo` (top header
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
  `SETTINGS.logoCustom` (set true when the owner uploads a logo). (`bittings_logo.png` — a retired,
  unrelated doc+key "Bittings" receipt-app icon — was removed; the real product mark is `app/ui/assets/mark.svg`.)

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

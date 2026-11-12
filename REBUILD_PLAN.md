# Bittings speed + cleanup rebuild — plan and status

Started 2026-11-11 (late evening) at the owner's request. This file is the hand-over: any assistant can continue from it.
Keep it current — update the **Status** column when an item moves.

## How to go back to the working version

The app as it was live on the evening of 2026-11-11 (version `6623fee58da2`) is saved three ways:

- git tag `working-2026-11-11` and branch `backup/working-2026-11-11` (commit `9dbc263`)
- zip: `D:\Work\Backups\tk-phase3-working-2026-11-11.zip`
- to put it back live: `git checkout working-2026-11-11 -- bittings-unified website/site/staff`, then
  `node website/_tools/publish-staff.mjs && node website/_tools/deploy-site.mjs && node website/_tools/deploy-app.mjs`

Nothing in this rebuild changes the database, so going back is only a matter of the files.

## What the owner asked for (2026-11-11, in his words, condensed)

1. "This is extremely slow" — go through the whole thing, remove redundant things, one list for inventory / receipts / invoices.
2. Delete what is not used ("like the chatbot in receipts").
3. A quick quote / estimate for a customer who calls for a price, without going through the Scheduler or Start a job.
4. Start a job and Scheduler should be one thing.
5. Invoicing a job from the Scheduler: taxed items do not carry over — he has to tick the tax box by hand.
6. "Why are we refunding for charges in Stripe — is there a way we don't have to."
7. Tell him what was missed and what could be better. Save a copy to go back to (done, above).

## What was found

### Why it is slow (measured in the code, not guessed)

- Every page load downloaded **every table** before showing anything: all receipts (1,781 rows, 1.5 MB of JSON, two
  requests one after the other), all stock, customers, jobs. Then, one after another: who is signed in (a network call),
  the role (another), the shop settings (another).
- The Receipts page (`bittings.html`) is a **separate page**, so opening Receipts, invoicing a job, or going back to the
  Scheduler each repeated the whole download.
- A second "probe" connection was created on every load just to ask whether someone is signed in.
- The main page is served `no-store`, so its 830 KB is fetched again on every load. (Left as is on purpose — see Decisions.)
- Stripe's script and the charts script blocked the page while they loaded, on every page.

### Already one list (no change needed)

Customers, stock, jobs and documents each already live in ONE list in `app/store.js` (`TKS.list('customers' | 'shops' |
'inventory' | 'bookings' | 'receipts')`). Receipts, invoices and estimates are the same list, told apart by `docType`.
What IS duplicated is code, not data — see "Duplicates still to merge".

### The chatbot

Already removed on 2026-11-09 (commit `82216dc`). Only leftovers remained (a stray `</div>`, an unused helper, unused CSS).

### The tax bug

Lines the office typed on the job carried their tax flag correctly. **Keys / parts pulled for the job did not**: they
arrived on the invoice with no category and no tax flag, so the builder guessed "Labor" (not taxed).

### The Stripe "refunds"

They are **not refunds**. The app authorizes the sale **plus 2%** (the credit-card surcharge), then looks at the card.
If it is a debit card it captures only the sale amount; Stripe's dashboard shows the un-captured 2% as "refunded".
Example: 11 Nov 19:12, authorized $255.00, captured $250.00, debit. The customer was never charged the $5 and Stripe
charges no fee on it. To stop it appearing at all the app must learn the card type BEFORE charging:

- typed card: create the PaymentMethod first, read `card.funding`, then create the PaymentIntent for the exact amount
  (automatic capture). Touches `supabase/functions/pay-create-intent`, `stripe-webhook`, `app/pay.js` and the copy of
  it inside `bittings.html`.
- card reader (WisePOS E, server-driven): use the reader's two-step "collect, then confirm" so the amount can be set
  after the card is read. Touches `supabase/functions/pay-terminal`. **Check Stripe's current Terminal docs first.**

**Not started. Do NOT change the card path without the owner present with a real card and the reader** — it only went
live on 2026-11-11 and cannot be tested from here.

## Status

**Live since 2026-11-12 05:35 UTC (11 Nov, late evening Central) as version `bd675f5353d0`; then `b787a60ba99a` (05:49 UTC); the seven till fixes (8z69) went live after that — see `website/site/staff/version.json` on both addresses.**
Not committed yet (branch `phase3-frontend-unification`). The owner commits by saying "commit it".

| # | Item | Status |
|---|------|--------|
| 1 | Restore point (tag, branch, zip; vendor libraries copied to `D:\Work\Backups\tk-phase3-vendor-2026-11-11`) | DONE |
| 2 | `app/store.js` device cache: opens from a copy saved on the device (IndexedDB, per user), catches up in the background, receipts read as "changed since" | DONE, LIVE. Tested with a stand-in cloud; NOT yet seen with a real sign-in on a real phone |
| 3 | Both pages: no probe connection, refresh when the page comes back, pinned local Supabase library, Stripe + Chart.js async; Receipts page waits for the device copy | DONE, LIVE |
| 4 | Tax flag on job parts (`index.html` `jobToInvoiceDraft`) | DONE, LIVE |
| 5 | Quick quote: menu + bottom bar → `bittings.html?quote=1`, builder opens as an Estimate, name optional | DONE, LIVE |
| 6 | Estimate → "Schedule this job" (fills the Scheduler's Quick form) and "Make it an invoice" (own id + number) | DONE, LIVE |
| 7 | Start a job REMOVED (owner decision); Scheduler is home on a phone, Register on a computer | DONE, LIVE |
| 7b | Receipts list: "＋ New receipt / invoice" and "💬 Quote" buttons (the phone's way to a sale with no job, now that Start a job is gone) | DONE, LIVE |
| 8 | `signin.html` wipes the device copy | DONE, LIVE |
| 9 | Handoff docs updated; four test scripts saved in `bittings-unified/tools/qa/` | DONE |
| 10 | Real-device sign-off: iPhone + Android, owner + technician (CLAUDE.md rule) | **OWED — owner** |
| 11 | Module-by-module review of everything else (Register, Inventory, Reconcile, Reports, Settings, hardware, …) | DONE — see "Module review" below. Its three safe fixes and the failed-save fix are LIVE (8z67, 8z68) |
| 11b | Seven till risks from the review (8z69) | DONE, LIVE 2026-11-12 |
| 11c | Dark mode readable everywhere: `app/ui/contrast-guard.js` + sweep tool (8z70); Receipts list draws 60 at a time | DONE, LIVE 2026-11-12 |
| 11d | Website leads (table `web_leads`, public `submit_web_lead`, Leads screen), nightly database backup to `D:\Work\Backups\db`, error log (Activity → Errors), visible Update button, offline shell (`sw.js`), Reports CSV export (8z71, 8z72) | DONE, LIVE 2026-11-12 |
| 11e | Pay-by-link (text a customer a link to pay) | NOT BUILT — needs Stripe work + a real test payment with the owner |
| 11f | Unsaved changes surviving a closed page while offline | NOT BUILT |
| 11g | Supabase plan has NO backups of its own — upgrade to Pro for daily backups | OWNER DECISION (the nightly local copy covers it meanwhile) |
| 12 | Duplicates to merge (below) | TO DO |
| 13 | Scheduler: wizard vs Quick form → one new-job form | TO DO (they save different fields — see below) |
| 14 | Stripe: learn the card type before charging | TO DO with the owner present |
| 15 | Receipt numbers unique across devices (server-side counter) | TO DO (known issue from 11 Nov) |

### What changed in which file (this rebuild)

- `bittings-unified/app/store.js` — DevCache, `storedSessionUser`, adapter `fetchRows / applyFresh / refreshKey / refreshAll / adoptCached / enqueue / persist`, new `connectCloud`, `TKS.refresh / ready / hasStoredSession / clearDeviceCache`, sign-out wipe.
- `bittings-unified/app/tier.js` — `load(force)` asks the server at most once a minute.
- `bittings-unified/app/vendor/supabase-js-2.119.0.js` — new (folder is git-ignored; the published copy under `website/site/staff/app/vendor/` IS tracked).
- `bittings-unified/index.html` — scripts, start-up, `homeView / goHomeView`, Start a job markup + script removed (~450 lines), Quick quote nav, quote → job hand-off at the end of the Scheduler block, debounced change handler, `rerenderActive` covers Scheduler + Receipts, customer form `editRec`, bottom bar defaults, tax flag on job parts.
- `bittings-unified/bittings.html` — scripts, start-up, `?quote=1`, nameless estimates, `estimateToInvoice`, `estimateToJob`, estimate action buttons, History delete by record, bottom nav, leftovers removed, totals box guard.
- `bittings-unified/signin.html` — wipes the device copy.
- `bittings-unified/tools/qa/` — `store-cache-test.js`, `rebuild-cloud-boot-test.js`, `rebuild-app-test.js`, `rebuild-quote-test.js`.

### Scheduler: wizard vs Quick form (for item 13)

"+ New job" opens the step-by-step wizard for everyone; the Quick form is reachable from the wizard only for
owner/manager, and it is also the edit popup for every job. They do NOT save the same fields:

- wizard only: customer email, duration, notes, upsell answers, `serviceCategory` / `serviceLabel`, creates the customer record; requires phone, street, date, time.
- Quick form only: charge lines (`items`), `quote`, contracted-out, internal notes, status at creation; needs only a name or a date.
- Status spellings differ between `app/store.js` (`In Progress`, `Rescheduled`) and the Scheduler (`In progress`, `En route`, `On site`).
- "Keys for this vehicle" is written twice (`kfv*` for the wizard, `renderKeys` etc. for the Quick form); only the Quick form shows "Might fit".

## How the device cache works (read before touching `app/store.js`)

- `DevCache` = IndexedDB database `tks_cache`, keys `<user id>:<table>` and `<user id>:role`. One copy per signed-in
  user, because the server sends different data by role (costs are hidden from technicians).
- Only **server-confirmed rows** are saved (the adapter's `shadow`), never an edit that has not been saved yet.
- `TKS.connectCloud()`: if a copy exists for the signed-in user it becomes the live data immediately and the promise
  resolves; `TKS.ready` resolves when the background catch-up has finished. No copy → download as before, but the
  table reads, the role and the settings now run at the same time instead of one after another.
- `TKS.refresh(forceFull)` brings every table up to date **in place**: the same array and the same row objects stay,
  rows are updated / added / removed inside them. Rows edited here and not saved yet are left alone.
- A refresh and a save of the same table never overlap (`enqueue`).
- Receipts use "changed since" (`delta: true`, column `updated_at`, kept by a trigger) with a full read at least every
  15 minutes; the small tables are always read in full.
- Wiped by: `TKS.auth.signOut()`, any `SIGNED_OUT` event, a page load with nobody signed in, and (to do) `signin.html`.
- **Rule for screen code:** never keep a *position* in a list across a question to the user or a network call — find the
  record again (`list.indexOf(record)`) at the moment of changing it. Fixed in the History delete in `bittings.html`;
  `index.html` still needs the same check (customers list around `saveCurrent`, and any `splice(i,1)` after a confirm).

## Decisions made, and why

- **Keep two pages (`index.html` + `bittings.html`) for now.** Merging 3,300 lines of receipt code into the main page is
  the riskiest possible change to a till that went live today. With the device copy, switching pages no longer waits on
  the network, which removes most of the pain. Merge later, calmly.
- **Leave the page cache header at `no-store`.** It was set on 11 Nov because phones were sitting on an old copy of the
  app. Changing it back would save a little time and risk that problem again.
- **Start a job was removed, not merged** (owner, 11 Nov: "I don't think we need the start a job option… just remove it").
  Its vehicle result card (keyway, Lishi tool, programmer pills) went with it; the same facts are in Lishi & Keys and Programmers.
- **Quick quote reuses the document builder** rather than a new screen: it already has the vehicle picker, the services
  with prices, the stock picker that knows what fits, and now the running total. One builder to maintain.
- **Do not touch the card-payment path tonight** (see the Stripe section).
- **No database changes in the speed rebuild itself.** (Later, 2026-11-12: one additive migration, `8z71_web_leads.sql` — a new table and function; nothing existing was altered. Going back to `working-2026-11-11` does not need it removed.)

## Module review (every module except start-up, the receipts page and the scheduler) — 2026-11-11 night

Done by a read-only reviewer; each line below was traced in the code unless marked LIKELY. Function names are given because
line numbers move. **Fixed tonight** is marked; everything else is open.

### Dangerous for a live till, most serious first

1. **Failed cloud saves looked saved** (`store.js doFlush` ignored errors). **FIXED tonight (8z68).** Still open: an UPDATE that the
   server's row rules silently filter to zero rows looks saved.
2. **A card sale can skip stock.** **FIXED 2026-11-12 (8z69): `stockSafetyNet()` catches it up from any signed-in device.** Background: Stock comes off only in the browser after the payment poll confirms (`posCheckoutThen` →
   `done()`; `pay.js poll` gives up after about 80 s). Late tap / closed tab / lost signal = money taken, stock not moved, ticket
   still on screen, staff may run it again. Neither `stripe-webhook` nor `receipt_mark_paid` touches stock.
3. **Stock numbers that do not stick.** **FIXED (8z69): qty is never sent on an UPDATE; ± opens the stock panel; part-page qty read-only.** Background: Signed in, the ± buttons (`TKS.Inventory.adjustQty`) and the part page's quantity box
   (`pSave`) write `inventory.qty` directly; the server recalculates the total from the per-location counts on the next sale /
   move / receive and wipes the change. `pSave` can also write an old count over a sale made on another device.
4. **"Mark as paid" bypasses the books — FIXED (8z69): asks the method and records it through pay-record.** Background: (customer invoice view → `markInvoicePaid`; History "Mark Paid" in bittings.html):
   no payment record, so the cash never reaches Closeout's expected cash, Reports or commission. It also renames INV→TKS (LIKELY collisions).
5. **Ghost Register receipts.** **FIXED on the client (8z69): hidden from every list; tags are truthful.** The rows still exist in the database. Background: `pos_checkout` creates a receipt before payment; an abandoned card attempt leaves one, and
   `invStatusTag` shows any type-"receipt" document as PAID.
6. **The cash drawer opens on every thermal print — FIXED (8z69): cash / check only; manual open is logged (not restricted).** Background: (`hardware.js helperLines` `{drawer:true}`, and the WebPRNT path) — card
   sales, reprints, unpaid previews — and the manual "Open cash drawer" button has no permission check and no log entry.
7. **A new customer with an existing name overwrites that person's phone / email / address — FIXED (8z69): asks first.** (`fSave`).
8. **Register tax ignores Setup.** **FIXED (8z69) for services (flag kept and sent). Parts are still always taxed by `pos_checkout`.** Background: The server always taxes parts and never taxes catalog services; `gather('services')` in Settings
   drops each service's `taxable` flag on save.
9. **Balance owed is by name text and ignores partial payments** (`custReceipts`, the owed tag in `renderCustomers`, `totalOwedAll`, Dashboard A/R).
10. **The Register ticket lives only in memory** — the Update bar, a clock-out reload or a refresh loses the sale in progress.
11. **Closeout float** is per device and is changed just by viewing a deposit slip for any date (`finalizeCloseout`); no closeout is stored.
12. **Refund restocks twice** (server `TKS.POS.restock` then local `reverseStockForInvoice`) — LIKELY harmless today, fragile.
13. **A bottom-bar tap removes the Pay sheet without cancelling the charge** (`closeAllOverlays`) — LIKELY; Register is desktop-only.

### Best payoff for least risk (reviewer's top 15)

| # | Change | Size | Status |
|---|--------|------|--------|
| 1 | Stop loading `ilco-2025.js` and `corrections.js` (about 130 KB unused) | small | DONE (8z67) |
| 2 | Year lists to this year + 1 (2027 could not be picked) | small | DONE (8z67) |
| 3 | Lishi "In stock?" pill reads the real stock list | small | DONE (8z67) |
| 4 | Cash drawer only on cash sales; permission + log on the manual open | small | open — owner decision |
| 5 | Signed in: route stock ± and the part-page quantity through `inv_adjust` (or hide them) | small–medium | open |
| 6 | Show unpaid receipts as unpaid in `invStatusTag`; void abandoned `pos_` tickets | small (+ optional server) | open |
| 7 | Replace "Mark as paid" with the builder's payment path, or remove it | small–medium | open |
| 8 | `doFlush` checks errors, keeps failed rows unsaved, warns | medium | DONE (8z68) |
| 9 | Keep the Register ticket in sessionStorage; hold the Update bar while a ticket is open | small | open |
| 10 | Customer form: ask "use existing / create new" instead of a silent same-name merge | small | open |
| 11 | Balance owed by customer id, honour partial payments | small | open |
| 12 | Keep `taxable` in `gather('services')`; make `pos_checkout` honour it and the Materials setting | small + server function | open |
| 13 | Dead code and stale text | small | PARTLY (dash functions, toast, two notices). Left: `payOt` handler, Programmers `corr`, `chgGate` PIN branch, `staffEmails`, "test mode" text in `billing.js` / `tier.js` |
| 14 | Customer action bar: Call / Text / Map / New job / New invoice with the last vehicle filled in | medium | open (idea) |
| 15 | Cash tendered → change due at the Register; "Export for accountant" CSV in Reports | small each | open (idea) |

### Other facts worth knowing

- `pay.js` opens its own second Supabase connection (`client()`); the Receipts page's Pay Now copy does too.
- `receipts-view.js` redraws every receipt (about 1,800 rows, no paging) on every repaint — show 50 + "Show more".
- `access.js` re-applies role gates through a page-wide MutationObserver; `tier.js applyGates` redraws Inventory on every load.
- Commission weeks start on Sunday (`comPeriodRange`); Reports, Timesheets and the Dashboard start on Monday.
- Dashboard revenue (`dashTx`) does not subtract refunds; Reports does.
- Lishi tables and "My tools" (Programmers) live only on each device — an edit on the counter PC never reaches the phones.
- Lishi computes a code series per vehicle (`applyCodeSeries`) and never shows it.
- `signin.html` still loads the cloud library from a CDN, unpinned (`@2`).
- `START-DEMO.html` / `SANDBOX.html` are not published, but `_devserver.js` serves them on the same localhost address the
  counter PC uses for the real app; opening one there replaces the stored login with a fake one.
- The full reviewer report (ideas per module) is in the spreadsheet `D:\Work\Backups\Bittings-rebuild-2026-11-11.xlsx`, tab "Ideas".

## Duplicates still to merge

- `app/receipts-engine.js` (648 lines) is a copy of the receipt card / PDF / share / totals code in `bittings.html`, and
  the two have drifted (declined lines, partial payments). The main app uses the copy; the Receipts page uses its own.
  Make `bittings.html` load `receipts-engine.js` and delete its own copies — check the differences first.
- `app/pay.js` and the Pay Now block inside `bittings.html` are two copies of the same payment screen.
- `app/receipts-view.js` copies `receiptClosed` / `canEditClosed`.
- Editing an estimate and switching its type keeps the `EST-` number.
- "Mark Paid" in History does not record the cash sale the way the builder does.

## What we missed / what could be better (for the owner)

- **Receipt numbers** can still repeat across devices (two TKS-2026-1111B). Needs a counter on the server.
- **Failed saves** are now caught, retried and shown (8z68).
- **If one table fails to download on a first load**, that table quietly works from the device only for that session and
  what is saved there never reaches the cloud. Should retry and warn instead.
- **Two people editing the same record**: the last save wins, silently.
- **Offline**: with the device copy the app now opens without a connection and shows the last data, but anything saved
  while offline is still lost if the page is closed before the connection returns. A proper "waiting to sync" queue would fix it.
- **Counter PC** still has the old print helper (printing from bittings.app fails there).
- **Stripe**: reader not yet re-paired in live mode; "I already have a Stripe account" not tested with an owner login.

## How to test

- Data layer: `NODE_PATH=D:/Work/Code/tk-phase3/node_modules node bittings-unified/tools/qa/store-cache-test.js` → "ALL PASSED".
- App in the browser (demo data, no sign-in): serve `bittings-unified/` on 127.0.0.1:8088, open `START-DEMO.html` first.
  Demo mode has no server, so anything that calls the cloud needs a stand-in (see the scripts in the session scratchpad
  described in `bittings-unified/tools/qa/README.md`).
- Phone rule (CLAUDE.md): nothing is "done" until it has been seen on a real iPhone and a real Android, owner and staff.

## Deploy

`node website/_tools/publish-staff.mjs && node website/_tools/deploy-site.mjs && node website/_tools/deploy-app.mjs`
(Cloudflare token and account id are in the user environment on the shop PC.) Then check
`https://bittings.app/version.json` and `https://turbokeysmith.com/staff/version.json` show the new version.

# Residential / Commercial trade + master-key calculator — plan (2026-11-13)

**Status: research and plan only. Nothing built.** Owner asked: look into it, don't build. Research with sources:
`docs/research/master-keying-research-2026-11-13.md` (every spec there has a URL; gaps are listed in its section 7).

Why: a residential/commercial locksmith (owner's friend) saw the app and asked for "residential and commercial key bitting —
IC cores, master key systems". Owner's direction: Bittings becomes the one-stop app; a shop picks its **main trade** and pays
extra for the other. Owner: "if we do it we're going to be doing a calculator 100% for sure."

---

## 1. Product shape: pick a trade, add the other

| | Automotive shop (e.g. Turbo Keysmith, ~95% auto) | Residential / commercial shop (e.g. the friend) |
|---|---|---|
| Included | Vehicle key lookup (VIN / YMM / FCC), fits lists, programmers, NASTF D1 | Key systems (master keying), pinning calculator, IC cores, key control |
| Add-on | Res/Com pack | Automotive pack |
| Shared by both (every plan as today) | customers, quotes, jobs, scheduler, register, card payments, receipts, inventory, reports, sales tax, pay, team, time clock, Lishi | same |

- Plans stay **Starter / Pro** (seats and business features). The **trade** decides which specialist screens are on. The
  "Lookup" plan becomes trade-specific (auto key lookup, or res/com reference + calculator).
- Suggested pricing (owner to decide; same pattern as the founder prices): trade add-on **$29 / month founder, $49 regular**.
- How it would work in code: the server's tier matrix (`supabase/phase4/4a_tiers.sql`, mirrored in `app/tier.js`) gets a
  second dimension, `shop_trades` = { auto, rescom } with one as primary. `tier_allows(feature)` checks both the plan and the
  trades; the menu hides the other trade's screens; sign-up asks "What is most of your work?". Turbo Keysmith = auto
  primary (residential basics it already does — lockouts, simple rekeys — keep working through the normal services list;
  the Register already has a Residential / Commercial tab).

## 2. What the friend means (plain words)

- **Master key system:** one building's keys arranged in levels — each person's key opens their doors, a manager key opens a
  group, the top master opens everything. Done with extra "master pins" in each lock. Designing one is math: start from
  the top master key's cuts, generate every other key's cuts by a fixed method, and check no key opens what it shouldn't.
  Output = a **pinning chart** per lock.
- **IC cores (interchangeable cores):** removable lock cores (Best-style "SFIC" is the common one). A **control key** pops the
  core out. Adds a third key layer and its own pin math.
- **Saving the system under the customer:** a business's system lives for years — every door, every key, who holds key
  #AA3, what was lost. When a key goes missing the locksmith looks it up and re-pins only what's needed.

## 3. The Res/Com module, in build order

**Owner's decisions (2026-11-13):** the friend designs AND maintains systems. A key is tied to **who has it** (a person or a
role — "Janitor", "Suite 102 tenant") and/or **what it opens** (doors / areas / offices) — either, both or neither; a
locksmith who only rekeys may fill in just the door. The calculator lives **on screen** (phone first); printing is optional,
never forced. Mock: `bittings-unified/mock/master-key-calculator.html` (System / Keys / Doors / Pin chart / Lost key, Print
on each). What to collect per keyway: `docs/keyway-spec-request.md`.

### Phase A — Key system records (useful on day one, no math)
- Under a customer: **Sites → Doors → Cylinders/cores**, and the **Keys** (symbol e.g. GM, AA, AA1, its bitting, keyway,
  blank, "Do not duplicate"), and **who holds which key** (issue / return log with signature and date, lost / stolen flag).
- "Key AA3 lost" → list every door it opens → one tap to start a rekey quote for those doors.
- Print / PDF: key-holder receipt, system summary for the customer, door list.
- Import an existing system from a spreadsheet (most shops have paper or old-program charts).

### Phase B — The calculator (owner: definitely)
- **Brand / system library, sourced specs only** (from the research; first batch is the one with manufacturer sources):
  Schlage Classic (0–9, .015", MACS 7), Best-style SFIC A2 (0–9, .0125", stack rule 23), Schlage LFIC; Kwikset (1–7, .023",
  MACS 4 — only forum-sourced so far, must be confirmed before shipping).
- **Design a system:** pick brand + keyway + pin count; enter or generate the top master; choose the method (total position
  progression or rotating constant; 1-step or 2-step); the app builds the key bitting array, gives every key its standard
  symbol (GGM / GM / AA / AA1…), rejects cuts that break MACS, and shows capacity ("this layout gives 25 masters × 125 keys").
- **Pinning chart per lock:** bottom pin = shallowest operating cut; master pin = deepest − shallowest; top pin from the
  system's rule. For SFIC A2: build-up = control cut + 10 − plug total; top = 23 − (bottom + master + build-up)
  (the Schlage manual's worked example becomes an automatic test).
- **Safety checks (the part that makes it trustworthy):** list every key a pinned lock will actually accept and flag any that
  aren't meant to work (ghost / incidental keys, cross-keying); flag pin sizes the kit doesn't have; flag master pins thinner
  than the brand allows.
- Print the pinning chart on the receipt printer or as a PDF for the tech; a technician sees only the chart for their job.
- Pins and cores used on a job come out of inventory like keys do today.

### Phase C — More brands and real-world extras (each only after its specs are confirmed)
- Sargent 6300 IC (different control rule — sourced), Corbin Russwin System 70, Best A3 / A4 (stack totals 16 / 14 need a
  Best manual — the only source found has arithmetic errors), Yale, Arrow, Weiser, Medeco (needs its own model — rotating
  pins; may stay out of scope).
- Construction keying (temporary cores / construction master), system expansion planning, multiple keyways.

## 4. Data still needed before the calculator ships (from the research gaps)
1. Best / dormakaba A2–A3–A4 pinning manual (buy or get from the friend) — confirm A3 / A4 constants.
2. Schlage Classic first cut + spacing, Kwikset full spec, and Sargent / Yale / Arrow / Weiser / Corbin specs from a
   manufacturer or key-machine maker (HPC / Ilco / Silca spec cards are a reliable route).
3. A master-keying reference book (e.g. *Master Keying by the Numbers*) for the exact method definitions.
4. **Real systems from the friend** (anonymised) to test against: if the calculator reproduces his existing charts exactly,
   it's right. No brand goes live until it passes that plus the manufacturer worked examples.

## 5. Security and legal
- Master key records are effectively the keys to a building: owner / manager only, every view and change logged, never on
  customer-facing documents, never on the marketing site, exports watermarked. Technicians: their job's chart only.
- Restricted / patented keyways: store them, but mark them restricted and record who authorised each key (key-control
  practice). The app doesn't make blanks — it records and calculates.
- "Do Not Duplicate" stamps are a practice, not a guarantee; the research found no reliable source on state duplication
  law — don't promise anything legal in the app or on the website.

## 6. Competition (why this can win)
Stand-alone tools exist — master-key designers (Aero Key / Aero IC, HPC MasterKing, SimpleK, Pm5) and key-control programs
(Key Wizard, InstaKey, KeyTrak) — mostly desktop or separate subscriptions, prices not published. **None found is built into
a shop app with jobs, invoices, payments and inventory.** That combination is the "one-stop" pitch.

## 7. Rough size (sessions like today's)
- Trade split (plans, sign-up question, menu): about 1–2.
- Phase A records: about 2–3.
- Phase B calculator for the first 2–3 brands, with safety checks and tests: about 4–6, plus validation time with the friend.
- Phase C: per brand, once specs are in hand.

## 8. Questions for the friend (send before building)
1. Do you design new master key systems, or mostly re-pin and keep records for existing ones?
2. Which brands do you work with most? (Schlage, Kwikset, Best / SFIC, Sargent, Corbin, Medeco…)
3. Do you track who holds each key for your business customers? How today — paper, spreadsheet, a program?
4. Do you print pinning charts to take to the job? What does a good one look like to you?
5. Would you share one or two old systems (names removed) so we can test the calculator against them?
6. What would you pay for this per month, and what do you pay now for anything similar?

# Lishi tool list — cross-reference review (for owner approval)

**Created:** 2026-06-16 (Claude Code) · **Scope:** AUTOMOTIVE Lishi tools only.

I scrubbed seven sources and compared every automotive tool against what was already in
`lishi.html`. This file lists:

- **Part 1 — Conflicts:** places where the live data DISAGREES with the source consensus, OR where
  the sources disagree with each other. **I did NOT change these in the app.** Tick the ones you
  approve and I'll apply them.
- **Part 2 — Additions I already made** (31 tools missing from the app but sold by multiple trusted
  suppliers). Listed so you can veto any.
- **Part 3 — Sources & method** (what each site gave, counts, honesty caveats).

How to use: put an `x` in the box for each change you approve (or write a note), send it back, and
I'll apply approved items and re-cross-check.

---

## Part 1 — CONFLICTS to approve before changing

### 1A. Make/vehicle attribution that looks WRONG in the live app
These are cases where the app's note disagrees with what 3+ trusted suppliers say. I believe the
suppliers are right, but you make locksmith calls in the field — confirm before I change them.

- [ ] **TOY43R** — app says **"Toyota"**. Classic Lishi, UHS, AKS, Key Innovations all list it as
  **Subaru / GMC / Chevy** (alt codes B108/B110). → Proposed: change note to "Subaru / GMC / Chevy".
- [ ] **ICF03** — app says **"Iveco / commercial"**. Classic, UHS, AKS, Key Innovations all list it as
  **Ford Escape & Mazda Tribute** (11-cut). → Proposed: "Ford Escape / Mazda Tribute".
- [ ] **DAT12R** — app says **"Subaru"**. Classic, UHS, AKS, Key Innovations list it as
  **Isuzu / Hino heavy trucks** (X154/B54). The Subaru tool is actually **DAT17** (now added).
  → Proposed: DAT12R note = "Isuzu / Hino heavy truck".
- [ ] **NE38** — app (one row) says **"Renault/Saab (boot)"**. Classic, UHS, AKS, Key Innovations list
  **Land Rover / MG / Rover** (alt codes RV4/X170). → Proposed: "Land Rover / MG / Rover".
- [ ] **HU46** — app says **"Opel/Vauxhall"**. Sources add **Cadillac, Chevy, Pontiac, Daewoo, Holden**
  (US GM). → Proposed: "Cadillac / Chevy / Pontiac / Opel / Vauxhall / Daewoo".
- [ ] **HU101** — app says **"Ford"**. Sources: **Ford, Volvo, Land Rover / Range Rover, Jaguar**
  (and Mazda BT-50). → Proposed: "Ford / Volvo / Land Rover / Jaguar".

### 1B. Make notes that are too NARROW (add makes, nothing removed)
- [ ] **HU64** — app: "Mercedes-Benz (4-track)". LockPickWorld adds **Dodge Sprinter, Chrysler
  Crossfire, VW Crafter**. → add those.
- [ ] **MAZ24** — app: "Mazda". LockPickWorld adds older **Ford (Escape/Probe/Ranger), Mercury**. → add.
- [ ] **NSN14** — app: "Nissan/Infiniti". UHS/AKS also list **Subaru** (and one **Ford**) on NSN14/DA34.
  → add Subaru.
- [ ] **SIP22** — app: "Fiat/Alfa/Lancia/Iveco". AKS lists **Jeep** (Renegade, Fiat-based). → add Jeep.
- [ ] **HU71** — app: "Land Rover / older". Sources add **Scania trucks**. → add.

### 1C. Keyway-alias (KW_ALIAS) resolution that looks wrong
The app maps some alternate keyway codes to a tool. Two look mis-mapped:
- [ ] **KK10** currently resolves to **HY20**. Key Innovations lists KK10 as an alt for **HY22**
  (HY22/KIA7/KK10). → Proposed: KK10 → HY22.
- [ ] **B102** currently resolves to **B111**. Sources: B102/B86 = **GM39** (GM 10-cut); B111 is the
  separate GM **Z-keyway (warded)**. → Proposed: B102 → GM39.
- [x] **DAT17** previously resolved to DAT12R — **already fixed** this round (real DAT17 Subaru tool
  added, alias removed). Listed here only so you know it changed.

### 1D. Designation / label conflict
- [ ] **GM37 row** — the app row reads `B016/GM37` with blank-key **B102**. Original Lishi & suppliers
  show **GM37 = B106 "Z-keyway" (non-warded)**, while **B102 belongs to GM39** (10-cut). → Proposed:
  rename to `B106/GM37`, set its blank to **B106**, and keep B102 only on GM39.

### 1E. Sources DISAGREE with each other (need your call)
- [ ] **HU83** — Classic/UHS/AKS say **Peugeot/Citroën**; Key Innovations says **Mini Cooper (2-track)**.
  I added HU83 with a "verify" note. Which is right for your area, or list both?

---

## Part 2 — ADDITIONS already made (31 tools)
Missing from the app but sold by multiple trusted suppliers. Added to the tool table this round
(source tag: "Cross-ref 2026-06-16…"). Veto any you don't want.

Late-model US passenger:
HONDA2020, HONDA2021, HON77, HY20R, HY30, K9, K9 V.4 (Ioniq6), KIA3R, KY14, IONIQ5, CY24R (Jeep GC
2021+), Ford 2021 (Transit), MAZ26R (Mazda 2019+), MAZDA2024-SM (CX-30), TOY2018, TOY(2014) V.2,
TOY40, TOY51, TOY2T v.5, DAT17 (Subaru).

Euro / Mercedes / other passenger:
YM15 (Sprinter), HU36, HU23/MB18 (classic MB), HU83, HU134 (Kia Venga/Suzuki), SIP16, WT47T (Saab).

Commercial / truck:
HI1 (Hino), ISU5/B113 (Isuzu NPR), GM25R (Kenworth), VNL-2024 (Volvo VNL).

> Not added (told me to keep automotive + relevant): Aston Martin Vantage (very niche), KIA1R
> (Middle-East market), FB77 (DAF, EU trucks), HU127 (it's just the BMW HU100R under another code —
> already covered). Say the word and I'll add any of these too.

---

## Part 3 — Sources scrubbed & honesty notes

| Source | Automotive tools found | Notes |
|---|---|---|
| Classic Lishi (classiclishi.com) | 123 listings (all 11 pages) | Brand's own catalog; variants (Ign/Door/Reader) counted separately |
| Original Lishi (originallishi.com) | 93 (86 2-in-1 + 7 readers) | Brand's own full list + newer product pages |
| UHS Hardware | 136 | Richest titles (keyway+makes+variant+year baked into each title) |
| American Key Supply | 92 | Strong alt-code cross-refs (Ilco/Silca numbers) |
| Key Innovations | 74 | Good Ign/Door/Trunk variant detail |
| CLK Supplies | 46 | Collection titles only — year notes live in product descriptions |
| LockPickWorld | 32 | One product, 32 keyway variants; best make/year coverage page |

**Honesty caveats**
- The **tool list** (which Lishi tools exist + their keyway) is now corroborated across all seven
  sources and is solid.
- **Year-by-year vehicle mapping** is still a compiled cross-reference — Lishi does not publish
  year-level vehicle tables. The app's separate vehicle table + "Matched by keyway" inference cover
  that, and field corrections go through the in-app Corrections Log.
- CLK year/variant fields were title-level only; if you want, I can have it open all ~46 CLK product
  pages for exact year ranges.
- Counts above include each Ignition/Door/Reader variant as its own line, so they're higher than the
  number of distinct keyways.

# Programmer coverage audit — by make (immobilizer platform)

**Purpose:** confirm, make by make, what the shop's tools can actually do — vs. the vendor-claimed seed (which goes stale). Coverage clusters by **immobilizer platform**, so a make + year-range answer = the answer for every model in it (no fabricated per-model differences). Anything unverified is marked **PENDING** and left as "verify" in the app, not guessed.

**Shop tools:** Autel IM608 · Autel IM508 · Autel KM100 · Xhorse Key Tool Max · Advanced Diagnostics SmartPro · XTool AutoProPad · Lonsdor K518.

**Status legend:** ✅ confirmed (sourced) · ⚠️ doable-but-conditional · 🔒 dealer/specialist for our kit · 🕓 PENDING (not yet confirmed — still "verify" in app).
Last updated: 2026-06-24.

---

## ✅ Confirmed

### Ford / Lincoln — ⚠️ Autel REMOVED, others still do it
- **Autel (IM608/IM508/KM100): NO Ford/Lincoln 2015+** — Ford forced Autel to remove all key/IMMO functions in N. America **Aug 25 2025** (AKL *and* add-key). Pre-2015 Autel still OK.
- **Still do Ford:** AutoProPad, Lonsdor K518 Pro, SmartPro (ADS), OBDSTAR. PATS2-5 = AKL needs the timed/online method.
- **Physical tell:** door keyhole **vertical = doable**, **horizontal = dealer software**.
- App: Autel hidden for Ford; others show + keyhole note. Sources: [diag.net](https://diag.net/msg/m3j1rp7lhj01m9yfkjtxq91ear), [autel.us](https://autel.us/autel-adds-24-25-immo-key/), [AutoProPad/OBDSTAR Ford AKL](https://www.obdstarstore.com/service/instructions-of-how-to-program-keys-for-ford-all-keys-lost-2043.html).

### Toyota / Lexus / Scion — ⚠️ Autel AKL removed (US)
- **Autel: add-key YES, AKL REMOVED in the US region.** App shows Autel as "add-key only (AKL removed)".
- **AKL tools:** **Lonsdor K518 (Pro/USA)** native 8A-BA AKL (July 2023 breakthrough), **AutoProPad G3**, Xhorse via XD8ABAGL cable.
- Sources: [OBDII365 — after Autel removes Toyota AKL](http://blog.obdii365.com/2024/09/20/what-is-a-better-alternative-after-autel-removes-toyota-akl-function/), [Lonsdor 8A-BA AKL](https://www.obdii365.com/service/lonsdor-k518-program-toyota-8a-ba-all-keys-lost.html).

### GM — Chevrolet / GMC / Buick / Cadillac — ⚠️ Global B
- Pre-2020: standard, doable (all tools).
- **2020+ Global B / VIP:** AKL = door-cycle relearn (~12 min) + **ECM/BCM rolling-code calc** (3rd-party). IM608/IM508, SmartPro, AutoProPad (free ECM/BCM calc on some).
- **Physical tell:** newest **"shark-fin" keys = dealer-only**; older flip/blade = doable.
- Sources: [OBDII365 GM 2021-2024 AKL](http://blog.obdii365.com/2024/11/11/program-gm-2021-2024-all-keys-lost-with-autel-im508-im608/).

### Stellantis — Chrysler / Dodge / Jeep / Ram / Fiat — ⚠️ PIN / rolling PIN
- 2018+ **Security Gateway (SGW)** → bypass cable + PIN. **2023+ 5-digit rolling dealer PIN** (changes ~12h) → usually dealer.
- **Physical tell:** older **egg-style FOBIK = doable**; newer **square proximity = usually dealer**.
- Sources: [Car Keys Express FOBIK](https://carkeysexpress.com/chrysler-dodge-jeep-volkswagen-fobik-simple-key), [FW Locksmith](https://fwlocksmith.com/blog/ecu-programming-explained/).

### Honda / Acura — ✅ doable
- Autel IM608 + XP400 Pro (universal key) does add + **AKL**. Civic/CR-V/Fit stable. Source: [Autel Acura/Honda AKL](https://www.autelsale.com/service/autel-im608-pro2-program-2020-acura-tlx-all-keys-lost.html).

### Nissan / Infiniti — ✅ doable (PIN)
- 2013+ rolling **20-char PIN**; **all keys must be present** (programming auto-deletes the key database). Doable with all major tools. Source: [McGuire — Nissan rolling PIN](https://mcguirelocksmith.com/locksmith-services/automotive-locksmith/lost-keys-nissan-vehicles/).

### Hyundai / Kia / Genesis — ✅ doable
- Autel IM608 pulls **PIN from VIN**; does AKL incl. 2025 (e.g. K5). Source: [Houston Key — Hyundai/Kia](https://houstonkeylocksmith.com/hyundai-kia-keys/).

### VW / Audi (VAG) — ✅ doable (MQB/MQB49)
- IM608/KeyDIY/Yanhua ACDP do MQB & **MQB49** AKL; **2023+ SFD** gateway may need unlocking first. Source: [OBDII365 — IM608 MQB49](http://blog.obdii365.com/2026/03/17/autel-im508-im608-update-vag-mqb49-5c-5d-immo-function/).

### Subaru — ✅ doable
- Autel IM508/IM608 2025 update: **Forester/BRZ 2022+ AKL free-PIN**. Source: [OBDII365 — Subaru AKL](http://blog.obdii365.com/2025/10/20/autel-im508-im608-update-2025-subaru-forester-brz-2022-akl-free-pin/).

### Mazda — ✅ doable
- Autel IM508/IM608 does AKL (ID49 etc.). Standard aftermarket, no dealer-lock found. Source: [key-programmer — Mazda6 ID49 AKL](http://www.key-programmer.org/2020/08/11/program-mazda6-2017-id49-all-keys-lost-with-autel-im508/).

### Mitsubishi — ✅ doable
- Autel IM608 Pro does current models (Outlander/Eclipse Cross/Mirage); transponder-based. Standard.

### Volvo — ⚠️ high-security (CEM/bench)
- 2015+ **CEM** — AKL usually = CEM **bench** work (Lonsdor K518USA / Yanhua ACDP / Autel), **4-6 hours**. Doable but specialist. Source: [Lonsdor K518USA Volvo](https://www.uhs-hardware.com/products/lonsdor-k518-usa-2015-2020-volvo-update-add-a-key-all-keys-lost).

### Jaguar / Land Rover — 🔒 specialist tool only
- 2016+ **DOIP/KVM** — needs a **dedicated JLR tool** (JET / SX / Lock50), NOT the general programmers. For our kit = dealer/specialist. Source: [SX JLR AKL tool](https://sx-tool.com/en/product/jlr-all-keys-lost-315mhz/).

### Mercedes-Benz — 🔒 dealer (FBS4)
- **FBS4 (2015+):** 128-bit server-locked, **no aftermarket tool does AKL** — dealer only. Source: [Monty's — FBS4](https://www.montyslocksmith.ca/blog/fbs4-mercedes-key-programming-what-you-need-to-know-and-what-we-can-do/).

### BMW — 🔒 newest dealer/specialist
- Newest (2021+) typically dealer/specialist for AKL; older (CAS/FEM/BDC) doable on specialist tools. (App flags 2021+ dealer.)

### MINI — 🔒 tracks BMW
- BMW-built, shares BMW security. AKL = **CAS/FEM module out + bench** (Autel IM608 on bench for older FEM); newest 2021+ dealer/specialist. Source: [Autel BMW/MINI key programming](https://blog.obdii.shop/autel-im608-bmw-key-programming-review/).

### Porsche — 🔒 specialist (BCM board read)
- AKL is a **BCM board-level read, NOT an OBD job** — a generic OBD programmer gets nothing. Needs **PIWIS / VVDI Key Tool Plus / Abrites** bench tools (our Key Tool *Max* won't; the *Plus* would). Dealer/specialist for our kit. Source: [Porsche AKL = BCM read](https://carkeyguy.net/porsche-key-replacement/).

### Tesla / Rivian / Lucid / Polestar — 🔒 OEM/app only
- No aftermarket key path (added via the maker's app/dealer).

---

## 🕓 Remaining (low priority)
- **Older / discontinued makes** (Pontiac, Oldsmobile, Saturn, Saab, Eagle, Geo, Hummer, Mercury, Isuzu, Suzuki): all pre-~2010 — standard aftermarket transponder coverage, no dealer-lock; treated as normal in the app (no flag). Confirm individually only if a specific one comes up on a job.

**All current/active makes in the catalog are now confirmed.** Remaining work is keeping year-boundaries current as makers change them (e.g. Ford flipped mid-2025) — handled via `toolRestriction` + the Corrections loop.

## How this maps to the app
Actionable findings are enforced in the Start-a-Job lookup: **`toolRestriction`** (Autel→Ford none, Autel→Toyota add-only) and **`dealerSoftwareNote`** (the dealer/verify flags + physical tells). The **Corrections** box is the final word — log what actually worked and it overrides this on that vehicle.

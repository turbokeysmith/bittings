# Master-keying and key-system research (2026-11-13)

Purpose: factual base for a master-keying calculator and key-system records module.
Rule applied: every number has a source URL. Anything I could not source is marked **NOT CONFIRMED**. Nothing was filled in from memory.

Reliability tiers used below:
- **[MFR]** manufacturer document (Allegion/Schlage, ASSA ABLOY/Corbin Russwin/Sargent), read in full text by me.
- **[TRADE]** trade press (Locksmith Ledger), read by me.
- **[FORUM]** forum or retailer page. Treat as a lead, not a spec.
- **[SNIPPET]** I only saw it in a search-result summary, not the page itself. Weakest tier.

**Hard rule for the developer:** the calculator must not ship per-brand numbers marked FORUM/SNIPPET/NOT CONFIRMED as if they were specs. Only the Schlage/Best-style A2 SFIC and Schlage Classic depth tables below came from manufacturer documents. Every other brand needs a primary spec (or a physical key and gauge check) before it goes in.

---

## 1. Manufacturer key specs

### 1.1 Summary table

| System | Depths / numbering | Depth increment | Root depths | Spacing | MACS | Source tier |
|---|---|---|---|---|---|---|
| Schlage Classic (SC1/SC4 etc., 5/6-pin) | 10 depths, 0-9 | .015" (see conflict note) | 0=.335, 1=.320, 2=.305, 3=.290, 4=.275, 5=.260, 6=.245, 7=.230, 8=.215, 9=.200 | first cut and spacing NOT CONFIRMED from a manufacturer. Forum: .156 | 7 (conventional/full-size keyways) | root depths + MACS MFR; spacing FORUM |
| Schlage Small Format / SL keyways | 0-9 | not stated | not stated | not stated | none: "all adjacent pairs are acceptable" | MFR (Allegion KB, snippet of page; page itself returned 403) |
| Kwikset (KW1, KW10) | 7 depths, 1-7 | .023" | 1=.329, 2=.306, 3=.283, 4=.260, 5=.237, 6=.214, 7=.191 | first cut .247", center-to-center .150" | 4 | FORUM (one 2007 post) |
| Best-style SFIC, A2 system (incl. Schlage Everest 29 SFIC) | 10 depths, 0-9 | .0125" (1/80") | 0=.3187, 1=.3062, 2=.2937, 3=.2812, 4=.2687, 5=.2562, 6=.2437, 7=.2312, 8=.2187, 9=.2062 | .150" cut-to-cut (derived from Schlage drawing: cut centers .088, .238, .388, .538, .688, .838, .988 from tip) | no MACS restriction (see conflict) | MFR for depths and cut positions; MACS FORUM/other |
| Best A3, A4 | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMED | only stack totals found (section 3) |
| Corbin Russwin System 70 / Pre-System 70 | 6 usable depths (System 70) | System 70 = "large enough to use every depth" (1-step); Pre-System 70 = "must skip every other depth" (2-step). Numeric increment NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMED (see 1.9) | MFR for step logic only |
| Sargent | spacing figure only | NOT CONFIRMED | NOT CONFIRMED | .156" stepping (patent text + forum) | NOT CONFIRMED | SNIPPET/FORUM |
| Yale | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMED | none |
| Arrow | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMED | none |
| Weiser (WR3/WR5) | 0-9 per a retailer listing; 5 spaces | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMED | retailer only |
| Medeco | see 1.10 | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMED | none |

### 1.2 Schlage Classic

- Depths 0-9, root depths 0=.335" down to 9=.200", MACS = 7, progression "Two Step", blade width .343", depth tolerance +.002/-0, spacing tolerance +/-.001". The manual states these are "the same for Schlage Classic keys, including Primus XP".
  Source: Schlage LFIC Service Manual 015806, "Key bitting specifications" page. https://us.allegion.com/content/dam/allegion-us-2/web-files/schlage/technical-documents/Schlage_LFIC_Service_Manual_015806.pdf
- **Conflict inside that manual:** the extracted text prints "Increment: 0.15"" while the root-depth column steps by .015" (.335, .320, .305 ...). The root-depth column is internally consistent at .015", so .015" is almost certainly right and ".15" is a typo or extraction artifact. Verify against the printed PDF before coding.
- Independent agreement on .015" increment and 2-step for Schlage: Locksmith Ledger says most lock companies use .015" increments ("most lock companies normally use depth increments of .015"") https://www.locksmithledger.com/home/article/21095739/masterkeying-by-the-numbers ; a forum post says "Schlage uses 2-step with .015" increments" https://www.lockpicking101.com/viewtopic.php?p=435347 ; Locksmith Ledger says "Sargent, Yale and Schlage used a 10 depth increment system and a two-step progression" https://locksmithledger.com/locks/article/12284967/mastering-the-art-of-masterkeying
- MACS 7 for Schlage Conventional and Full Size keyways; Allegion lists violators as adjacent pairs 0&8, 0&9, 1&9; "no MACS for Schlage Small Format (and SL)". Source (seen via search summary; the page returned 403 to my fetch): https://kc.allegion.com/kb/article/what-is-the-maximum-adjacent-cut-specification-or-macs . **Conflict:** a 2006 forum post claims Schlage MACS is 6 (unsourced; superseded) https://www.lockpicking101.com/viewtopic.php?p=496564 (as summarized by search; not opened).
- Spacing: forum post says SC1 spacing .156 and cites "Framon book" from memory https://www.lockpicking101.com/viewtopic.php?f=32&t=60892 . Shoulder-to-first-cut for Schlage Classic: **NOT CONFIRMED**.
- Key positions: SC1 = 5 spaces, SC4 = 6 spaces (retailer listings) https://www.clksupplies.com/products/schlage-sc1-space-depth-k12-50-eys and https://clksupplies.com/blogs/news/space-depth-keys-locksmith-guide
- Pin numbering for conventional Schlage pinning (retailer): bottom pins 0-9, master pins 2-9, top pins 1-3, plug diameter .500". Pin lengths not listed. https://clksupplies.com/pages/schlage-rekeying-guide [FORUM/retailer tier]

### 1.3 Kwikset (and SmartKey)

- A 2007 forum post ("SmokieD") gives for Kwikset: shoulder to first cut .247", center to center .150", MACS 4, and this table (root depth / bottom pin / master pin):

| Depth | Root | Bottom pin | Master pin |
|---|---|---|---|
| 1 | .329 | .172 | .023 |
| 2 | .306 | .195 | .046 |
| 3 | .283 | .218 | .069 |
| 4 | .260 | .241 | .092 |
| 5 | .237 | .264 | .115 |
| 6 | .214 | .287 | (none listed) |
| 7 | .191 | .310 | |

  Source: https://www.lockpicking101.com/viewtopic.php?p=226813 [FORUM, single poster, the post is headed "KWIKSET" not "KW1"].
- A search-result summary of LockWiki's Kwikset Classic page reports the same .247, .150, .023" increment, MACS 4, and says depth 7 is used only with master pins or construction balls. My direct fetch of LockWiki returned HTTP 500, so this is [SNIPPET]. https://lockwiki.com/index.php/Kwikset_Classic
- KW1 = 5 cut positions, depths 1-7 (retailer) https://clksupplies.com/blogs/news/space-depth-keys-locksmith-guide
- A forum post says Kwikset is 1-step progression at .023" https://www.lockpicking101.com/viewtopic.php?p=435347
- MACS 4 for Kwikset also appears in a CLK Supplies MACS chart PDF, but the PDF's table text is scrambled when extracted, so I cannot confirm which value belongs to which brand. https://cdn.shopify.com/s/files/1/0839/9519/files/MACS.pdf
- **SmartKey:** NOT CONFIRMED. I did not find a manufacturer source on SmartKey's mechanism in this pass. Do not model SmartKey as pin-stack data; it is not a standard pin-tumbler master-keying target.

### 1.4 SFIC (Best / Falcon / Arrow / Everest 29 SFIC) - A2 system

Authoritative text: Schlage "Small Format Cores Service Manual 108230" (Allegion, 2018). It states combinating Schlage SFIC is identical to "the A2 System (depths 0 through 9)" including Best keyways. https://us.allegion.com/content/dam/allegion-us-2/web-files/schlage/technical-documents/Schlage_Small_Format_Cores_Service_Manual_108230.pdf

- 10 depths, 0-9. Depth values: 0=.3187", 1=.3062", 2=.2937", 3=.2812", 4=.2687", 5=.2562", 6=.2437", 7=.2312", 8=.2187", 9=.2062" (increment .0125").
- Cut centers drawn at .088", .238", .388", .538", .688", .838", .988" for a 7-chamber key. Differences are .150". The manual states these are read and written **tip to bow** (opposite of other Schlage keys, "but standard for small format IC"). Note: whether the first number is measured from the tip or the shoulder side is my reading of the drawing; confirm before using for a cutter.
- Bottom pins 0A-9A: 0A=.110", 1A=.1225", 2A=.135", 3A=.1475", 4A=.160", 5A=.1725", 6A=.185", 7A=.1975", 8A=.210", 9A=.225" (step .0125").
- Master / build-up / top pins 2B-19B: nB = n x .0125" (2B=.025" ... 19B=.2375"). 15B, 17B, 19B are marked "*Not used in pure 2-step progression" and "not used in Schlage systems".
- Pin kit parts: bottom 34-800 to 34-809; master/build-up/top 34-902 to 34-919 (same document).
- Non-patented cores "may be combinated to A3 or A4 system specifications, but these would be non-Schlage key systems and are not within the scope of this manual."
- Independent: a forum post gives Best SFIC cut depth steps as 1/80" (=.0125") across 10 cuts, and a former Best contractor says "All Best keys are .150 spacing" https://www.lockpicking101.com/viewtopic.php?p=394719 (as summarized by search; not opened). [FORUM]
- A 6-pin A2 master key system "will generate 4096 change keys and every key combination can be used" https://locksmithledger.com/home/article/12440229/interchangeable-core-pinning-guide
- **MACS for SFIC:** Matt Blaze's SFIC notes say depth systems support "up to 10 distinct bitting heights per pin position with no MACS restriction" https://www.mattblaze.org/photos/misc/sfic/ . Forum posters say the same (search summary). **Disagreement to flag:** Schlage's own manual (above) warns a 0A bottom pin "may not seat properly on a zero cut when next to a 9", which implies adjacent 0/9 cuts are physically possible and cared about. Treat "no MACS" as unconfirmed by any manufacturer document I read; ask the user to confirm a MACS policy for SFIC rather than hard-coding "none".
- **A3 and A4 numeric depth/pin tables:** NOT CONFIRMED. A forum post claims A3/A4 share depth 0 and step by the same increments (not verified) https://www.lockpicking101.com/viewtopic.php?p=394719 . A3/A4 stack totals are in section 3.

### 1.5 Sargent

- Spacing: a patent text says a punch machine for Sargent keys should have a 0.156 inch stepping increment, and gives one gauge point (Sargent depth No. 4 = .270") https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7484446 [SNIPPET]. A forum post lists 6-pin spacing stepping about .156" https://www.lockpicking101.com/viewtopic.php?p=280605 [SNIPPET]. Full depth table, MACS, first cut: **NOT CONFIRMED**.
- Sargent cutter angle 76 degrees (retailer) https://www.securityparts.com/master-key-system-design-guide
- Sargent (Keso) 6300 removable-core stack rules are in section 3.

### 1.6 Yale, Arrow, Weiser

- **NOT CONFIRMED** for depths, increments, spacing and first cut. Weiser WR3/WR5 listed as 5 spaces, depths 0-9 by a retailer only https://clksupplies.com/products/weiser-wr5-space-depth-keys .
- Arrow bottom pins have a smaller bottom flat than Schlage's; Schlage says do not use Arrow bottom pins in Schlage SFIC (Schlage SFIC manual above).
- CLK's one-page MACS chart lists Arrow, Corbin Russwin, Kwikset, Russwin, Sargent, Schlage, Weiser, Weslock, Yale, but the values do not map back to brands in text extraction. The values present are 7, 4, 8, 8, 4, 7, 7, 7, 5, 6, 5 (order unknown). **Do not use.** https://cdn.shopify.com/s/files/1/0839/9519/files/MACS.pdf

### 1.7 Corbin Russwin

- System 70: "the increment between depths is large enough that you can use every depth in each cut position of keys within the same system. There are 6 depths total." Pre-System 70: "the increment between depths is so small that you must skip every other depth", giving 5 usable depths per cut. https://absupply.net/pdf/Corbin_Key_Systems.pdf (ASSA ABLOY Master Key System Design Guide)
- A forum post confirms System 70 = 1-step, Pre-System 70 = 2-step https://www.lockpicking101.com/viewtopic.php?p=435347
- Corbin Pyramid described as 7-pin https://www.securityparts.com/master-key-system-design-guide
- Corbin Russwin LFIC control chambers are chambers 2 and 3; Sargent LFIC control chambers are chambers 3 and 4 (Schlage LFIC manual, link in 1.2).
- Corbin master-ring cylinders (two shear lines both able to operate the lock, patented to prevent unwanted cross-keying, invented by Edward O'Keefe, patent #414,720) use "totally different rules and yield much larger systems" https://absupply.net/pdf/Certificates/Richard-Howard-ALO-Key-05-21-Feature-MasterRingCylinders.pdf and the Corbin doc above. **The calculator should treat master-ring as out of scope** or a separate model.

### 1.8 Why one table is not enough for the app

Different families also differ in: keyway family (open vs restricted), pin count, and standard vs interchangeable core. Store keyway family and system (A2, Schlage conventional, Kwikset 1-step) as data, not code, so depths, increment, step (1 or 2), MACS and stack rule can be per system.

### 1.9 Other MACS values from manufacturers

- Only Schlage (7; none for Small Format/SL) and the forum Kwikset 4 are sourced above. Corbin/Russwin/Sargent/Yale/Weiser/Arrow MACS: **NOT CONFIRMED**.
- Locksmith Ledger says "Each company has a set maximum adjacent cut value (MAC) which is usually '7'" and "approximately 10% of the 1024 key combination cannot be used because of MAC problems" (a 5-pin, 4-choice-per-cut example) https://www.locksmithledger.com/home/article/21095739/masterkeying-by-the-numbers
- MACS rule as defined by CLK: with MACS 5, a 1 next to a 7 (difference 6) violates it https://cdn.shopify.com/s/files/1/0839/9519/files/MACS.pdf . Allegion explains MACS depends on cut angle, cut depth and cut spacing, so it varies per manufacturer.
- Cutter angle examples: standard commercial 90-100 degrees, Sargent 76, Medeco 86 https://www.securityparts.com/master-key-system-design-guide [retailer]

### 1.10 Medeco (why different)

- Medeco keys are not only depth-coded. Each bottom pin also rotates, so the key has left, center or right angled cuts, fore and aft, plus a sidebar and finger pins. Biaxial introduced fore/aft pin versions; M3/M4 use the same bottom, master and top pins. https://www.locksmithledger.com/locks/cylinders-high-security/article/21247704/inside-the-medeco-4
- M4: four finger pins on six-pin blanks (three on five-pin), "three possible depths", "10 possible positions (six primary cuts plus four secondary cuts)", about 9 million theoretical combinations in a two-level master system vs 1 million for Biaxial and 6 million for M3, sidecuts cut at the factory per keyway, key has a stainless movable element protecting "against 3D-printed copies", patent expires 2040. Same article.
- "Standard masterkeying software works unless the system uses different sidecuts" (same article).
- Medeco depth increments, depth count for Biaxial/M3 (forum says six depths) and angle values: **NOT CONFIRMED** from a primary source. A forum thread cites US Patent 4,635,455 for Biaxial https://www.lockpicking101.com/viewtopic.php?p=414627 [FORUM; status unverified].
- **Implication:** a generic depth-only calculator cannot model Medeco angles or sidebar codes. Mark Medeco systems "records only, design by factory".

---

## 2. Master key system design methods

### 2.1 Nomenclature (standard key coding system)

Source: ASSA ABLOY "Master Key System Design Guide" (covers Corbin Russwin, Sargent, Yale), based on the DHI standard key coding system. https://absupply.net/pdf/Corbin_Key_Systems.pdf . (I did not retrieve the DHI document itself; this is the manufacturer's rendering of it. Instakey also has a "What is a DHI?" page I did not read: https://knowledge.instakey.com/knowledge/what-is-a-dhi .)

- A key symbol is an alpha and/or numeric designation (A, AA, 1AA).
- 2-level system: masters get 2 letters starting at AA; change keys have numbers added before the letters: 1AA, 2AA, 3AA.
- 3+ levels: change key numbers come last: AA1, AA2, AB1. Grand master = one letter (A). Masters under grand A start with A (AA, AB, AC ...).
- 4-level: great grand master symbol is "GGM"; grands one letter, masters two letters, changes AA1.
- Avoid letters I, O and Q (confused with 1 and 0). Master form instructions add: do not use I, O, Q or X.
- More than 23 masters under a grand: insert rotation number: AA through AZ for first 23, A2A through A2Z for the 24th through 46th.
- Hierarchy abbreviations: GGGMK, GGMK, GMK, MK, SMK, CK. Selective/unassociated master keys such as housekeeping (HSKP) exist. Standard keying also uses NMK (not master keyed) suffix, e.g. AB6(NMK); meaning varies by manufacturer (some mean only the MK does not operate; NGMK, NGGMK variants).
- Cross keying: letter X prefix, "operated by" list. Example from doc: XAA1, OB (operated by) AA2, AA3, AA4, AA, A.
- Levels described by Locksmith Ledger: change key (sub-master key), master key, grand master, great grand master; "blind codes" identify keys on charts and a locksmith translates blind code to bitting code with a chart or software. https://www.locksmithledger.com/home/article/21119948/medeco-an-assa-abloy-group-brand-how-to-deploy-a-key-system-the-right-way-designing-the-system
- Another retailer guide caps typical commercial systems at 2-3 levels, 2-3 physical GMKs https://www.securityparts.com/master-key-system-design-guide [retailer]; the ASSA ABLOY doc says systems above four levels are not recommended for security reasons.

### 2.2 Progression methods

- **Key bitting array (KBA):** "a plan ... the masterkey cuts to be used, the change key cuts and their order in each space, and the sequence of progression (SOP)". https://www.locksmithledger.com/home/article/21095739/masterkeying-by-the-numbers . Another article: KBA has "rows for change key bittings and columns for the number of key bittings"; "Standard Progression Format" fills a missing KBA. https://www.locksmithledger.com/keys-tools/article/10290193/the-concepts-and-mechanics-of-master-keying-developing-master-keys-using-generic-types
- **SOP / odometer:** "SOP in a vehicle odometer can be thought of as 54321"; "the sequence of rotation (SOP) cannot be changed". Same Locksmith Ledger "by the numbers" article. Position 1 changes fastest.
- **Total Position Progression (TPP, "odometer method"):** every change key cut differs from the top master key's cut in every position. Corbin's capacity math is consistent with this: "Removing one [depth] for the top master key leaves 5 for progression", and "the top master ... is always free. You don't do any progression to obtain it." https://absupply.net/pdf/Corbin_Key_Systems.pdf . A verbatim formal TPP definition: I saw one only inside search-result summaries (attributed to trade articles) and could not pin the exact page, so **the verbatim definition is NOT CONFIRMED**; the behavior above is confirmed by the Corbin doc.
- **Rotating Constant (RC, "hold and vary"):** "every change key cut in the system will contain at least one cut from the top master key"; the non-TMK cuts are called "differs"; for a 5-pin system the possible 4-part rotation sequences are 1234, 1235, 1245, 1345, 2345; "differ keys which will cause cross-keying must be eliminated"; "some different key cuts will automatically become unwanted lower level master keys". https://locksmithledger.com/locks/article/12284967/mastering-the-art-of-masterkeying
- **1-step vs 2-step progression:** 1-step uses every depth in a chamber; 2-step restricts each chamber to odd-only or even-only depths (e.g. 0/2/4/6/8). https://www.lockpicking101.com/viewtopic.php?p=435347 (forum) ; Corbin doc for System 70 vs Pre-System 70 (above). Reason: with increments too small, adjacent depths would let a key in a neighbouring combination operate the lock.
- **Capacity:**
  - Locksmith Ledger: "A five pin system automatically develops 1024 theoretical change keys," 4096 for six pins and 16384 for seven; i.e. 4^n (4 choices per chamber). "Usable change keys may be approximately 10 percent less than theoretical" due to MACS. https://locksmithledger.com/locks/article/12284967/mastering-the-art-of-masterkeying
  - Corbin: System 70 multiplier is 5 per chamber, Pre-System 70 multiplier is 4 (the TMK takes one of 6 depths / 5 usable). 6-pin GMK split examples: 1 chamber for MKs (5) + 5 for changes (3,125); 2 + 4 chambers = 25 x 625; 3 + 3 = 125 x 125. Pre-System 70 equivalents: 4 x 1,024; 16 x 256; 64 x 64. https://absupply.net/pdf/Corbin_Key_Systems.pdf
  - The Corbin doc says these are "theoretical ... actual numbers will be smaller due to physical limitations in certain cylinders and in cutting keys. Cross keying and selective master keys reduce the numbers further." Factors: MACS, number of selective keys, cross keying.
  - Sub-structure: to give MKs under a GMK, use some chambers for MK progression and the rest for change keys (example: spec 1-20-50 on one keyway: 2 chambers (5x5=25) for MKs and 3 chambers (5x5x5=125) for changes, "done with one chamber to spare"); if not enough, use 7-pin cylinders or multiple (multiplex) keyways. Same doc.
  - Locksmith Ledger's "Chart 2 and 3 provide up to 256 individual change keys" is an example number from its article, not a rule.
- Floor masters typically share 2 to 4 cuts with the top master (search summary of Locksmith Ledger, **[SNIPPET]**).
- Books named for the topic: Billy B. Edwards Jr., "Master Keying by the Numbers"; Jerome V. Andrews, "Fundamentals of Master Keying" (named by a forum poster). I did not access either. https://www.lockpicking101.com/viewtopic.php?p=435347

### 2.3 Computing pinning for a cylinder (conventional, single master pin split)

From the Corbin/Locksmith Ledger-style process (search summary of Keynotes/Lock Picking 101, **[SNIPPET/FORUM]** for the wording) and confirmed numerically by the Schlage worked example below:

1. For each chamber, collect the bittings of every key that must operate the cylinder (usually just TMK and change key; "in most properly designed systems, intermediate level master keys will operate automatically" because each digit of their bitting is contained in the TMK or change key; otherwise that digit must be pinned in). Source: Schlage SFIC manual.
2. Bottom pin = smallest bitting number in that chamber.
3. Master pin = deepest minus shallowest operating cut.
4. Top (driver) pin makes the stack equal the system's constant total, where one exists (see section 3 for interchangeable cores).
5. Check: with the plug turned, "the top surfaces should all line up evenly, about .050" below the top surface of the core" (Schlage SFIC manual).
6. Master pins of intermediate size: a forum post and a Scribd chart say you subtract adjacent bitting values and use the absolute value. https://www.lockpicking101.com/viewtopic.php?p=494420 and https://www.scribd.com/document/659020994/Basic-Master-Keying-Chart [FORUM; not opened]
7. Practical guard: manufacturers "suggest using thicker master pins of at least .030"" https://www.locksmithledger.com/home/article/21095739/masterkeying-by-the-numbers . Note A2 pins: the smallest master pin is 2B = .025" (see 1.4), so single-unit differences cannot be pinned directly on A2; that is why 2-step progression is used. (The 2B-minimum is from the Schlage pin list; the inference is mine.)

Conventional (non-interchangeable) cylinder pin-number ranges for Schlage: bottom 0-9, master 2-9, top 1-3 (retailer) https://clksupplies.com/pages/schlage-rekeying-guide

### 2.4 Cross keying, ghost keys, incidental master keys

- Definitions (ASSA ABLOY doc): cross keying is the deliberate combinating of a cylinder to two or more keys that would not normally operate it together. **Controlled** = same level under the same higher key (e.g. AA1 and AA2). **Uncontrolled** = under different higher keys (AA1 and AB1). Uncontrolled cross keying means "if one master is lost, so are all of its changes", reduces security and expansion. https://absupply.net/pdf/Corbin_Key_Systems.pdf
- Incidental master keys are also called "ghost" keys (Richard Howard, ALOA Keynotes, May 2021): the master-ring cylinder was patented to "prevent unwanted cross-keying combinations inherent in master key systems". https://absupply.net/pdf/Certificates/Richard-Howard-ALO-Key-05-21-Feature-MasterRingCylinders.pdf
- Mechanism: each extra master pin in a chamber creates another shear line, so any key whose cut in that chamber falls on that line works there. A forum poster computed 61 incidental masterkeys for a 6-pin cylinder with one master wafer in each chamber and 726 with double pinning in all chambers. https://www.lockpicking101.com/viewtopic.php?p=319843 (as summarized; **[FORUM], not verified; do not hard-code**).
- Mitigation consistent across sources: pin to the TMK and the shallowest individual key; minimize master pin count; eliminate differs that create cross keys when building the KBA; avoid cross keying and systems above four levels. Locksmith Ledger notes some differs become "unwanted lower level master keys" in rotating-constant systems.
- Design implication that is source-supported: a calculator should be able to enumerate which keys a given pinned cylinder accepts (every combination of per-chamber shear lines) and flag any accepted key that is not on the intended list. This is a safety check, not something a source gives as an algorithm. (My inference.)
- Whole-system rules in the ASSA ABLOY doc: record all cross keyed conditions; supply extra keys instead of cross keying; rekey after a lost master.

### 2.5 Terms: maison, construction master, SKD

- **Construction keying / construction master:** cores keyed to one construction master are installed at hardware delivery, keys go to the contractor, inspectors, etc.; at substantial completion permanent cores replace them and "construction cores are destroyed or returned"; the construction key bittings "should be excluded from the permanent change key range" (retailer). https://www.securityparts.com/master-key-system-design-guide
- **SKD** (appears as "SKD/Security keys" in the Corbin key-type list, and "Request for SKD or NMK keying" on its forms): NOT defined in the documents I read. **SKD definition: NOT CONFIRMED.** (Do not assume "Same Key Different".)
- **Maison key:** NOT CONFIRMED. I found no source in this pass using or defining "maison" keys (the term is used in European master-key practice; I did not locate a citation). Do not model it until sourced.

---

## 3. Interchangeable cores

### 3.1 Concept (SFIC, A2)

All from Schlage SFIC manual (link in 1.4):
- Each chamber has two shear lines: one for operating keys (change, master, grand master) and one for the control key. A **build-up pin** spans the distance between them; its length depends on the difference between the control key and the deepest operating key.
- A master-keyed core chamber normally has four pins: bottom, master, build-up, top.
- Cores are top-loaded; "never remove the plug"; all combinating is by numbers; the control lug must stay extended while pinning (turn plug about 90 degrees).
- Control key turns the plug a small angle to release the core. Sources differ on the angle: Matt Blaze says the control key rotates "only about 20 degrees" https://www.mattblaze.org/photos/misc/sfic/ ; a retailer says 15 degrees https://www.securityparts.com/master-key-system-design-guide . **Not material to the calculator; both recorded.**
- Control bitting at a position "may be higher, lower, or the same as an operating key", and the complete control bitting cannot also be an operating key (Matt Blaze).

### 3.2 Exact math, Schlage/A2 (6- and 7-chamber)

Per chamber, using pin numbers:
- Bottom pin (BP) = shallowest operating cut.
- Master pin (MP) = deepest operating cut minus shallowest operating cut.
- P ("plug total") = BP + MP = deepest operating cut.
- Build-up pin (BU) = Control cut + 10 - P.
- Top pin = 23 - (BP + MP + BU).
- "Memorize: Control + 10 - Plug Total + Build Up; Total Stack Height = 23."

Worked example in the manual (6 pins, tip to bow; Control 5 0 9 4 2 7; GM "A" 3 6 1 6 0 5; MK "AA" 1 2 3 6 0 5; CK "A1" 1 2 3 0 2 9):
- Chamber 1: shallowest 1, deepest-shallowest 2, BU = 5+10-3 = 12, sum 1+2+12 = 15, top = 8.
- Chamber 2: shallowest 2, diff 4, BU = 0+10-6 = 4, sum 10, top = 10.
- Chamber 3: shallowest 1, diff 2, BU = 9+10-3 = 16, sum 19, top = 4.
- Chamber 4: shallowest 0, diff 6, BU = 4+10-6 = 8, sum 14, top = 9.
- Chamber 5: shallowest 0, diff 2, BU = 2+10-2 = 10, sum 12, top = 11.
- Chamber 6: shallowest 5, diff 4, BU = 7+10-9 = 8, sum 17, top = 6.
I recomputed chamber 5 and Sargent chamber 3 (below) by hand; they match the printed tops.

Cautions:
- The "23" is a sum of **pin numbers**, not physical length. Bottom pins have an offset (0A = .110") that master/BU/top pins do not (nB = n x .0125"). Do not convert numbers to inches by multiplying.
- Possible pin-availability edge (my inference, verify): BU can compute to 1 when control cut = 0 and P = 9, but the kit lists master/build-up/top pins starting at 2B. Likewise top pin may need a size the kit lacks. The calculator should flag pin sizes that do not exist in the kit.
- Odd-numbered sizes 15B, 17B, 19B are "not used in pure 2-step progression" (Schlage), so a 2-step-aware pin list is required.

Locksmith Ledger's interchangeable core guide (examples contain arithmetic errors, so treat as secondary) https://locksmithledger.com/home/article/12440229/interchangeable-core-pinning-guide :
- A2: "Pin number totals in each chamber must total 23"; control plug diameter = control cut + 10; build-up = (control cut + 10) - bottom; top = 23 - temporary stack.
- A3: total stack 16; control plug diameter = control cut + 7; bottom/change rules same as A2.
- A4: total stack 14; control plug diameter = control cut + 6; bottom/change rules same as A2.
- Errors in that article: its A3 example text labels the top pin "10" though 16 - 10 = 6; its A4 text says "(14-9=6)" though 14 - 9 = 5. **Verify A3/A4 constants against a Best/dormakaba manual before coding.** I could not retrieve one. ("A3 was dropped" because it could interchange with A2 if you "jiggle" the key is a forum claim: https://www.lockpicking101.com/viewtopic.php?p=394719 .)

### 3.3 Sargent 6300 removable core (different rule)

Source: SARGENT 5100 & 6300 Removable Core Pinning Manual. https://s3.amazonaws.com/s3-absupply-net/pdf/sargent/sargent-5100-and-6300-removable-core-pinning-manual.pdf
- 6300: sleeve spans chambers 3 and 4; all key blanks same length. Control key bittings match the TMK in positions 1, 2, 5, 6; positions 3 and 4 are chosen from the KBA (this "significantly reduces the bittings available in the KBA of any TMK").
- Stack value 15 in chambers 1, 2, 5, 6; 20 in chambers 3 and 4.
- Chambers 3 and 4: control pin factor = control cut + 8; control split = factor - largest operating cut in that position; driver = 20 - (bottom + master split + control split). Hollow drivers and a special spring are required in chambers 3 and 4.
- Worked example in the manual: control cut in position 3 = 6, largest operating cut = 4 -> factor 14, control split 10; bottom 2, master 2 -> sum 14, driver 6 (matches printed "6").
- 5100 (older): control key is on a longer blank, constant in the extra position (6-pin: #3 control cut; operating keys have #7 on the tip slope; pin load always #7 bottom, #4 master, #11 top; 5-pin: always #6 control cut, operating keys #0, pin load #10 bottom, #4 master, #8 top). Half spring part 13-0215.
- The manual warns: "NEVER retro-actively create a 6300 Control Key".

### 3.4 LFIC (large format), short

Source: Schlage LFIC Service Manual (link in 1.2).
- Same formulas as SFIC for control chambers: "Control + 10 - Plug Total + Build Up", Total Stack Height = 23, but only in the two control chambers. Corbin Russwin LFIC control chambers = chambers 2 and 3; Sargent = chambers 3 and 4; the manual's Schlage example treats chambers 3 and 4 as control chambers with "Rule of 23".
- All other chambers use "the standard Schlage-15 rule". The extracted text does not spell out that rule beyond the pin tables, so **the exact Schlage-15 rule is NOT CONFIRMED from the text I extracted.** The pin table ties top pin to the plug total: top pin 1 (.235") for plug total 0-3, pin 2 (.200") for 4-6, pin 3 (.165") for 7-9.
- LFIC pins: bottom 0 = .165" up to 9 = .300" (step .015"); master pins 2 = .030" up to 18 = .270" (step .015"); depth data as Schlage Classic (section 1.2).
- Different from SFIC: larger core, Schlage Classic depth/MACS data (0-9 at .015", MACS 7) instead of A2 (.0125").

---

## 4. Existing software

| Product | Type / what it does | Platform | Price | Source |
|---|---|---|---|---|
| Aero Key (Aero Lock) | Master key design for 4-7 pin locks; manufacturer presets (vendor claims 15), adjustable settings, saves charts; aimed at locksmiths | Install; "saved and opened again in any Aero Key software" (desktop-style, not stated) | Not stated | https://clksupplies.com/blogs/news/31762689-master-keying-software |
| Aero IC (Aero Lock) | Includes an SFIC pinning calculator | Not stated | Not stated | https://clksupplies.com/blogs/news/locksmithing-101-sfic-pinning-the-easy-way-to-make-a-sfic-pinning-chart-with-aero-ic [SNIPPET] |
| HPC MasterKing | Designs/manages master key systems, hierarchies, pinning charts, expansion; exports Excel/CSV | Not stated | Not stated | https://www.lockpicks.com/masterking-software.html [SNIPPET; page returned 429 on fetch] |
| SimpleK / SimpleK Locksmith Edition | Master key system manager and key management (audit trails, outstanding/overdue keys, rekey tools); core pinning stack calculations | Not stated | Not stated | https://www.locksmithledger.com/home/product/55133490/simplek-simplek-locksmith-edition ; https://zensupply.com/simplek-premium-key-management-software [SNIPPET] |
| Locksoft (PowerKeyOne etc.) | Master key programs added | Not stated | Not stated | https://locksmithledger.com/business-technical-aids/press-release/11610509/locksoft-llc-locksoft-adds-master-key-programs [SNIPPET] |
| ASSA ABLOY Key Studio | Design and ordering tool for lockcharts, key ordering, floorplan import (EMEIA) | Online | Not stated | https://assaabloy.com/group/emeia/solutions/topics/Master-Key-Systems/key-studio [SNIPPET] |
| ABUS Online planner | Browser-based master key plan, doors, cylinders, keys | Browser | Not stated | https://www.abus.com/uk/News/Design-Masterkey-Systems-Online [SNIPPET] |
| Key Wizard (KeyWizard; ASSA ABLOY doc says "ask about Key Wizard key control software") | Key control: keys, keyholders, locations, multi-level password protection, multiple key systems, reports, key search, keyholder photos/signatures, authorization, loan/deposit tracking, maintenance history, import/export | Windows only | Not published | https://www.sourceforge.net/software/compare/InstaKey-vs-Key-Wizard (read) ; https://absupply.net/pdf/Corbin_Key_Systems.pdf |
| InstaKey / SecurityRecords.com | Key control program with restricted serialized blanks and cloud key records | Cloud only | Not published | https://www.sourceforge.net/software/compare/InstaKey-vs-Key-Wizard ; https://knowledge.instakey.com/knowledge/how-to-update-key-name-/-key-definition-in-security-records |
| KeyTrak | Key control / tracking | Not stated | "Contact vendor" | search summary via https://www.getapp.com (403 on fetch) [SNIPPET] |
| KeyBolt | Locksmith shop management with customer records including key codes and bitting data | Not stated | "99 per month" basic plan, currency not stated | https://www.getapp.com/all-software/a/keybolt/ [SNIPPET; 403 on fetch] |
| Pm5 | Called "the industry standard" master key program by a locksmith account | Not stated | Not stated | https://lsc.com.au/journey-of-master-keying [SNIPPET] |
| Manufacturer worksheets/slide charts | Paper/slide pinning charts, e.g. "LAB Easy Way I/Core Pinning Slide Chart for A2" and Sargent's own worksheet (about 5 minutes per door) | Paper | Printed charts about $10-15 per a search summary | https://www.americankeysupply.com/product/lab-easy-way-i-core-pinning-slide-chart-for-a2-system-lsc001-4130 ; https://www.acmelocksmith.com/articles/sargent-ic-core-pinning-calculator-how-to-pin-sargent-ic-cores/ [SNIPPET] |

Not found: published license prices for MasterKing, Key Wizard, InstaKey, KeyTrak, Aero Key, SimpleK. Keyscript, Keymaster Plus, and Medeco's own software: **NOT CONFIRMED** (not surfaced by search).

What the key-control products emphasize (feature list for scope reference only): keyholder records, issue/return, deposits, overdue alerts, authorization levels, multiple key systems, audit/reports, photos and signatures.

---

## 5. Security and legal points

### 5.1 Restricted and patented keyways

- Schlage: open keyways are "easily duplicated and available without any ordering formalities"; restricted keyways are "special non-stock keyways set aside for limited use" and "a letter of authorization is required to process" orders. https://absupply.net/pdf/Schlage_Restricted_Keyway_Catalog_and_Overview.pdf
- Everest 29: patented undercut groove; "U.S. utility patent 7,665,337 and design patent D689,759"; "It is a violation of federal patent law for anyone other than Schlage to manufacture and distribute these blanks" (LFIC manual, link 1.2). Patent protection "until 2029" (restricted keyway catalog above). Restricted blanks, cut keys and cores go only through authorized distributors with the end user's letter of authorization; shipments go directly to the end user or an authorized location.
- Medeco M4: a patented product, patent expires 2040; sidecuts assigned per keyway (Locksmith Ledger, link 1.10).
- **What this means for software (from the above):** record keyway family, restriction level, who authorized duplication, and the authorization letter on file. Calculator output for restricted systems is only useful for combinating (pinning), not for cutting, because blanks cannot be bought without authorization. Whether a given shop may legally cut/combinate a particular restricted system depends on the manufacturer's dealer program; I found no legal text beyond the manufacturer statements above. **State law on key duplication: NOT CONFIRMED / not researched.**

### 5.2 Why master key records must be access-controlled

- ASSA ABLOY Key Control Guide excerpt: "All key records shall be kept current at all times and are to be considered high security and confidential." The computerized format "shall use password protected and data encrypted software". https://absupply.net/pdf/Corbin_Key_Systems.pdf
- A bitting list plus a TMK bitting lets anyone cut a key that opens every cylinder in the system; also the stack formulas show the control key and TMK can be derived from each other's data. Matt Blaze notes the control key bitting "can be unambiguously determined from a single core simply by measuring the topmost pin of each pin stack", i.e. physical access leaks the control key. https://www.mattblaze.org/photos/misc/sfic/ (the second sentence is my inference from the source about why records matter.)
- Schlage advises against colored bottom pins since "colors can be read through the keyway with a lock scope, revealing the combination" (Schlage SFIC manual).

### 5.3 Typical key-control practices (ASSA ABLOY guide, same PDF)

- Key Control Authority appointed with authority to issue, return, and supervise storage and key cutting.
- Keys marked only with a blind code that does not reflect usage or level. "The use of standard key coding to mark cylinders or keys is not recommended"; keys "should not be marked M, MK, GMK, or GGMK"; keys "should not be stamped with bittings"; every issued key has an inventory or serial number that is unique per copy.
- Issue: authorized signer in addition to the keyholder; need not desire; photo ID; keyholder agreement signature; issue by duration of need; one copy of each keyset per individual (exceptions for approved multiple holders); standardized deposits (higher for master keys); keys duplicated or issued only through the Key Control Authority or authorized locksmith; return due date/time tracked, especially for temporary keys; shift key rings returned each shift and sealed tamper-evident.
- Return: returned to issuing department, deposit refund, return receipt; found keys go to the Key Control Authority; transfers need authorization and records.
- Lost/stolen: immediately recombinate accessible cylinders; rekey charges borne by the responsible party; repeat violations (two or more incidents within a year) can revoke privileges.
- Audits: annual random checks of at least 25% of keyholders; cylinders and keys changed or evaluated at intervals not exceeding five years; periodic audits of key cutters for unauthorized duplicates.
- Records should cross-reference keys x locations x keyholders in both directions; forms: key request (one form per key), key return, lost/stolen report, service form (cylinder recombination, SKD or NMK request, lock opening).
- Locksmith Ledger design advice: build around building areas, not job titles; get formal customer sign-off on the keying schematic; consider inscribing a blind code so a lost key can be matched to its owner; keep the design simple. https://www.locksmithledger.com/home/article/21119948/medeco-an-assa-abloy-group-brand-how-to-deploy-a-key-system-the-right-way-designing-the-system
- A "Do Not Duplicate" stamp: its legal effect and effectiveness were **NOT researched / NOT CONFIRMED** here. The sources above rely on restricted keyways and procedure, not stamps, and the ASSA ABLOY guide discourages marking keys with usage info.

---

## 6. Glossary

- **Bitting:** the list of cut depths on a key, one number per chamber, e.g. 1-2-3-0-2-9. Written tip to bow or bow to tip depending on the system (Schlage SFIC is tip to bow; other Schlage keys are the opposite per the SFIC manual).
- **Chamber / position:** one pin stack and its matching cut on the key.
- **Shear line:** the gap between the plug and the housing; the plug turns only when every pin stack breaks exactly there. Interchangeable cores have two: operating and control.
- **Bottom pin:** the pin touching the key; set by the shallowest operating cut.
- **Master pin (master wafer / split):** extra pin segment that creates a second shear line so another key (the master) also works.
- **Build-up pin:** in an interchangeable core, the pin that spans the distance between the operating shear line and the control shear line.
- **Top (driver) pin:** the pin sized to make the stack total match the system constant (e.g. 23 for A2 control chambers).
- **Control key:** key that releases an interchangeable core from its housing; it has its own bitting and shear line.
- **Operating key:** change, master, or grand master key that opens the lock.
- **Change key (CK):** key that opens one lock or one keyed-alike group; sub-master in some usage.
- **Master key (MK) / Grand master (GMK) / Great grand master (GGMK):** successive higher levels that open all groups beneath them. Top master key (TMK) is the highest key in a system.
- **Keyway:** the shape of the key slot and key blade profile; defines which blanks fit; may be open or restricted/patented.
- **MACS:** maximum adjacent cut specification: largest allowed depth difference between neighboring cuts, otherwise the key may not insert or withdraw (CLK PDF above).
- **Progression:** the rule that generates change-key bittings from the TMK. TPP (odometer) varies every position; rotating constant holds some TMK cuts and varies the others.
- **1-step / 2-step progression:** every depth allowed vs. only odd or only even depths in a chamber.
- **KBA (key bitting array):** the chart of allowed cuts for each position and their order, plus the sequence of progression.
- **SOP:** sequence of progression: the order in which positions change, like an odometer.
- **Differs:** the changing cuts in a rotating-constant change key.
- **Cross keying:** deliberately letting extra keys open a cylinder; controlled (same higher key) vs uncontrolled (different higher keys).
- **Ghost / incidental master key:** unintended key that opens a master-keyed cylinder because of extra shear lines.
- **Blind code:** a coded number on a key or chart that hides the bitting; translated to bitting via a chart or software.
- **Standard key coding symbols:** AA, AA1, 1AA style designations (section 2.1).
- **SFIC / LFIC:** small / large format interchangeable core.
- **Construction master / construction keying:** temporary system for builders, replaced with permanent cores at handover.
- **NMK:** not master keyed.
- **SKD:** NOT CONFIRMED (see section 2.5).
- **Maison key:** NOT CONFIRMED (see section 2.5).

---

## 7. Gaps list (what a developer must still source before shipping)

1. Depths, increment, first cut, spacing, MACS for Yale, Arrow, Weiser, Sargent, Corbin Russwin, Medeco, Falcon (only fragments above).
2. Schlage Classic first cut and cut spacing from a manufacturer or key machine maker (forum-only .156).
3. A3 and A4 pin tables and verified stack constants (Locksmith Ledger examples contain arithmetic errors).
4. Exact "Schlage-15" rule for LFIC non-control chambers and conventional Schlage top-pin rule.
5. Verbatim DHI definitions (TPP, RPP, key symbols); I read the ASSA ABLOY rendering of the standard, not the DHI text.
6. Definitions of "SKD" and "maison" key.
7. Kwikset spec from a manufacturer or a second independent source; SmartKey behavior.
8. Legal status of "Do Not Duplicate" and state duplication laws.
9. Software prices (none published among the vendors found).
10. CLK MACS chart values per brand (the PDF's table does not extract in order).

## 8. Source list (all URLs used)

1. https://us.allegion.com/content/dam/allegion-us-2/web-files/schlage/technical-documents/Schlage_Small_Format_Cores_Service_Manual_108230.pdf (read in full)
2. https://us.allegion.com/content/dam/allegion-us-2/web-files/schlage/technical-documents/Schlage_LFIC_Service_Manual_015806.pdf (read, text extracted)
3. https://s3.amazonaws.com/s3-absupply-net/pdf/sargent/sargent-5100-and-6300-removable-core-pinning-manual.pdf (read in full)
4. https://absupply.net/pdf/Corbin_Key_Systems.pdf (ASSA ABLOY Master Key System Design Guide + Key Control Guide, text extracted)
5. https://absupply.net/pdf/Schlage_Restricted_Keyway_Catalog_and_Overview.pdf (text extracted, grepped)
6. https://absupply.net/pdf/Certificates/Richard-Howard-ALO-Key-05-21-Feature-MasterRingCylinders.pdf (text extracted)
7. https://locksmithledger.com/home/article/12440229/interchangeable-core-pinning-guide
8. https://www.locksmithledger.com/home/article/21095739/masterkeying-by-the-numbers
9. https://locksmithledger.com/locks/article/12284967/mastering-the-art-of-masterkeying
10. https://www.locksmithledger.com/keys-tools/article/10290193/the-concepts-and-mechanics-of-master-keying-developing-master-keys-using-generic-types
11. https://www.locksmithledger.com/home/article/21119948/medeco-an-assa-abloy-group-brand-how-to-deploy-a-key-system-the-right-way-designing-the-system
12. https://www.locksmithledger.com/locks/cylinders-high-security/article/21247704/inside-the-medeco-4
13. https://www.mattblaze.org/photos/misc/sfic/
14. https://kc.allegion.com/kb/article/what-is-the-maximum-adjacent-cut-specification-or-macs (snippet; 403)
15. https://cdn.shopify.com/s/files/1/0839/9519/files/MACS.pdf (table not usable)
16. https://www.lockpicking101.com/viewtopic.php?p=226813 (Kwikset table)
17. https://www.lockpicking101.com/viewtopic.php?p=435347 (progression post)
18. https://www.lockpicking101.com/viewtopic.php?f=32&t=60892 (Schlage .156 claim)
19. https://www.lockpicking101.com/viewtopic.php?p=394719 and p=496564, p=319843, p=494420, p=280605, p=414627 (forum, snippet only)
20. https://clksupplies.com/pages/schlage-rekeying-guide ; https://clksupplies.com/blogs/news/space-depth-keys-locksmith-guide ; https://www.clksupplies.com/products/schlage-sc1-space-depth-k12-50-eys ; https://clksupplies.com/products/weiser-wr5-space-depth-keys ; https://clksupplies.com/blogs/news/31762689-master-keying-software
21. https://www.securityparts.com/master-key-system-design-guide
22. https://lockwiki.com/index.php/Kwikset_Classic (snippet; 500 on fetch)
23. https://www.sourceforge.net/software/compare/InstaKey-vs-Key-Wizard
24. https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7484446 (snippet)
25. Software pages listed in section 4 (snippet tier unless noted)

# Inventory clean-up — 2026-11-08

**What this is.** Your key/remote rows were imported from the distributor invoice with the whole description in *Part name* and the same text copied into *Fits*. Tonight the app learned to read that text, and this pass filled in the new fields on every row it could read with confidence. **Part names, SKUs, quantities, costs and prices were not touched.** Before-values are saved in  (one statement per row; running it puts everything back).

| | Count |
|---|---|
| Key rows reviewed | 253 |
| Rows changed | 242 |
| FCC ID filled in | 130 |
| Transponder chip filled in | 120 |
| Category corrected (Remote / Fob → Smart Key or Remote Head / Flip) | 112 |
| Fits rewritten as year / make / model lines | 238 |

**How the values were chosen.** FCC IDs come straight out of the description ("ENCORE 17-20 (HYQ4AA, PEPS)" → HYQ4AA). The chip is taken from the description first (G-CHIP, 4D-67, H, 80-BIT, B111…) and otherwise from a web check of that FCC ID across locksmith distributors (UHS Hardware, American Key Supply, Keyless2Go, North Coast Keyless, abkeys and others; two sources where they disagreed). The Fits list starts with what the distributor printed, then adds the other vehicles the FCC ID is sold for. Where an FCC ID is known to ship with **two different chips depending on the vehicle** (GQ4-53T on Ram vs Cherokee, HYQ12BBY 4D-67 vs G, the 2021+ GM "S" smart keys, …) the chip was **left blank for you** — see the first list below.

## Needs your eye (32 rows — chip left blank or FCC could not be verified)

| SKU | Part | FCC ID | Why |
|---|---|---|---|
| NIS-321 AM | Altima/MAXMA13-15(KR5S180144014 | KR5S180144014 | chip depends on vehicle/board for KR5S180144014 — set by hand |
| AUDI-1977-PX | AUDI 08-16 IYZFBSB802, with CO) | IYZFBSB802 | chip depends on vehicle/board for IYZFBSB802 — set by hand |
| TOY-175 AM | AVALON/CAMRY 06-10 (HYQ14AAB) | HYQ14AAB | chip depends on vehicle/board for HYQ14AAB — set by hand |
| GM-931 OEM | CAMARO/MALIBU (HYQ4ES) | HYQ4ES | chip depends on vehicle/board for HYQ4ES — set by hand |
| TOY-210 4D AM | CAMRY/COROLLA 06-11 (HYQ12BBY, | HYQ12BBY | chip depends on vehicle/board for HYQ12BBY — set by hand |
| FOBIK-2205 AM | CHEROKEE 14-23 (GQ4-53T) | GQ4-53T | chip depends on vehicle/board for GQ4-53T — set by hand |
| GM-905 AM | CHEVROLET/GMC 19-22 HYQ1EA/ES | HYQ1EA / HYQ1ES | chip depends on vehicle/board for HYQ1ES — set by hand |
| OHT5-1885 AM | CHRS/Dodge/JEP06-14(OHT692427AA) | OHT692427AA | chip depends on vehicle/board for OHT692427AA — set by hand |
| OHT3-1886 AM | Chrysler/Dodge 04-18(OHT692427AA) | OHT692427AA | chip depends on vehicle/board for OHT692427AA — set by hand |
| TOY-269 OEM | COROLLA/CAMRY 18-21 (HYQ12BFB, | HYQ12BFB | chip depends on vehicle/board for HYQ12BFB — set by hand |
| GM-1014 AM | EQUINOX 22-23 (HYQ4AS) | HYQ4AS | chip depends on vehicle/board for HYQ4AS — set by hand |
| GM-924 AM | EQUINOX/SPARK 21-22 HYQ4AS | HYQ4AS | chip depends on vehicle/board for HYQ4AS — set by hand |
| GM-1004 AM | GMC TERRAIN 21-24 (HYQ1AS) | HYQ1AS | chip depends on vehicle/board for HYQ1AS — set by hand |
| HYU-1319 OEM | Hyundai SONATA 20-23 (TQ8FOB4F27) | TQ8-FOB-4F27 | chip depends on vehicle/board for TQ8-FOB-4F27 — set by hand |
| HYU-1353 OEM | Hyundai TUCSON 22-24 (TQ8-FOB-4F27 | TQ8-FOB-4F27 | chip depends on vehicle/board for TQ8-FOB-4F27 — set by hand |
| LEX-23 AM | LEXUS 05-08 (HYQ14AAB) | HYQ14AAB | chip depends on vehicle/board for HYQ14AAB — set by hand |
| NIS-342 AM | NISSAN 15-18 (KR5S180144014) | KR5S180144014 | chip depends on vehicle/board for KR5S180144014 — set by hand |
| NIS-341 AM | NISSAN 2015-2018 (KR5S180144) | KR5S180144014 | chip depends on vehicle/board for KR5S180144014 — set by hand |
| NIS-332 AM | NISSAN ROGUE 14-19 (CWTWB1G) | CWTWB1G767 | chip depends on vehicle/board for CWTWB1G767 — set by hand |
| HYU-1423 OEM | PALISADE 23-24 (TQ8-FOB-4F27) | TQ8-FOB-4F27 | chip depends on vehicle/board for TQ8-FOB-4F27 — set by hand |
| FOBIK-2203 AM | RAM 13-18 with AIR (GQ4-53T) | GQ4-53T | chip depends on vehicle/board for GQ4-53T — set by hand |
| FOBIK-2201 AM | RAM 13-18 with RS (GQ4-53T) | GQ4-53T | chip depends on vehicle/board for GQ4-53T — set by hand |
| GM-13522854 OEM | SILVERADO 21-22 with TAIL(HYQ1ES) | HYQ1ES | chip depends on vehicle/board for HYQ1ES — set by hand |
| SUB-938 AM | SUBARU 12-19 with TRUNK (CWTWB1U | CWTWB1U | FCC not in research: CWTWB1U |
| TOY51 AM | TOY 12-21 HYQ14FBA/FBB | HYQ14FBA / HYQ14FBB | chip depends on vehicle/board for HYQ14FBA — set by hand |
| TOY-231 AM | TOY PRIUS 04-09 (MOZB21TG) | MOZB21TG | chip depends on vehicle/board for MOZB21TG — set by hand |
| TOY-250H-CHIP AM | TOY/SCI/LEX (HYQ12BDM)14-18 H | HYQ12BDM | chip depends on vehicle/board for HYQ12BDM — set by hand |
| TOY-210 SPR OEM | TOYOTA 06-11 (HYQ12BBY) SUPER | HYQ12BBY | chip depends on vehicle/board for HYQ12BBY — set by hand |
| TOY-238 AM | TOYOTA 07-13 (HYQ14AAB, E-BRD) | HYQ14AAB | chip depends on vehicle/board for HYQ14AAB — set by hand |
| TOY-215 AM | TOYOTA CAMRY 12-14 (HYQ12BDM, | HYQ12BDM | chip depends on vehicle/board for HYQ12BDM — set by hand |
| HYU-1269 AM | TUCSON 15-21 (TQ8-RKE-4F25) | TQ8-RKE-4F25 | chip depends on vehicle/board for TQ8-RKE-4F25 — set by hand |
| VW-1703 AM | VLKSWGN18-20(PEPS,NBGFS125C1) | NBGFS125C1 | chip depends on vehicle/board for NBGFS125C1 — set by hand |

## Remotes / smart keys with no FCC ID in the description (94 rows — add it from the box or the back of the fob)

- **FOBIK-2103 PX-1** — 08-14 300/ CHALLENGER/ CHARGER
- **TOY-255 AM** — 14-20 TOYOTA HIGHLANDER
- **GM-849 AM** — 16+ CAMARO/CRUZE/MALIBU (HYQ4E
- **CHRY-1695 AM** — 2012-2018 FIAT 500/500E
- **CHRY-1604 AM** — 300/CHALLENGER/CHARGER/DART 11
- **HON-499 AM** — ACCORD / CIVIC 2013-2015 4-Button
- **HON-520 AM** — ACCORD/CIVIC 2016-2018 4-Button
- **NIS-298 AM** — ALTIMA/MAXIMA 07-14 4 BUTTON
- **NIS-323 AM** — ALTIMA/MAXIMA 13-15 with RS & HAT
- **NIS-315** — ARMADA 08-15 4-Button KEY with HATCH
- **NIS-352 OEM** — ARMADA 17-21 with HATCH
- **NIS-301 AM** — ARMADA/PATH/ROGUE/VERSA 07-13
- **UNIV-IKEYD** — AUT-IKEYCR5TPR
- **TOY-238 AM E-BRD** — AVALON/CAM/COROLLA0 7-13 E-BRD
- **TOY-240 AM** — AVALON/CAMRY/COROLLA 09-14
- **BRK-BAF-03** — BAF IYZ 2008-2019
- **CAD-1145 AM** — CDLLC CTS/STS 08-14
- **GM-863 AM** — CHEVROLET 17-21 with REMOTE STAR
- **GM-1013 AM** — Chevrolet Silverado 2023 5-Button SMRT
- **GM-831 AM** — CHEVROLET/GMC 14-22 (M3N323)
- **GM-838 BLACK AM** — Chevrolet/GMC 15-20 with RS REMOTE
- **GM-928, GM-925** — Chevrolet/GMC SV 2021+ 6-Button SMR
- **CHRY-1618 AM** — CHRYSLER 200/300 2015-2021
- **Y164 AM** — CHRYSLER/DODGE/JEEP 04-19
- **OHT4-1883 AM** — CHRYSLER/DODGE/JEEP 2004-2018
- **Y160 AM** — CHRYSLER/DODGE/JEEP Y160
- **FOBICK-2153 AM** — Chrysler/Dodge/JP 08-19
- **FOBIK-2106 AM** — CHRYSLER/DODGE/VW VAN 08-19 FO
- **HON-517 AM** — CIVIC 16-21 with RS & TRNK
- **HON-514 REF** — CR-V/PILOT 16-21 with RS & TRNK
- **HON-514 AM** — CR-V/PILOT 16-21 with RS & TRNK
- **GM-874 AM** — CRUZE 16-20 (RPO-XL7)
- **CHRY-1610 OEM** — DODGE RAM 2013-2018 5-Button SK W
- **CHRY-1689-AM** — Dodge RM 1500 2019-2023 3-Button
- **CHRY-1612 AM** — DURANGO/CHEROKEE 14-22
- **FORD-R8067-80 AM** — EXPLORER/F-SERIES 11-20 with RMT
- **FORD-R8166 OEM** — F-SERIES TRUCKS/BRONCO 17-21 P
- **FORD-R8166 RC** — F-SERIES TRUCKS/BRONCO 17-21 P
- **CHRY-1622 AM** — FOR CHRYSLER/DODGE 2015-2023
- **FORD-R7995 AM** — FORD 12-17 (M3N5W)
- **FORD-R8269 AM** — FORD 20-24 (STRATTEC)
- **FORD-R8046 AM** — FORD 2011-2019 with TRUNK
- **FORD-R8117** — FORD F-150 2015-2017 5-Button
- **FORD-R8111** — FORD F-SRS/Explorer 15-17 3 Button
- **FORD-R8197 AM** — FORD SUVS/MAVERICK 2018-2024
- **FORD-R8130 AM** — FORD TRUCK/SUV 2015-2023
- **FORD-R8092 AM** — FORD/LINCOLN 11-20 PEPS 2ND-GE
- **FORD-R8073 AM** — Ford/Lincoln/Mazda 06-19 with TRNK
- **FORD-R7989 AM** — FUSION/Explorer/EDGE/STANG 13-20
- **GM-796 PX AM** — GM 10-19 REUSABLE PEPS
- **K-B120** — GM EXPRESS/SAVANA/SATURN...
- **GM-830 CHROME AM** — GMC SUV 15-20 with RMT START
- **HON-480 AM** — HONDA CIVIC / ODYSSEY 06-17
- **HON-484 AM** — HONDA CIVIC 2006-2011 4-Button
- **HON-508 AM** — HONDA CR-V 2015 - 2016
- **HON-501 OEM** — HONDA ODYSSEY 6 BUTTON
- **HYU-1333 AM** — Hyundai ELNTRA21-22...
- **INF-1527** — INFINITI Q50 2014-2016
- **FB-CHR-27 AM** — JEEP CHEROKEE 14-19 FOBIK with RS
- **CHRY-1642 AM** — JEEP COMPASS 2017-2020
- **CHRY-1637 AM** — JEEP COMPASS 2017-2023
- **CHRY-1643 AM** — JEEP RENEGADE 15-20 4-BUTTON
- **KIA-1157 OEM** — KIA 2014-2016 FLIP with HATCH
- **KIA-1185 OEM** — KIA RIO18-20 RHK with TRUNK
- **KIA-1196 REFURB** — KIA SOUL 2017-2019 RHK with HATCH
- **KIA-1182 AM** — KIA SPORTAGE 16-19 SK with HATCH
- **KIA-1200 AM** — KIA SPORTAGE 19-20 SMART
- **SUB-934 AM** — LEGACY/OUTBACK 10-14 (40BIT,DS
- **LEX-58 AM** — LEXUS LX/NX/RX 21 (HYQ1)
- **TOY48BT4** — LEXUS TOY48BT4
- **FORD-R8351** — LINCOLN NAVIGATOR 2023 5-B SK
- **UNIV-IKEYT** — MAXIIM IKEY 4-Button PROGRAMMABLE
- **UNIV-IKEYGM** — MAXIIM IKEY 5-Button
- **UNIV-IKEYH** — MAXIIM IKEY 5-Button
- **UNIV-IKEYN** — MAXIIM IKEY 5-Button PROGRAMMABLE
- **HU66-AM** — MFK REFILL BLDS_VW/AUDI/PRSCH
- **NIS-340 AM** — MURANO/PATHFINDER 15-18 5-B
- **NIS-307 AM** — NISSAN MURANO 2005-2008
- **NIS-351 AM** — NISSAN ROGUE 17-18 with RS & HATC
- **K-NI04** — NISSAN/INFINITI NI04
- **NIS-RHK 4 AM** — NISSAN/INFINITI/Chevrolet 03-19
- **PROMASTER-1 AM** — RAM PROMASTER 4 BUTTON...
- **SCION-1344 OEM** — SCION FR-S/TOYOTA 86 14-19
- **SCION-1334-AM** — SCN IQ/TC/XD 2005-2013 3-Button
- **KIA-1149 AM** — SOUL 14-19 REMOTE HEAD FLIP KE
- **B110 AM** — SUBARU/BM B110 AM
- **TOY-509 OEM** — TOYOTA CAMRY 18-24 SMART KEY (
- **GM-892 AM** — Trailblazer/CRUZE/EQUINOX/Traverse 18-20
- **FORD-R8236 AM** — TRANSIT/CONNECT 19-20
- **GM-876 AM** — TRAX/ENCORE 13-18
- **XH-XKTO22EN AM** — UNIVERSAL WIRED RHK FOR VVDI K
- **VW-1689-AM** — VW 2011-2016 4-Button KEY
- **CHRY-1683 AM** — Wagoneer/Cherokee 21-23...
- **CAD-1185 AM** — XT4/XT5/XT6 20-24 (HYQ2E)

## Descriptions the app could not read (15 rows — Fits left exactly as typed)

- **CHRY-1695 AM** — 2012-2018 FIAT 500/500E
- **UNIV-IKEYD** — AUT-IKEYCR5TPR
- **BRK-BAF-03** — BAF IYZ 2008-2019
- **GM-1013 AM** — Chevrolet Silverado 2023 5-Button SMRT
- **H91 AM** — FORD CONNECT 10-13 H91/FO21T17
- **FORD-H128-PT** — H128-PT TRANSPONDER KEY, HITAG
- **HY18/KK10 AM** — HY-18. HY-21,
- **UNIV-IKEYT** — MAXIIM IKEY 4-Button PROGRAMMABLE
- **UNIV-IKEYGM** — MAXIIM IKEY 5-Button
- **UNIV-IKEYH** — MAXIIM IKEY 5-Button
- **UNIV-IKEYN** — MAXIIM IKEY 5-Button PROGRAMMABLE
- **Metal Key** — Metal Key
- **HU66-AM** — MFK REFILL BLDS_VW/AUDI/PRSCH
- **XH-XKTO22EN AM** — UNIVERSAL WIRED RHK FOR VVDI K
- **MK-Y170 AM** — Y170-PT TRANSPONDER KEY, ID 46

## Everything that changed

Columns: new category (← marks a change) · FCC ID · chip · Fits.

| SKU | Part (unchanged) | Category | FCC ID | Chip | Fits |
|---|---|---|---|---|---|
| FOBIK-2103 PX-1 | 08-14 300/ CHALLENGER/ CHARGER | Remote / Fob |  |  | 2008-2014 Chrysler 300; 2008-2014 Dodge Challenger; 2008-2014 Dodge Charger |
| HON-502 OEM | 13-20 CRV/Cross/FIT(MLBHLIK6-1T | Remote Head / Flip ← | MLBHLIK6-1T | Honda G (ID47) | 2013-2020 Honda CR-V; 2013-2020 Honda Crosstour; 2013-2020 Honda Fit; 2013-2015 Honda Accord; 2014-2015 Honda Civic; 2014-2016 Honda CR-V; 2013-2015 Honda Crosstour; 2015-2020 Honda Fit; 2016-2021 Honda HR-V |
| TOY-255 AM | 14-20 TOYOTA HIGHLANDER | Remote / Fob |  |  | 2014-2020 Toyota Highlander |
| GM-849 AM | 16+ CAMARO/CRUZE/MALIBU (HYQ4E | Remote / Fob |  |  | 2016+ Chevrolet Camaro; 2016+ Chevrolet Cruze; 2016+ Chevrolet Malibu |
| CHRY-1628 AM | 17-25 7-Button (M3N97395900) | Smart Key ← | M3N97395900 | Hitag AES (4A) | 2017-2023 Chrysler Pacifica; 2020-2022 Chrysler Voyager |
| CHRY-1628 OEM | 17-25 7-Button (M3N97395900) | Smart Key ← | M3N97395900 | Hitag AES (4A) | 2017-2023 Chrysler Pacifica; 2020-2022 Chrysler Voyager |
| FORD-R8130 OEM | 2015-2021 3-BUTTON (N5F-A08TAA | Remote Head / Flip ← | N5F-A08TAA | Hitag Pro (ID49) | 2013-2016 Ford Fusion; 2015-2022 Ford F-150; 2017-2022 Ford F-250 Super Duty; 2017-2022 Ford F-350 Super Duty; 2016-2022 Ford Explorer; 2018-2022 Ford Expedition; 2019-2022 Ford Ranger; 2020-2024 Ford Escape; 2022-2024 Ford Maverick; 2019-2024 Ford Transit; 2019-2022 Ford Transit Connect |
| CHRY-1604 AM | 300/CHALLENGER/CHARGER/DART 11 | Remote / Fob |  |  | Chrysler 300; Dodge Challenger; Dodge Charger; Dodge Dart |
| HON-499 AM | ACCORD / CIVIC 2013-2015 4-Button | Remote / Fob |  |  | 2013-2015 Honda Accord; 2013-2015 Honda Civic |
| HON-488 AM | ACCORD 08-12 (KR55WK49308) | Remote Head / Flip ← | KR55WK49308 | Philips ID46 Honda | 2008-2012 Honda Accord; 2009-2015 Honda Pilot |
| HON-497-AM | ACCORD 08-14 4-Button (MLBHLIK-1T | Remote Head / Flip ← | MLBHLIK-1T | Philips ID46 Honda | 2008-2014 Honda Accord; 2007-2013 Honda CR-V; 2008-2012 Honda Accord; 2010-2012 Honda Accord Crosstour; 2011-2015 Honda CR-Z; 2009-2013 Honda Fit; 2010-2014 Honda Insight |
| HON-520 AM | ACCORD/CIVIC 2016-2018 4-Button | Remote / Fob |  |  | 2016-2018 Honda Accord; 2016-2018 Honda Civic |
| HON-482 AM | ACRD/ELMNT 03-10(OUCG8D-380H-A | Remote Head / Flip ← | OUCG8D-380H-A | Philips ID46 Honda | 2003-2010 Honda Accord; 2003-2010 Honda Element; 2003-2007 Honda Accord; 2005-2006 Honda CR-V; 2005-2010 Honda Odyssey; 2006-2014 Honda Ridgeline; 2007-2008 Honda Fit; 2010 Honda Element |
| ACURA-889 AM | ACURA MDX 07-13 (N5F0602A1A) | Remote Head / Flip ← | N5F0602A1A | Philips ID46 Honda | 2007-2013 Acura MDX; 2007-2012 Acura RDX |
| NIS-298 AM | ALTIMA/MAXIMA 07-14 4 BUTTON | Remote / Fob |  |  | 2007-2014 Nissan Altima; 2007-2014 Nissan Maxima |
| NIS-323 AM | ALTIMA/MAXIMA 13-15 with RS & HAT | Remote / Fob |  |  | 2013-2015 Nissan Altima; 2013-2015 Nissan Maxima |
| NIS-321 AM | Altima/MAXMA13-15(KR5S180144014 | Smart Key ← | KR5S180144014 |  | 2013-2015 Nissan Altima; 2013-2015 Nissan Maxima; 2016-2018 Nissan Altima; 2016-2018 Nissan Maxima; 2015-2018 Nissan Murano; 2013-2019 Nissan Pathfinder; 2016-2019 Nissan Titan |
| NIS-315 | ARMADA 08-15 4-Button KEY with HATCH | Remote / Fob |  |  | 2008-2015 Nissan Armada |
| NIS-352 OEM | ARMADA 17-21 with HATCH | Remote / Fob |  |  | 2017-2021 Nissan Armada |
| NIS-301 AM | ARMADA/PATH/ROGUE/VERSA 07-13 | Remote / Fob |  |  | 2007-2013 Nissan Armada; 2007-2013 Nissan Pathfinder; 2007-2013 Nissan Rogue; 2007-2013 Nissan Versa |
| AUDI-1977-PX | AUDI 08-16 IYZFBSB802, with CO) | Smart Key ← | IYZFBSB802 |  | 2009-2016 Audi A4; 2010-2016 Audi S4; 2008-2017 Audi A5; 2008-2017 Audi S5; 2009-2017 Audi Q5; 2014-2017 Audi SQ5 |
| TOY-238 AM E-BRD | AVALON/CAM/COROLLA0 7-13 E-BRD | Remote / Fob |  |  | Toyota Avalon; Toyota Camry; Toyota 7-13 |
| TOY-175 AM | AVALON/CAMRY 06-10 (HYQ14AAB) | Smart Key ← | HYQ14AAB |  | 2006-2010 Toyota Avalon; 2006-2010 Toyota Camry; 2007-2009 Toyota Camry; 2005-2010 Toyota Avalon; 2008-2013 Toyota Highlander; 2008-2012 Toyota RAV4; 2008-2009 Toyota Land Cruiser; 2010-2011 Toyota Prius |
| TOY-240 AM | AVALON/CAMRY/COROLLA 09-14 | Remote / Fob |  |  | 2009-2014 Toyota Avalon; 2009-2014 Toyota Camry; 2009-2014 Toyota Corolla |
| GM-893 AM | Blazer/Traverse-18-20 (HYQ4EA) | Smart Key ← | HYQ4EA | Philips ID46 GM Ext | 2018-2020 Chevrolet Blazer; 2018-2020 Chevrolet Traverse; 2016-2021 Chevrolet Camaro; 2016-2021 Chevrolet Malibu; 2016-2019 Chevrolet Cruze; 2018-2020 Chevrolet Equinox; 2018-2020 Buick Regal; 2017-2019 Buick LaCrosse |
| BMW-1451 AM | BMW 3/5 06-10 (KR55WK49127) | Smart Key ← | KR55WK49127 | Philips ID46 | 2006-2012 BMW 3 Series; 2005-2010 BMW 5 Series; 2007-2011 BMW 6 Series; 2008-2011 BMW X3; 2007-2013 BMW X5; 2008-2014 BMW X6; 2008-2013 BMW 1 Series; 2009-2016 BMW Z4 |
| GM-931 OEM | CAMARO/MALIBU (HYQ4ES) | Smart Key ← | HYQ4ES |  | Chevrolet Camaro; Chevrolet Malibu; 2021-2024 Chevrolet Camaro; 2021-2024 Chevrolet Malibu; 2021-2024 Chevrolet Blazer; 2021-2024 Chevrolet Trailblazer; 2021-2023 Chevrolet Traverse; 2022-2023 Chevrolet Bolt EV / EUV; 2024-2025 Chevrolet Trax |
| TOY-210 G AM | CAMRY 2011 (HYQ12BBY, G-CHIP) | Transponder | HYQ12BBY | Toyota G (4D-72) | 2011 Toyota Camry; 2007-2011 Toyota Camry; 2006-2011 Toyota RAV4; 2010-2018 Toyota 4Runner; 2010-2012 Toyota RAV4; 2010-2015 Toyota Yaris; 2015 Toyota Highlander |
| TOY-210 4D AM | CAMRY/COROLLA 06-11 (HYQ12BBY, | Remote Head / Flip ← | HYQ12BBY |  | 2006-2011 Toyota Camry; 2006-2011 Toyota Corolla; 2007-2011 Toyota Camry; 2006-2011 Toyota RAV4; 2010-2018 Toyota 4Runner; 2010-2012 Toyota RAV4; 2010-2015 Toyota Yaris; 2015 Toyota Highlander |
| TOY-250 FLP-AM | Camry/Corolla 14-17 (HYQ12BEL,H) | Remote Head / Flip ← | HYQ12BEL | Toyota H (8A) | 2014-2017 Toyota Camry; 2014-2017 Toyota Corolla; 2014-2019 Toyota Corolla; 2015-2017 Toyota Prius C; 2020-2021 Toyota 4Runner; 2016-2017 Scion FR-S; 2017 Toyota 86 |
| TOY-250 BL-AM | Camry/Corolla 14-18 (HYQ12BDM,H) | Remote Head / Flip ← | HYQ12BDM | Toyota H (8A) | 2014-2018 Toyota Camry; 2014-2018 Toyota Corolla; 2012-2014 Toyota Camry; 2014-2017 Toyota Camry; 2014-2019 Toyota Corolla; 2013-2018 Toyota RAV4; 2012-2019 Toyota Prius C; 2012-2017 Toyota Prius; 2016-2019 Toyota Tacoma; 2020-2021 Toyota 4Runner |
| CAD-1145 AM | CDLLC CTS/STS 08-14 | Remote / Fob |  |  | 2008-2014 Cadillac CTS; 2008-2014 Cadillac STS |
| FOBIK-2205 AM | CHEROKEE 14-23 (GQ4-53T) | Remote / Fob | GQ4-53T |  | 2014-2023 Jeep Cherokee; 2014-2021 Jeep Cherokee; 2014-2020 Jeep Grand Cherokee |
| GM-781 OEM | Chevrolet 10-22 (OHT01060512) | Remote Head / Flip ← | OHT01060512 | Philips ID46 GM Ext | 2010-2017 Chevrolet Equinox; 2010-2017 GMC Terrain; 2010-2016 Chevrolet Camaro; 2011-2016 Chevrolet Cruze; 2012-2019 Chevrolet Sonic; 2014-2019 Chevrolet Impala; 2013-2016 Chevrolet Malibu; 2014-2019 Buick Encore; 2012-2017 Buick Verano |
| GM-784 OEM | Chevrolet 11-21 OHT05918179 (STRAT) | Remote Head / Flip ← | OHT05918179 | Philips ID46 GM Ext | 2011-2015 Chevrolet Volt; 2011-2016 Chevrolet Cruze; 2013-2016 Chevrolet Malibu; 2014-2020 Chevrolet Impala; 2014-2017 Chevrolet SS; 2010-2017 Buick |
| GM-850 AM | CHEVROLET 16-20 (HYQ4AA) | Smart Key ← | HYQ4AA | Philips ID46 GM Ext | 2016-2021 Chevrolet Equinox; 2016-2020 Chevrolet Sonic; 2016-2022 Chevrolet Spark; 2017-2022 Chevrolet Trax; 2017-2022 Chevrolet Bolt EV; 2016-2019 Chevrolet Volt; 2016-2016 Chevrolet Cruze |
| GM-863 AM | CHEVROLET 17-21 with REMOTE STAR | Remote / Fob |  |  | 2017-2021 Chevrolet |
| GM-784 AM | CHEVROLET 211-19 OHT05918179 | Remote Head / Flip ← | OHT05918179 | Philips ID46 GM Ext | Chevrolet 211-19; 2011-2015 Chevrolet Volt; 2011-2016 Chevrolet Cruze; 2013-2016 Chevrolet Malibu; 2014-2020 Chevrolet Impala; 2014-2017 Chevrolet SS; 2010-2017 Buick |
| GM-831 AM | CHEVROLET/GMC 14-22 (M3N323) | Remote / Fob |  |  | 2014-2022 Chevrolet; 2014-2022 GMC |
| GM-838 BLACK AM | Chevrolet/GMC 15-20 with RS REMOTE | Remote / Fob |  |  | 2015-2020 Chevrolet; 2015-2020 GMC |
| GM-905 AM | CHEVROLET/GMC 19-22 HYQ1EA/ES | Smart Key ← | HYQ1EA / HYQ1ES |  | 2019-2022 Chevrolet Silverado 1500; 2020-2022 Chevrolet Silverado 2500HD / 3500HD; 2019-2022 GMC Sierra 1500; 2020-2022 GMC Sierra 2500HD / 3500HD; 2017-2020 GMC Acadia; 2018-2020 GMC Terrain; 2021-2023 Chevrolet Silverado 1500; 2021-2023 Chevrolet Silverado 2500HD / 3500HD; 2021-2023 GMC Sierra 1500; 2021-2023 GMC Sierra 2500HD / 3500HD; 2021-2023 GMC Acadia; 2021-2022 GMC Terrain |
| GM-928, GM-925 | Chevrolet/GMC SV 2021+ 6-Button SMR | Smart Key |  |  | 2021+ Chevrolet; 2021+ GMC |
| GM-862 AM | CHEVY 16-24 (LXP-T004, XL-8) | Remote Head / Flip ← | LXP-T004 | Philips ID46 GM Ext | 2016-2019 Chevrolet Cruze; 2021-2023 Chevrolet Trailblazer; 2024-2025 Chevrolet Trax |
| GM-862 OEM | CHEVY 16-24 (LXP-T004) | Remote Head / Flip ← | LXP-T004 | Philips ID46 GM Ext | 2016-2019 Chevrolet Cruze; 2021-2023 Chevrolet Trailblazer; 2024-2025 Chevrolet Trax |
| GM-840 OEM | CHEVY Suburban/TAHOE 15-20 (HYQ1AA) | Smart Key ← | HYQ1AA | Philips ID46 GM Ext | 2015-2020 Chevrolet Suburban; 2015-2020 Chevrolet Tahoe; 2015-2020 GMC Yukon; 2015-2020 GMC Yukon XL; 2018-2021 GMC Terrain |
| GM-917 AM | CHEVY/GMC 19-22 (M3N-32337200) | Remote / Fob | M3N-32337200 | None (remote only) | 2019-2023 Chevrolet Silverado 1500 / 2500HD / 3500HD; 2019-2023 GMC Sierra 1500 / 2500HD / 3500HD |
| OHT5-1885 AM | CHRS/Dodge/JEP06-14(OHT692427AA) | Remote Head / Flip ← | OHT692427AA |  | 2005-2007 Chrysler 300; 2004-2008 Chrysler Pacifica; 2006-2010 Chrysler PT Cruiser; 2007-2010 Chrysler Sebring; 2011-2014 Chrysler 200; 2007-2009 Chrysler Aspen; 2008-2014 Dodge Avenger; 2007-2012 Dodge Caliber; 2006-2007 Dodge Charger; 2005-2007 Dodge Magnum; 2005-2011 Dodge Dakota; 2004-2009 Dodge Durango; 2007-2011 Dodge Nitro; 2006-2008 Dodge Ram 1500; 2005-2007 Jeep Grand Cherokee; 2006-2007 Jeep Commander; 2007-2016 Jeep Compass; 2007-2016 Jeep Patriot; 2006-2016 Jeep Wrangler; 2008-2012 Jeep Liberty |
| FOBIK-2151 AM | CHRYS/DODGE 08-10 (IYZ-C01C) | Remote / Fob | IYZ-C01C | Philips ID46 Chrysler | 2008-2010 Chrysler 300; 2008-2016 Chrysler Town & Country; 2008-2020 Dodge Grand Caravan; 2008-2014 Dodge Challenger; 2008-2013 Dodge Charger; 2011-2013 Dodge Durango; 2008-2017 Dodge Journey; 2009-2012 Ram 1500; 2008-2013 Jeep Grand Cherokee; 2008-2010 Jeep Commander; 2009-2014 Volkswagen Routan |
| CHRY-1618 AM | CHRYSLER 200/300 2015-2021 | Remote / Fob |  |  | 2015-2021 Chrysler 200; 2015-2021 Chrysler 300 |
| OHT3-1886 AM | Chrysler/Dodge 04-18(OHT692427AA) | Remote Head / Flip ← | OHT692427AA |  | 2005-2007 Chrysler 300; 2004-2008 Chrysler Pacifica; 2006-2010 Chrysler PT Cruiser; 2007-2010 Chrysler Sebring; 2011-2014 Chrysler 200; 2007-2009 Chrysler Aspen; 2008-2014 Dodge Avenger; 2007-2012 Dodge Caliber; 2006-2007 Dodge Charger; 2005-2007 Dodge Magnum; 2005-2011 Dodge Dakota; 2004-2009 Dodge Durango; 2007-2011 Dodge Nitro; 2006-2008 Dodge Ram 1500; 2005-2007 Jeep Grand Cherokee; 2006-2007 Jeep Commander; 2007-2016 Jeep Compass; 2007-2016 Jeep Patriot; 2006-2016 Jeep Wrangler; 2008-2012 Jeep Liberty |
| FOBIK-2153 AM | Chrysler/Dodge 08-13 (IYZ-C01C) | Remote / Fob | IYZ-C01C | Philips ID46 Chrysler | 2008-2010 Chrysler 300; 2008-2016 Chrysler Town & Country; 2008-2020 Dodge Grand Caravan; 2008-2014 Dodge Challenger; 2008-2013 Dodge Charger; 2011-2013 Dodge Durango; 2008-2017 Dodge Journey; 2009-2012 Ram 1500; 2008-2013 Jeep Grand Cherokee; 2008-2010 Jeep Commander; 2009-2014 Volkswagen Routan |
| Y164 AM | CHRYSLER/DODGE/JEEP 04-19 | Remote / Fob |  |  | 2004-2019 Chrysler; 2004-2019 Dodge; 2004-2019 Jeep |
| OHT4-1883 AM | CHRYSLER/DODGE/JEEP 2004-2018 | Remote / Fob |  |  | 2004-2018 Chrysler; 2004-2018 Dodge; 2004-2018 Jeep |
| Y160 AM | CHRYSLER/DODGE/JEEP Y160 | Remote / Fob |  |  | Chrysler; Dodge; Jeep |
| FOBIK-2153PRX AM | Chrysler/Dodge/JEP(IYZ-C01C, PROX) | Smart Key | IYZ-C01C | Philips ID46 Chrysler | 2008-2010 Chrysler 300; 2008-2016 Chrysler Town & Country; 2008-2020 Dodge Grand Caravan; 2008-2014 Dodge Challenger; 2008-2013 Dodge Charger; 2011-2013 Dodge Durango; 2008-2017 Dodge Journey; 2009-2012 Ram 1500; 2008-2013 Jeep Grand Cherokee; 2008-2010 Jeep Commander; 2009-2014 Volkswagen Routan |
| FOBICK-2153 AM | Chrysler/Dodge/JP 08-19 | Remote / Fob |  |  | 2008-2019 Chrysler; 2008-2019 Dodge; 2008-2019 Jeep |
| FOBIK-2106 AM | CHRYSLER/DODGE/VW VAN 08-19 FO | Remote / Fob |  |  | 2008-2019 Chrysler; 2008-2019 Dodge; 2008-2019 Volkswagen |
| HON-498 AM | CIVIC 12-13/(N5F-A05TAA) | Remote Head / Flip ← | N5F-A05TAA | Philips ID46 Honda | 2012-2013 Honda Civic; 2014 Honda Accord Plug-In |
| HON-517 AM | CIVIC 16-21 with RS & TRNK | Remote / Fob |  |  | 2016-2021 Honda Civic |
| TOY-209-4D AM | Corolla/AVLN08-12(GQ4-29T, 4D-67 | Transponder | GQ4-29T | Texas 4D-67 | 2008-2012 Toyota Corolla; 2008-2012 Toyota Avalon; 2009-2013 Toyota Corolla; 2009-2014 Toyota Matrix; 2009-2016 Toyota Venza |
| TOY-269 OEM | COROLLA/CAMRY 18-21 (HYQ12BFB, | Remote Head / Flip ← | HYQ12BFB |  | 2018-2021 Toyota Corolla; 2018-2021 Toyota Camry; 2012-2014 Toyota Camry; 2014-2017 Toyota Camry; 2017-2018 Toyota Corolla; 2017-2018 Toyota Corolla iM |
| TOY-209 AM | Corolla/VENZA 10-15 (GQ4-29T,G) | Remote Head / Flip ← | GQ4-29T | Toyota G (4D-72) | 2010-2015 Toyota Corolla; 2010-2015 Toyota Venza; 2009-2013 Toyota Corolla; 2008-2012 Toyota Avalon; 2009-2014 Toyota Matrix; 2009-2016 Toyota Venza |
| HON-482 F AM | CR-V 2005-2006 (MEGAMOS 13) | Transponder |  | Megamos ID13 | 2005-2006 Honda CR-V |
| HON-515 AM | CR-V/HR-V 14-21(MLBHLIK6-1T) | Remote Head / Flip ← | MLBHLIK6-1T | Honda G (ID47) | 2014-2021 Honda CR-V; 2014-2021 Honda HR-V; 2013-2015 Honda Accord; 2014-2015 Honda Civic; 2014-2016 Honda CR-V; 2013-2015 Honda Crosstour; 2015-2020 Honda Fit; 2016-2021 Honda HR-V |
| HON-514 REF | CR-V/PILOT 16-21 with RS & TRNK | Remote / Fob |  |  | 2016-2021 Honda CR-V; 2016-2021 Honda Pilot |
| HON-514 AM | CR-V/PILOT 16-21 with RS & TRNK | Remote / Fob |  |  | 2016-2021 Honda CR-V; 2016-2021 Honda Pilot |
| GM-874 AM | CRUZE 16-20 (RPO-XL7) | Remote / Fob |  |  | 2016-2020 Chevrolet Cruze |
| GM-891 AM | CRUZE 2016-19/Blazer 21(LXP-T004 | Remote Head / Flip ← | LXP-T004 | Philips ID46 GM Ext | 2016-2019 Chevrolet Cruze; Chevrolet Blazer; 2021-2023 Chevrolet Trailblazer; 2024-2025 Chevrolet Trax |
| GM-910 AM | CRUZE/Trailblazer 19-21 (LXP-T004) | Remote Head / Flip ← | LXP-T004 | Philips ID46 GM Ext | 2019-2021 Chevrolet Cruze; 2019-2021 Chevrolet Trailblazer; 2016-2019 Chevrolet Cruze; 2021-2023 Chevrolet Trailblazer; 2024-2025 Chevrolet Trax |
| DART-3 AM | DART 12-16 (M3N32297100) | Remote / Fob | M3N32297100 | Philips ID46 Chrysler | 2012-2016 Dodge Dart; 2013-2016 Dodge Dart |
| CHRY-1610 OEM | DODGE RAM 2013-2018 5-Button SK W | Smart Key ← |  |  | 2013-2018 Dodge; 2013-2018 Ram |
| CHRY-1689-AM | Dodge RM 1500 2019-2023 3-Button | Remote / Fob |  |  | 2019-2023 Ram 1500 |
| CHRY-1651 AM | Dodge RM 150019-24 (OHT-4882056) | Smart Key ← | OHT-4882056 | Hitag AES (4A) | 2019-2024 Ram 1500 |
| CHRY-1612 AM | DURANGO/CHEROKEE 14-22 | Remote / Fob |  |  | 2014-2022 Dodge Durango; 2014-2022 Jeep Cherokee |
| HYU-1278 AM | ELANTRA 16-18 (CQOFD00120) | Smart Key ← | CQOFD00120 | Texas 8A DST-AES | 2016-2018 Hyundai Elantra; 2016-2020 Hyundai Elantra; 2018-2019 Hyundai Sonata |
| GM-867 AM | ENCORE 17-20 (HYQ4AA, PEPS) | Smart Key | HYQ4AA | Philips ID46 GM Ext | 2017-2020 Buick Encore; 2016-2021 Chevrolet Equinox; 2016-2020 Chevrolet Sonic; 2016-2022 Chevrolet Spark; 2017-2022 Chevrolet Trax; 2017-2022 Chevrolet Bolt EV; 2016-2019 Chevrolet Volt; 2016-2016 Chevrolet Cruze |
| GM-880 AM | EQUINOX 18-21 (HYQ4AA) | Smart Key ← | HYQ4AA | Philips ID46 GM Ext | 2018-2021 Chevrolet Equinox; 2016-2021 Chevrolet Equinox; 2016-2020 Chevrolet Sonic; 2016-2022 Chevrolet Spark; 2017-2022 Chevrolet Trax; 2017-2022 Chevrolet Bolt EV; 2016-2019 Chevrolet Volt; 2016-2016 Chevrolet Cruze |
| GM-1014 AM | EQUINOX 22-23 (HYQ4AS) | Smart Key ← | HYQ4AS |  | 2022-2023 Chevrolet Equinox; 2021-2024 Chevrolet Equinox; 2021-2022 Chevrolet Spark; 2021-2022 Chevrolet Trax |
| GM-924 AM | EQUINOX/SPARK 21-22 HYQ4AS | Smart Key ← | HYQ4AS |  | 2021-2022 Chevrolet Equinox; 2021-2022 Chevrolet Spark; 2021-2024 Chevrolet Equinox; 2021-2022 Chevrolet Trax |
| FORD-R8355 AM | EXPEDITION 23-24 M3N-A3C108397 | Smart Key ← | M3N-A3C108397 | Hitag Pro (ID49) | 2023-2024 Ford Expedition; 2023-2025 Ford F-150; 2023-2025 Ford Explorer; 2023-2025 Ford Expedition; 2023-2024 Ford Mustang |
| FORD-R8067-80 AM | EXPLORER/F-SERIES 11-20 with RMT | Remote / Fob |  |  | 2011-2020 Ford Explorer; 2011-2020 Ford F-150; 2011-2020 Ford F-250; 2011-2020 Ford F-350 |
| FORD-R8166 OEM | F-SERIES TRUCKS/BRONCO 17-21 P | Remote / Fob |  |  | 2017-2021 Ford F-150; 2017-2021 Ford F-250; 2017-2021 Ford F-350; 2017-2021 Ford Bronco |
| FORD-R8166 RC | F-SERIES TRUCKS/BRONCO 17-21 P | Remote / Fob |  |  | 2017-2021 Ford F-150; 2017-2021 Ford F-250; 2017-2021 Ford F-350; 2017-2021 Ford Bronco |
| FORD-R7976 AM | FIESTA 2015-2019 (CWTWB1U793) | Remote Head / Flip ← | CWTWB1U793 | Texas 4D-63 80-bit | 2015-2019 Ford Fiesta; 2007-2012 Ford Escape; 2011-2015 Ford Explorer; 2008-2011 Ford Focus; 2010-2014 Ford Mustang; 2011-2014 Ford Edge; 2011-2019 Ford Flex; 2012-2019 Ford Taurus; 2009-2017 Ford Expedition |
| FORD-R8147 AM | FOCUS 15-19 (KR5876268) | Smart Key ← | KR5876268 | Hitag Pro (ID49) | 2015-2019 Ford Focus; 2015-2018 Ford Focus |
| CHRY-1622 AM | FOR CHRYSLER/DODGE 2015-2023 | Remote / Fob |  |  | 2015-2023 Chrysler; 2015-2023 Dodge |
|  | ford |  |  |  | Ford |
| FORD-R8048 AM | FORD 07-16 (KR55WK48801) | Smart Key ← | KR55WK48801 | Texas 4D-63 80-bit | 2011-2019 Ford Fiesta; 2012-2018 Ford Focus; 2013-2019 Ford C-Max |
| FORD-R7995 AM | FORD 12-17 (M3N5W) | Remote / Fob |  |  | 2012-2017 Ford |
| FORD-R8149 OEM | FORD 17-20 (M3N-A2C931426) | Smart Key ← | A2C93142600 | Hitag Pro (ID49) | 2017-2022 Ford Edge; 2018-2022 Ford Expedition; 2018-2022 Ford Explorer; 2017-2021 Ford Fusion; 2018-2022 Ford Mustang; 2017-2024 Ford F-150; 2017-2022 Ford F-250 Super Duty; 2017-2022 Ford F-350 Super Duty; 2017-2022 Ford F-450 Super Duty; 2020-2022 Ford Escape; 2021-2022 Ford Bronco |
| FORD-R8149 AM | FORD 17-20 with RS (A2C93142600) | Smart Key ← | A2C93142600 | Hitag Pro (ID49) | 2017-2022 Ford Edge; 2018-2022 Ford Expedition; 2018-2022 Ford Explorer; 2017-2021 Ford Fusion; 2018-2022 Ford Mustang; 2017-2024 Ford F-150; 2017-2022 Ford F-250 Super Duty; 2017-2022 Ford F-350 Super Duty; 2017-2022 Ford F-450 Super Duty; 2020-2022 Ford Escape; 2021-2022 Ford Bronco |
| FORD-R8150 AM | FORD 17-22 (A2C93142300) | Smart Key ← | A2C93142300 | Hitag Pro (ID49) | 2021-2022 Ford Bronco; 2018-2023 Ford EcoSport; 2017-2022 Ford Edge; 2020-2023 Ford Escape; 2018-2022 Ford Explorer; 2017-2021 Ford Fusion; 2018-2022 Ford Mustang; 2019-2023 Ford Ranger |
| H72-AM | FORD 1996-2006 H72 | Transponder |  | Texas 4C | 1996-2006 Ford |
| FORD-R8269 AM | FORD 20-24 (STRATTEC) | Remote / Fob |  |  | 2020-2024 Ford |
| FORD H92-AM | FORD 2000+ H92/H84/H85 80-BIT | Transponder |  | Texas 4D-63 80-bit | 2000+ Ford |
| FORD-R8046 AM | FORD 2011-2019 with TRUNK | Remote / Fob |  |  | 2011-2019 Ford |
| FORD-R8134 AM | FORD 2015-2023 (N5F-A08TDA) | Remote Head / Flip ← | N5F-A08TDA | Hitag Pro (ID49) | 2015-2020 Ford F-150; 2017-2022 Ford F-250 Super Duty; 2017-2022 Ford F-350 Super Duty; 2017-2022 Ford F-450 Super Duty; 2017-2022 Ford F-550 Super Duty; 2017-2020 Ford F-150 Raptor; 2019-2022 Ford Ranger |
| FORD-R8334 AM | FORD 23-25 REMOTE N5F-A08TBLP | Remote Head / Flip ← | N5F-A08TBLP | Hitag Pro (ID49) | 2024-2026 Ford F-150; 2023-2025 Ford F-250 Super Duty; 2023-2025 Ford F-350 Super Duty; 2023-2025 Ford F-450 Super Duty; 2023-2025 Ford F-550 Super Duty; 2023-2025 Ford F-600 Super Duty; 2023-2024 Ford Expedition; 2025 Ford Maverick; 2025 Ford Ranger |
| FORD-R8412 OEM | FORD BRONCO 25 (M3N-A3C108397) | Smart Key ← | M3N-A3C108397 | Hitag Pro (ID49) | Ford Bronco; 2023-2025 Ford F-150; 2023-2025 Ford Explorer; 2023-2025 Ford Expedition; 2023-2024 Ford Mustang |
| H91 AM | FORD CONNECT 10-13 H91/FO21T17 | Transponder |  | Texas 4D-63 80-bit | FORD CONNECT 10-13 H91/FO21T17 |
| FORD-R8355 OEM | FORD Expedition M3N-A3C108397 | Smart Key ← | M3N-A3C108397 | Hitag Pro (ID49) | Ford Expedition; 2023-2025 Ford F-150; 2023-2025 Ford Explorer; 2023-2025 Ford Expedition; 2023-2024 Ford Mustang |
| FORD-R8117 | FORD F-150 2015-2017 5-Button | Remote / Fob |  |  | 2015-2017 Ford F-150 |
| FORD-R8111 | FORD F-SRS/Explorer 15-17 3 Button | Remote / Fob |  |  | 2015-2017 Ford F-150; 2015-2017 Ford F-250; 2015-2017 Ford F-350; 2015-2017 Ford Explorer |
| H94 AM | Ford H94 2011+HS HU101 Transponder | Transponder |  | Texas 4D-63 80-bit | Ford |
| FORD-R8197 AM | FORD SUVS/MAVERICK 2018-2024 | Remote / Fob |  |  | 2018-2024 Ford Maverick |
| FORD-R8130 AM | FORD TRUCK/SUV 2015-2023 | Remote / Fob |  |  | 2015-2023 Ford |
| FORD-R8092 AM | FORD/LINCOLN 11-20 PEPS 2ND-GE | Smart Key |  |  | 2011-2020 Ford; 2011-2020 Lincoln |
| FORD-R8073 AM | Ford/Lincoln/Mazda 06-19 with TRNK | Remote / Fob |  |  | 2006-2019 Ford; 2006-2019 Lincoln; 2006-2019 Mazda |
| H86/74 | FORD/LINCOLN/MAZDA 2000-2005 H | Transponder |  |  | 2000-2005 Ford; 2000-2005 Lincoln; 2000-2005 Mazda |
| FORD-R8000 AM | Ford/Lincoln/MCRY01-18 CWTWB1U793 | Remote Head / Flip ← | CWTWB1U793 | Texas 4D-63 80-bit | 2007-2012 Ford Escape; 2011-2015 Ford Explorer; 2008-2011 Ford Focus; 2010-2014 Ford Mustang; 2011-2014 Ford Edge; 2011-2019 Ford Flex; 2012-2019 Ford Taurus; 2009-2017 Ford Expedition; 2015-2019 Ford Fiesta |
| FORD-R7986 AM | FUSION 2013-2016 (N5F-A08TAA) | Remote Head / Flip ← | N5F-A08TAA | Hitag Pro (ID49) | 2013-2016 Ford Fusion; 2015-2022 Ford F-150; 2017-2022 Ford F-250 Super Duty; 2017-2022 Ford F-350 Super Duty; 2016-2022 Ford Explorer; 2018-2022 Ford Expedition; 2019-2022 Ford Ranger; 2020-2024 Ford Escape; 2022-2024 Ford Maverick; 2019-2024 Ford Transit; 2019-2022 Ford Transit Connect |
| FORD-R7989 AM | FUSION/Explorer/EDGE/STANG 13-20 | Remote / Fob |  |  | 2013-2020 Ford Fusion; 2013-2020 Ford Explorer; 2013-2020 Ford Edge; 2013-2020 Ford Mustang |
| GM-588 OEM | GM 01-05 (KOBLEAR1XT) | Remote / Fob | KOBLEAR1XT | None (remote only) | 2001-2002 Chevrolet Silverado / Suburban / Tahoe / Avalanche; 2001-2002 GMC Sierra / Yukon / Yukon XL; 2002-2002 Cadillac Escalade; 2001-2004 Chevrolet S10 / GMC Sonoma; 2001-2005 Chevrolet Astro / Blazer / GMC Jimmy / Safari; 2001-2005 Pontiac Grand Am; 2001-2005 Chevrolet Malibu / Impala / Monte Carlo; 2001-2004 Chevrolet Corvette; 2003-2006 Chevrolet SSR; 2001-2005 Buick LeSabre / Century / Regal; 2001-2004 Cadillac DeVille / Seville; 2001-2005 Oldsmobile Alero / Aurora; 2001-2011 Chevrolet Express / GMC Savana |
| GM-655 AM | GM 07-17 OUC60270/221 | Remote / Fob | OUC60270 | None (remote only) | 2007-2014 Chevrolet Tahoe; 2007-2014 Chevrolet Suburban; 2007-2014 GMC Yukon / Yukon XL; 2007-2013 Chevrolet Silverado; 2007-2013 GMC Sierra; 2009-2016 Chevrolet Traverse; 2007-2016 GMC Acadia; 2008-2016 Buick Enclave; 2007-2014 Cadillac Escalade; 2006-2011 Cadillac DTS; 2006-2011 Buick Lucerne; 2006-2013 Chevrolet Impala; 2006-2007 Chevrolet Monte Carlo; 2010-2017 Chevrolet Equinox; 2007-2009 Saturn Outlook; 2008-2010 Saturn Vue; 2007-2009 Pontiac Torrent; 2007-2009 Suzuki XL-7; 2008-2024 Chevrolet Express / GMC Savana |
| GM-793 AM | GM 10-19 5-Button OHT01060512 | Remote Head / Flip ← | OHT01060512 | Philips ID46 GM Ext | 2010-2017 Chevrolet Equinox; 2010-2017 GMC Terrain; 2010-2016 Chevrolet Camaro; 2011-2016 Chevrolet Cruze; 2012-2019 Chevrolet Sonic; 2014-2019 Chevrolet Impala; 2013-2016 Chevrolet Malibu; 2014-2019 Buick Encore; 2012-2017 Buick Verano |
| GM-796 PX AM | GM 10-19 REUSABLE PEPS | Smart Key |  |  | 2010-2019 GM |
| B107-AM | GM B107/PT04 PK3 Z 691205 TRNS | Transponder |  | Megamos ID13 (PK3) | GM |
| K-B111 AM | GM B111 CIRCLE-PLUS 2005-2017 | Transponder |  | Philips ID46 GM Circle+ | 2005-2017 GM |
| B119-AM | GM B119 2010+ 8 OR 10-CT TRNPN | Transponder |  | Philips ID46 GM Ext | 2010+ GM |
| B119-HU100 SC-AM | GM B119/HU100 SUPERCHIP | Transponder |  | Philips ID46 GM Ext | GM |
| B97-PT-AM | GM B97 PK3 SMLL HD 690552 TRNS | Transponder |  | Megamos ID13 (PK3) | GM |
| GM B99-PT AM | GM B99 TRANSPONDER KEY | Transponder |  | Megamos ID13 (PK3+) | GM |
| K-B120 | GM EXPRESS/SAVANA/SATURN... | Remote / Fob |  |  | Chevrolet Express; GMC Savana |
| GM-830 CHROME AM | GMC SUV 15-20 with RMT START | Remote / Fob |  |  | 2015-2020 GMC |
| GM-1004 AM | GMC TERRAIN 21-24 (HYQ1AS) | Smart Key ← | HYQ1AS |  | 2021-2024 GMC Terrain |
| GM-840 AM | GMC/Chevrolet Suburban/Tahoe/Yukon 15-20 (HYQ1AA) | Smart Key ← | HYQ1AA | Philips ID46 GM Ext | 2015-2020 Chevrolet Suburban; 2015-2020 Chevrolet Tahoe; 2015-2020 GMC Yukon; 2015-2020 GMC Yukon XL; 2018-2021 GMC Terrain |
| FORD-H128-PT | H128-PT TRANSPONDER KEY, HITAG | Transponder |  | Hitag Pro ID49 (128-bit) | H128-PT TRANSPONDER KEY, HITAG |
| TOY-248 AM H-CHP | HIGH/RAV4/SEQUOIA13-18(H-CHIP) | Transponder |  | Toyota H (8A) | 2013-2018 Toyota Highlander; 2013-2018 Toyota RAV4; 2013-2018 Toyota Sequoia |
| MK-HD106 | HONDA / ACURA HD106 KEY | Transponder |  | Megamos ID13 | Honda; Acura |
| HON-486 AM | HONDA 07-13 (MLBHLIK-1T) | Remote Head / Flip ← | MLBHLIK-1T | Philips ID46 Honda | 2007-2013 Honda CR-V; 2008-2012 Honda Accord; 2010-2012 Honda Accord Crosstour; 2011-2015 Honda CR-Z; 2009-2013 Honda Fit; 2010-2014 Honda Insight |
| HON-480 AM | HONDA CIVIC / ODYSSEY 06-17 | Remote / Fob |  |  | 2006-2017 Honda Civic; 2006-2017 Honda Odyssey |
| HON-484 AM | HONDA CIVIC 2006-2011 4-Button | Remote / Fob |  |  | 2006-2011 Honda Civic |
| HON-508 AM | HONDA CR-V 2015 - 2016 | Remote / Fob |  |  | 2015-2016 Honda CR-V |
| MK-HO05 AM | HONDA HO05 2013+ G-CHIP | Transponder |  | Honda G (ID47) | 2013+ Honda |
| HON-501 OEM | HONDA ODYSSEY 6 BUTTON | Remote / Fob |  |  | Honda Odyssey |
| MK-HO01 AM | HONDA/ACURA 02-06 | Transponder |  |  | 2002-2006 Honda; 2002-2006 Acura |
| MK-HO03 AM | HONDA/ACURA 06-17 | Transponder |  |  | 2006-2017 Honda; 2006-2017 Acura |
| HY18/KK10 AM | HY-18. HY-21, | Transponder |  | Texas 4D-60 | HY-18. HY-21, |
| HYU-1333 OEM | Hyundai ELANTRA 21 (NYOMBEC5FOB200 | Smart Key ← | NYOMBEC5FOB2004 | Hitag AES (6A) | Hyundai Elantra; 2021-2024 Hyundai Elantra |
| HYU-1333 AM | Hyundai ELNTRA21-22... | Remote / Fob |  |  | Hyundai Elantra; Hyundai 21-22 |
| HYU-1319 OEM | Hyundai SONATA 20-23 (TQ8FOB4F27) | Smart Key ← | TQ8-FOB-4F27 |  | 2020-2023 Hyundai Sonata; 2022-2024 Hyundai Tucson; 2021-2023 Hyundai Santa Fe; 2022-2024 Hyundai Santa Cruz; 2022-2023 Hyundai Palisade |
| HYU-1353 OEM | Hyundai TUCSON 22-24 (TQ8-FOB-4F27 | Smart Key ← | TQ8-FOB-4F27 |  | 2022-2024 Hyundai Tucson; 2020-2023 Hyundai Sonata; 2021-2023 Hyundai Santa Fe; 2022-2024 Hyundai Santa Cruz; 2022-2023 Hyundai Palisade |
| KIA-1140 AM | HYUNDAI/KIA 09-15(SY5HMFNA04) | Smart Key ← | SY5HMFNA04 | Philips ID46 | 2011-2015 Hyundai Sonata; 2011-2015 Hyundai Azera; 2009-2014 Hyundai Genesis Sedan; 2010-2011 Hyundai Genesis Coupe; 2011-2014 Hyundai Elantra; 2013-2015 Hyundai Elantra GT; 2012-2017 Hyundai Veloster; 2012-2017 Hyundai Tucson; 2011-2013 Kia Optima; 2011-2013 Kia Forte; 2011-2013 Kia Sportage; 2011-2013 Kia Soul; 2009-2013 Kia Sorento; 2009-2011 Kia Borrego |
| INF-1527 | INFINITI Q50 2014-2016 | Remote / Fob |  |  | 2014-2016 Infiniti Q50 |
| FB-CHR-27 AM | JEEP CHEROKEE 14-19 FOBIK with RS | Remote / Fob |  |  | 2014-2019 Jeep Cherokee |
| MK-Y199 AM | JEEP CHEROKEE 2014-19 | Transponder |  |  | 2014-2019 Jeep Cherokee |
| CHRY-1642 AM | JEEP COMPASS 2017-2020 | Remote / Fob |  |  | 2017-2020 Jeep Compass |
| CHRY-1637 AM | JEEP COMPASS 2017-2023 | Remote / Fob |  |  | 2017-2023 Jeep Compass |
| CHRY-1643 AM | JEEP RENEGADE 15-20 4-BUTTON | Remote / Fob |  |  | 2015-2020 Jeep Renegade |
| KIA-1157 OEM | KIA 2014-2016 FLIP with HATCH | Remote Head / Flip |  |  | 2014-2016 Kia |
| KIA-1160 AM | KIA OPTIMA 14-16 (SY5XMFNA433) | Remote / Fob | SY5XMFNA433 |  | 2014-2016 Kia Optima; 2013-2015 Kia Sorento; 2013-2015 Kia Carens |
| KIA-1172 AM | KIA OPTIMA 16-20 (SY5JFFGE04) | Smart Key ← | SY5JFFGE04 | Hitag 3 (ID47) | 2016-2020 Kia Optima; 2016-2020 Kia Optima Hybrid; 2016-2020 Kia Optima PHEV |
| KIA-1151 AM | KIA OPTIMA/RIO14-17(SY5XMFNA04 | Smart Key ← | SY5XMFNA04 | Philips ID46 | 2014-2017 Kia Optima; 2014-2017 Kia Rio; 2013-2015 Kia Sorento |
| KIA-1185 OEM | KIA RIO18-20 RHK with TRUNK | Remote Head / Flip |  |  | 2018-2020 Kia Rio |
| KIA-1196 REFURB | KIA SOUL 2017-2019 RHK with HATCH | Remote Head / Flip |  |  | 2017-2019 Kia Soul |
| KIA-1182 AM | KIA SPORTAGE 16-19 SK with HATCH | Smart Key ← |  |  | 2016-2019 Kia Sportage |
| KIA-1200 AM | KIA SPORTAGE 19-20 SMART | Smart Key |  |  | 2019-2020 Kia Sportage |
| SUB-934 AM | LEGACY/OUTBACK 10-14 (40BIT,DS | Remote / Fob |  | Texas 4D 40-bit | 2010-2014 Subaru Legacy; 2010-2014 Subaru Outback |
| LEX-09 AM | LEXUS 04-09 (HYQ12BBT, 4D-68) | Transponder | HYQ12BBT | Texas 4D-68 | 1998-2002 Toyota Land Cruiser; 2003-2007 Toyota Land Cruiser; 2007-2009 Toyota FJ Cruiser; 2010-2014 Toyota FJ Cruiser; 2004-2010 Lexus ES330/RX330/RX350 |
| LEX-23 AM | LEXUS 05-08 (HYQ14AAB) | Smart Key ← | HYQ14AAB |  | 2007-2009 Toyota Camry; 2005-2010 Toyota Avalon; 2008-2013 Toyota Highlander; 2008-2012 Toyota RAV4; 2008-2009 Toyota Land Cruiser; 2010-2011 Toyota Prius |
| LEX-58 OEM | LEXUS 2020-2021 (HYQ14FLB) | Smart Key ← | HYQ14FLB | Toyota H (8A) | 2020-2021 Lexus NX300; 2020-2021 Lexus NX300h; 2020-2022 Lexus RX350; 2020-2022 Lexus RX450h; 2020-2021 Lexus LX570; 2021-2022 Lexus IS300/IS350; 2021-2022 Lexus RC300/RC350/RC F |
| LEX-31 AM | LEXUS CT/RX 10-17 (HYQ14ACX) | Smart Key ← | HYQ14ACX | Texas 4D-67 | 2010-2017 Lexus CT; 2010-2017 Lexus RX; 2010-2015 Toyota Prius; 2012-2014 Toyota Prius C; 2012-2016 Toyota Prius V; 2009-2016 Toyota Venza; 2010-2019 Toyota 4Runner |
| LEX-58 AM | LEXUS LX/NX/RX 21 (HYQ1) | Remote / Fob |  |  | Lexus LX; Lexus NX; Lexus RX |
| LEX-44 OEM | LEXUS RX 16-20 (HYQ14FBB) | Smart Key ← | HYQ14FBB | Toyota H (8A) | 2016-2020 Lexus RX; 2015-2023 Toyota Tacoma; 2015-2021 Toyota Tundra; 2020-2022 Toyota 4Runner; 2021-2022 Toyota Sequoia |
| TOY48BT4 | LEXUS TOY48BT4 | Remote / Fob |  |  | Lexus |
| LEX-44 AM | LEXUS16-20 (HYQ14FBB) | Smart Key ← | HYQ14FBB | Toyota H (8A) | 2015-2023 Toyota Tacoma; 2015-2021 Toyota Tundra; 2020-2022 Toyota 4Runner; 2021-2022 Toyota Sequoia |
| FORD-R8154 AM | LINCOLN 17-20 (M3N-A2C940780) | Smart Key ← | M3N-A2C940780 | Hitag Pro (ID49) | 2017-2020 Lincoln Continental; 2017-2019 Lincoln MKC; 2017-2018 Lincoln MKX; 2017-2020 Lincoln MKZ; 2018-2021 Lincoln Navigator; 2019-2020 Lincoln Nautilus |
| FORD-R8351 | LINCOLN NAVIGATOR 2023 5-B SK | Smart Key ← |  |  | 2023 Lincoln Navigator |
| LEX-06 AM | LS/SC430 01-10(HYQ12BBK,4D-68) | Transponder | HYQ12BBK | Texas 4D-68 | 2001-2010 Lexus LS; 2001-2006 Lexus LS430; 2002-2010 Lexus SC430 |
| K-MZ34 | MAZDA 03-16 80-BIT | Transponder |  | Texas 4D-63 80-bit | 2003-2016 Mazda |
| MAZ-412 AM | MAZDA 13-20 (WAZSKE13D01) | Smart Key ← | WAZSKE13D01 | Hitag Pro (ID49) | 2014-2018 Mazda 3; 2014-2019 Mazda 6; 2016-2019 Mazda CX-3; 2013-2019 Mazda CX-5; 2016-2019 Mazda CX-9; 2016-2019 Mazda MX-5 Miata |
| MK-FOBIK-MERCEDE | MERCEDES 97-14 (IYZ-3312) | Remote / Fob | IYZ-3312 | Mercedes FBS3 | 1997-2014 Mercedes-Benz |
| MIT-859 AM | MITSBISHI 07-21 3-BT(OUC644M) | Smart Key ← | OUC644M | Philips ID46 | 2008-2017 Mitsubishi Lancer; 2008-2020 Mitsubishi Outlander; 2011-2021 Mitsubishi Outlander Sport; 2014-2020 Mitsubishi Mirage; 2018-2022 Mitsubishi Eclipse Cross |
| NIS-340 AM | MURANO/PATHFINDER 15-18 5-B | Remote / Fob |  |  | 2015-2018 Nissan Murano; 2015-2018 Nissan Pathfinder |
| NIS-342 AM | NISSAN 15-18 (KR5S180144014) | Smart Key ← | KR5S180144014 |  | 2013-2015 Nissan Altima; 2016-2018 Nissan Altima; 2016-2018 Nissan Maxima; 2015-2018 Nissan Murano; 2013-2019 Nissan Pathfinder; 2016-2019 Nissan Titan; 2016-2018 Infiniti QX60; 2016-2018 Infiniti Q50; 2017-2018 Infiniti Q60 |
| NIS-341 AM | NISSAN 2015-2018 (KR5S180144) | Smart Key ← | KR5S180144014 |  | 2013-2015 Nissan Altima; 2016-2018 Nissan Altima; 2016-2018 Nissan Maxima; 2015-2018 Nissan Murano; 2013-2019 Nissan Pathfinder; 2016-2019 Nissan Titan; 2016-2018 Infiniti QX60; 2016-2018 Infiniti Q50; 2017-2018 Infiniti Q60 |
| DA34 AM | NISSAN KEY SHELL - NI02 | Key Shell |  |  | Nissan |
| NIS-307 AM | NISSAN MURANO 2005-2008 | Remote / Fob |  |  | 2005-2008 Nissan Murano |
| NIS-332 AM | NISSAN ROGUE 14-19 (CWTWB1G) | Remote Head / Flip ← | CWTWB1G767 |  | 2014-2019 Nissan Rogue; 2014-2020 Nissan Rogue |
| NIS-351 AM | NISSAN ROGUE 17-18 with RS & HATC | Remote / Fob |  |  | 2017-2018 Nissan Rogue |
| K-NI04 | NISSAN/INFINITI NI04 | Remote / Fob |  |  | Nissan; Infiniti |
| NIS-RHK 4 AM | NISSAN/INFINITI/Chevrolet 03-19 | Remote Head / Flip |  |  | 2003-2019 Nissan; 2003-2019 Infiniti; 2003-2019 Chevrolet |
| HON-527 AM | ODYSSEY 2018-2020 (KR5V2X) | Smart Key ← | KR5V2X | Hitag 3 (ID47) | 2018-2020 Honda Odyssey; 2016-2021 Honda Civic; 2017-2022 Honda CR-V; 2016-2022 Honda Pilot |
| HON-539 AM | ODYSSEY 21-22 (KR5T4X) | Smart Key ← | KR5T4X | Hitag 3 (ID47) | 2021-2022 Honda Odyssey; 2021-2024 Honda Odyssey |
| HON-476 MEG AM | ODYSSEY/FIT (OUCG8D-380H-A) | Remote Head / Flip ← | OUCG8D-380H-A | Philips ID46 Honda | Honda Odyssey; Honda Fit; 2003-2007 Honda Accord; 2005-2006 Honda CR-V; 2005-2010 Honda Odyssey; 2006-2014 Honda Ridgeline; 2007-2008 Honda Fit; 2010 Honda Element |
| HON-476 AM | ODYSSEY/FIT (OUCG8D-380H-A) | Remote Head / Flip ← | OUCG8D-380H-A | Philips ID46 Honda | Honda Odyssey; Honda Fit; 2003-2007 Honda Accord; 2005-2006 Honda CR-V; 2005-2010 Honda Odyssey; 2006-2014 Honda Ridgeline; 2007-2008 Honda Fit; 2010 Honda Element |
| MIT-863 OEM | Outlander 14-20 4-Button (OUC644M) | Smart Key ← | OUC644M | Philips ID46 | 2014-2020 Mitsubishi Outlander; 2008-2017 Mitsubishi Lancer; 2008-2020 Mitsubishi Outlander; 2011-2021 Mitsubishi Outlander Sport; 2014-2020 Mitsubishi Mirage; 2018-2022 Mitsubishi Eclipse Cross |
| HYU-1423 OEM | PALISADE 23-24 (TQ8-FOB-4F27) | Smart Key ← | TQ8-FOB-4F27 |  | 2023-2024 Hyundai Palisade; 2020-2023 Hyundai Sonata; 2022-2024 Hyundai Tucson; 2021-2023 Hyundai Santa Fe; 2022-2024 Hyundai Santa Cruz; 2022-2023 Hyundai Palisade |
| INF-1540 OEM | QX50/QX55 20-25 (KR5TXN1) | Smart Key ← | KR5TXN1 | Hitag AES (4A) | 2020-2025 Infiniti QX50; 2020-2025 Infiniti QX55; 2018-2023 Nissan Kicks; 2019-2022 Nissan Rogue; 2019-2021 Nissan Rogue Sport; 2019-2021 Nissan Altima; 2020-2021 Nissan Sentra; 2020-2021 Nissan Versa; 2021-2024 Nissan Pathfinder |
| FOBIK-2203 AM | RAM 13-18 with AIR (GQ4-53T) | Remote / Fob | GQ4-53T |  | 2013-2018 Ram 1500; 2013-2018 Ram 2500; 2013-2018 Ram 3500; 2014-2021 Jeep Cherokee; 2014-2020 Jeep Grand Cherokee |
| FOBIK-2201 AM | RAM 13-18 with RS (GQ4-53T) | Remote / Fob | GQ4-53T |  | 2013-2018 Ram 1500; 2013-2018 Ram 2500; 2013-2018 Ram 3500; 2014-2021 Jeep Cherokee; 2014-2020 Jeep Grand Cherokee |
| CHRY-1662 | RAM PICKUP 2500 19-24(GQ4-76T) | Smart Key ← | GQ4-76T | Hitag AES (4A) | 2019-2024 Ram 2500; 2019-2024 Ram 3500; 2019-2024 Ram 4500; 2019-2024 Ram 5500 |
| PROMASTER-1 AM | RAM PROMASTER 4 BUTTON... | Remote / Fob |  |  | Ram ProMaster |
| TOY-247 AM H-CHP | RAV/HIGH/SEQ/TUN 13-19 H CHIP | Transponder |  | Toyota H (8A) | 2013-2019 Toyota RAV4; 2013-2019 Toyota Highlander; 2013-2019 Toyota Sequoia; 2013-2019 Toyota Tundra |
| JAG-1717-AM | ROVER/JAG 5-Button (KOBJTF10A) | Smart Key ← | KOBJTF10A | Hitag Pro (ID49) | 2011-2020 Land Rover Range Rover; 2011-2020 Land Rover Range Rover Sport; 2012-2019 Land Rover Range Rover Evoque; 2012-2018 Land Rover LR4; 2013-2014 Land Rover LR2; 2016-2018 Land Rover Discovery Sport; 2015-2018 Land Rover Discovery; 2014-2020 Jaguar F-Type; 2013-2018 Jaguar XF; 2011-2017 Jaguar XJ |
| SCION-1344 OEM | SCION FR-S/TOYOTA 86 14-19 | Remote / Fob |  |  | 2014-2019 Scion FR-S |
| SCION-1334-AM | SCN IQ/TC/XD 2005-2013 3-Button | Remote / Fob |  |  | 2005-2013 Scion IQ; 2005-2013 Scion tC; 2005-2013 Scion xD |
| GM-13522854 OEM | SILVERADO 21-22 with TAIL(HYQ1ES) | Smart Key ← | HYQ1ES |  | 2021-2022 Silverado; 2021-2023 Chevrolet Silverado 1500; 2021-2023 Chevrolet Silverado 2500HD / 3500HD; 2021-2023 GMC Sierra 1500; 2021-2023 GMC Sierra 2500HD / 3500HD; 2021-2023 GMC Acadia; 2021-2022 GMC Terrain |
| HYU-1276 AM | SONATA 15-17 (CQOFD00120) | Smart Key ← | CQOFD00120 | Texas 8A DST-AES | 2015-2017 Hyundai Sonata; 2016-2020 Hyundai Elantra; 2018-2019 Hyundai Sonata |
| HYU-1289 AM | SONATA 18-19 (CQOFD00120) | Smart Key ← | CQOFD00120 | Texas 8A DST-AES | 2018-2019 Hyundai Sonata; 2016-2020 Hyundai Elantra |
| GM-909 AM | SONIC/SPARK/TRAX 19-21 LXPT003 | Remote Head / Flip ← | LXP-T003 | Philips ID46 GM Ext | 2019-2021 Chevrolet Sonic; 2019-2021 Chevrolet Spark; 2019-2021 Chevrolet Trax; 2019-2022 Chevrolet Spark; 2019-2022 Chevrolet Trax; 2019-2020 Chevrolet Sonic; 2016-2016 Chevrolet Cruze |
| GM-909 OEM | SONIC/TRAX/SPARK 19-20 LXPT003 | Remote Head / Flip ← | LXP-T003 | Philips ID46 GM Ext | 2019-2020 Chevrolet Sonic; 2019-2020 Chevrolet Trax; 2019-2020 Chevrolet Spark; 2019-2022 Chevrolet Spark; 2019-2022 Chevrolet Trax; 2016-2016 Chevrolet Cruze |
| KIA-1139 AM | SOUL 10-13 (NYOSEKSAM11ATX) | Remote Head / Flip ← | NYOSEKSAM11ATX | None (remote only) | 2010-2013 Kia Soul; 2012-2013 Kia Sportage |
| KIA-1149 AM | SOUL 14-19 REMOTE HEAD FLIP KE | Remote Head / Flip |  |  | 2014-2019 Kia Soul; Kia KE |
| GM-839 AM | SPARK 13-15(A2GM3AFUS03) | Remote Head / Flip ← | A2GM3AFUS03 | Philips ID46 GM Ext | 2013-2015 Chevrolet Spark |
| CAD-1149 AM | SRX 10-15 with HATCH (NBG009768T) | Smart Key ← | NBG009768T | Philips ID46 GM Ext | 2010-2015 Cadillac SRX; 2013-2014 Cadillac ATS; 2013-2014 Cadillac XTS; 2014-2015 Cadillac ELR; 2010-2011 Saab 9-5 |
| CAD-1164 AM | SRX 10-16 (NBG009768) | Smart Key ← | NBG009768T | Philips ID46 GM Ext | 2010-2016 Cadillac SRX; 2010-2015 Cadillac SRX; 2013-2014 Cadillac ATS; 2013-2014 Cadillac XTS; 2014-2015 Cadillac ELR; 2010-2011 Saab 9-5 |
| SUB-938 AM | SUBARU 12-19 with TRUNK (CWTWB1U | Remote / Fob | CWTWB1U |  | 2012-2019 Subaru |
| SUB-941 | SUBARU 15-20 (HYQ14AHC) | Smart Key ← | HYQ14AHC | Texas 4D-60 80-bit | 2014-2020 Subaru BRZ; 2014-2020 Subaru Crosstrek; 2014-2020 Subaru Forester; 2014-2020 Subaru Impreza; 2014-2020 Subaru Legacy; 2014-2020 Subaru Outback; 2014-2020 Subaru WRX |
| SUB-943 OEM | SUBARU 17-23 (HYQ14AHK, G-BOAR | Smart Key ← | HYQ14AHK | Texas 8A DST-AES | 2017-2023 Subaru Impreza; 2018-2022 Subaru Crosstrek; 2019-2022 Subaru Forester; 2019-2022 Subaru Ascent; 2020-2022 Subaru Legacy; 2020-2022 Subaru Outback; 2019-2021 Subaru WRX; 2019-2021 Subaru WRX STI; 2022-2022 Subaru BRZ |
| B110 AM | SUBARU/BM B110 AM | Remote / Fob |  |  | Subaru |
| GM-858 AM | SUBURBAN/TAHOE 15-20 (HYQ1EA) | Smart Key ← | HYQ1EA | Philips ID46 GM Ext | 2015-2020 Chevrolet Suburban; 2015-2020 Chevrolet Tahoe; 2019-2022 Chevrolet Silverado 1500; 2020-2022 Chevrolet Silverado 2500HD / 3500HD; 2019-2022 GMC Sierra 1500; 2020-2022 GMC Sierra 2500HD / 3500HD; 2017-2020 GMC Acadia; 2018-2020 GMC Terrain |
| GM-932 AM | TAHOE/Suburban 21-22 (YG0G21TB2) | Smart Key ← | YG0G21TB2 | Hitag Pro (ID49) | 2021-2022 Chevrolet Tahoe; 2021-2022 Chevrolet Suburban; 2021-2024 Chevrolet Tahoe; 2021-2024 Chevrolet Suburban; 2021-2024 GMC Yukon / Yukon XL; 2022-2024 Chevrolet Silverado 1500; 2022-2024 GMC Sierra 1500; 2023-2024 Chevrolet Colorado; 2023-2024 GMC Canyon; 2021-2025 Buick Envision; 2024-2025 Chevrolet Silverado EV / GMC Sierra EV |
| TOY51 AM | TOY 12-21 HYQ14FBA/FBB | Smart Key ← | HYQ14FBA / HYQ14FBB |  | 2012-2017 Toyota Camry; 2013-2018 Toyota Avalon; 2014-2019 Toyota Corolla; 2013-2018 Toyota RAV4; 2014-2019 Toyota Highlander; 2016-2017 Toyota Prius V; 2020-2022 Toyota Sequoia; 2013-2018 Lexus GS/ES; 2015-2023 Toyota Tacoma; 2015-2021 Toyota Tundra; 2020-2022 Toyota 4Runner; 2021-2022 Toyota Sequoia |
| TOY44H 4D-74 AM | TOY 13-21 with H MASTER CHIP | Transponder |  | Toyota H (8A) | 2013-2021 Toyota |
| TOY-296 | TOY HIGHLANDER 20-22 (HYQ14FBC | Smart Key ← | HYQ14FBC | Toyota H (8A) | 2020-2022 Toyota Highlander; 2018-2023 Toyota Camry; 2019-2025 Toyota RAV4; 2016-2021 Toyota Prius |
| TOY-231 AM | TOY PRIUS 04-09 (MOZB21TG) | Smart Key ← | MOZB21TG |  | 2004-2009 Toyota Prius |
| TOY-250H-CHIP AM | TOY/SCI/LEX (HYQ12BDM)14-18 H | Transponder | HYQ12BDM |  | 2012-2014 Toyota Camry; 2014-2017 Toyota Camry; 2014-2019 Toyota Corolla; 2013-2018 Toyota RAV4; 2012-2019 Toyota Prius C; 2012-2017 Toyota Prius; 2016-2019 Toyota Tacoma; 2020-2021 Toyota 4Runner |
| TOY44D 4D-67 AM | TOY/SCION 03-14 with D-CHIP | Transponder |  | Texas 4D-67 | 2003-2014 Toyota; 2003-2014 Scion |
| TOY44G 4D-72 AM | TOY/SCION10-18 with OEM G CHIP | Transponder |  | Toyota G (4D-72) | 2010-2018 Toyota; 2010-2018 Scion |
| TOY-210 SPR OEM | TOYOTA 06-11 (HYQ12BBY) SUPER | Remote Head / Flip ← | HYQ12BBY |  | 2007-2011 Toyota Camry; 2006-2011 Toyota RAV4; 2008-2013 Scion xB; 2010-2018 Toyota 4Runner; 2010-2012 Toyota RAV4; 2010-2015 Toyota Yaris; 2015 Toyota Highlander |
| TOY-238 AM | TOYOTA 07-13 (HYQ14AAB, E-BRD) | Smart Key ← | HYQ14AAB |  | 2007-2009 Toyota Camry; 2005-2010 Toyota Avalon; 2008-2013 Toyota Highlander; 2008-2012 Toyota RAV4; 2008-2009 Toyota Land Cruiser; 2010-2011 Toyota Prius |
| TOY-328 REFURB | TOYOTA 4RUNNER (HYQ14FLA) | Smart Key ← | HYQ14FLA | Toyota H (8A) | Toyota 4Runner; 2021-2022 Toyota 4Runner; 2021-2022 Toyota Prius; 2021-2022 Toyota Prius Prime; 2022-2025 Toyota RAV4; 2021-2022 Toyota Highlander; 2018-2023 Toyota Camry |
| TOY-215 AM | TOYOTA CAMRY 12-14 (HYQ12BDM, | Remote Head / Flip ← | HYQ12BDM |  | 2012-2014 Toyota Camry; 2014-2017 Toyota Camry; 2014-2019 Toyota Corolla; 2013-2018 Toyota RAV4; 2012-2019 Toyota Prius C; 2012-2017 Toyota Prius; 2016-2019 Toyota Tacoma; 2020-2021 Toyota 4Runner |
| TOY-509 OEM | TOYOTA CAMRY 18-24 SMART KEY ( | Smart Key |  |  | 2018-2024 Toyota Camry |
| TOY-303 AM | TOYOTA RAV4 19-22 (HYQ14FBC) | Smart Key ← | HYQ14FBC | Toyota H (8A) | 2019-2022 Toyota RAV4; 2018-2023 Toyota Camry; 2019-2025 Toyota RAV4; 2016-2021 Toyota Prius; 2020-2022 Toyota Highlander |
| GM-892 AM | Trailblazer/CRUZE/EQUINOX/Traverse 18-20 | Remote / Fob |  |  | 2018-2020 Chevrolet Trailblazer; 2018-2020 Chevrolet Cruze; 2018-2020 Chevrolet Equinox; 2018-2020 Chevrolet Traverse |
| FORD-R8236 AM | TRANSIT/CONNECT 19-20 | Remote / Fob |  |  | 2019-2020 Ford Transit Connect |
| GM-876 AM | TRAX/ENCORE 13-18 | Remote / Fob |  |  | 2013-2018 Chevrolet Trax; 2013-2018 Buick Encore |
| GM-918 AM | TRAX/SONIC 19-21 (LXP-T003) | Remote Head / Flip ← | LXP-T003 | Philips ID46 GM Ext | 2019-2021 Chevrolet Trax; 2019-2021 Chevrolet Sonic; 2019-2022 Chevrolet Spark; 2019-2022 Chevrolet Trax; 2019-2020 Chevrolet Sonic; 2016-2016 Chevrolet Cruze |
| HYU-1269 AM | TUCSON 15-21 (TQ8-RKE-4F25) | Remote Head / Flip ← | TQ8-RKE-4F25 |  | 2015-2021 Hyundai Tucson; 2016-2019 Hyundai Tucson; 2015-2017 Hyundai Sonata |
| HYU-1305 AM | TUCSON 18-21 (TQ8-FOB-4F11) | Smart Key ← | TQ8-FOB-4F11 | Hitag 3 (ID47) | 2018-2021 Hyundai Tucson; 2017-2021 Hyundai Ioniq; 2017-2021 Hyundai Tucson |
| TOY-236 AM | VENZA 10-17 with HATCH (HYQ14ACX) | Smart Key ← | HYQ14ACX | Texas 4D-67 | 2010-2017 Toyota Venza; 2010-2015 Toyota Prius; 2012-2014 Toyota Prius C; 2012-2016 Toyota Prius V; 2009-2016 Toyota Venza; 2010-2019 Toyota 4Runner |
| VW-1703 AM | VLKSWGN18-20(PEPS,NBGFS125C1) | Smart Key | NBGFS125C1 |  | 2018-2020 Volkswagen Golf; 2018-2020 Volkswagen Golf SportWagen; 2018-2020 Volkswagen Jetta; 2018-2020 Volkswagen Atlas; 2018-2020 Volkswagen Tiguan |
| VW-1666-AM | VW 05-11 4-Button (NBG92596263) | Remote Head / Flip ← | NBG92596263 | Megamos ID48 | 2002-2006 Volkswagen Jetta; 2002-2006 Volkswagen Golf; 2002-2006 Volkswagen GTI; 2002-2006 Volkswagen Beetle; 2006-2011 Volkswagen Jetta; 2006-2011 Volkswagen GTI; 2006-2009 Volkswagen Rabbit; 2007-2011 Volkswagen EOS; 2009-2011 Volkswagen CC |
| VW-1693 AM PROX | VW 12-18 4-Button (NBGFS93N, P) | Smart Key | NBGFS93N | Megamos AES MQB | 2017-2018 Volkswagen Jetta; 2016-2022 Volkswagen Passat; 2012-2018 Volkswagen Tiguan |
| VW-1689-AM | VW 2011-2016 4-Button KEY | Remote / Fob |  |  | 2011-2016 Volkswagen |
| VW-1664 | VW 98-02 (NBG8137T) | Remote Head / Flip ← | NBG8137T | Megamos ID48 | 1998-2001 Volkswagen Passat; 1999-2001 Volkswagen Jetta; 1999-2001 Volkswagen Golf; 1999-2001 Volkswagen Beetle; 2002-2002 Volkswagen Cabrio |
| CHRY-1683 AM | Wagoneer/Cherokee 21-23... | Remote / Fob |  |  | Jeep Wagoneer; Jeep Cherokee; Jeep 21-23 |
| CAD-1177 AM | XT4 / XT5 17-20 (HYQ2EB) | Smart Key ← | HYQ2EB | Philips ID46 GM Ext | 2017-2020 Cadillac XT4; 2017-2020 Cadillac XT5; 2015-2020 Cadillac Escalade / Escalade ESV; 2015-2019 Cadillac ATS; 2014-2019 Cadillac CTS; 2015-2019 Cadillac XTS; 2016-2020 Cadillac CT6; 2019-2020 Cadillac XT4; 2020-2020 Cadillac XT6; 2015-2016 Cadillac SRX |
| CAD-1185 AM | XT4/XT5/XT6 20-24 (HYQ2E) | Remote / Fob |  |  | 2020-2024 Cadillac XT4; 2020-2024 Cadillac XT5; 2020-2024 Cadillac XT6 |
| MK-Y170 AM | Y170-PT TRANSPONDER KEY, ID 46 | Transponder |  | Philips ID46 | Y170-PT TRANSPONDER KEY, ID 46 |

/* ============================================================================
   app/prog-cables.js — required CABLE / ADAPTER per tool + platform for key
   programming (AKL + bench), researched and source-verified 2026-06. confidence
   "Confirmed" = backed by a vendor/reseller source; "Verify" = NOT confirmed,
   treat as a lead only. "Not supported" = the tool does not cover that brand.
   Helper: window.TKS_CABLE(covkey, platform) -> {akl, bench, note, conf, src} | null
   ========================================================================= */
(function () {
  // tool key → platform → { akl_cable, bench_cable, note, confidence, source }
  var C = {
    im608: {
      GM: { akl: 'OBD only; CAN FD adapter for 2020+ GM', bench: 'OBD only', conf: 'Confirmed' },
      Ford: { akl: 'OBD only (most pre-2021)', bench: 'XP400 Pro + APB131 (RH850 BCM bench, 2021+ F-150/Bronco/Mach-E)', conf: 'Confirmed' },
      'Toyota-G': { akl: 'APB112 Smart Key Simulator (OBD)', bench: 'XP400 / XP400 Pro (EEPROM)', conf: 'Confirmed' },
      'Toyota-8A': { akl: 'APB112 + Toyota 8A Blade AKL cable (blade); 8A smart = APB112 + G-Box2/3', bench: 'XP400 / XP400 Pro', conf: 'Confirmed' },
      Honda: { akl: 'OBD only', bench: 'OBD only', conf: 'Confirmed' },
      Nissan: { akl: 'Nissan 40-pin BCM cable (AKL); APB131 to read 28-digit PIN (2022+)', bench: 'APB131', conf: 'Confirmed' },
      'Chrysler/FCA': { akl: '12+8 SGW bypass cable (2018+); OBD only older', bench: 'XP400 Pro for module EEPROM', conf: 'Confirmed' },
      'Hyundai/Kia': { akl: 'OBD only (most smart)', bench: 'XP400 Pro + IMKPA (IC-chip/EEPROM keys, late models)', conf: 'Confirmed' },
      VAG: { akl: 'OBD only MQB 2013-2020; older may need bench', bench: 'XP400 Pro + IMKPA', conf: 'Confirmed' },
      BMW: { akl: 'G-Box2/3 + DB15 cable (CAS/FEM/BDC AKL, ISN)', bench: 'G-Box2/3 + DB15', conf: 'Confirmed' },
      Mercedes: { akl: 'G-Box2/3 + DB15 (DAS3 EIS/EZS AKL)', bench: 'G-Box2/3 + DB15 (EIS bench)', note: 'IM508 needs XP400 Pro to enable; IM608 has the IMMO programmer built in', conf: 'Confirmed' },
      Subaru: { akl: 'OBD only; APB112 optional', bench: 'OBD only', conf: 'Confirmed' }
    },
    km100: {
      GM: { akl: 'OBD only', bench: 'Not supported', conf: 'Confirmed' }, Ford: { akl: 'OBD only', bench: 'Not supported', conf: 'Confirmed' },
      'Toyota-G': { akl: 'OBD (built-in APB112)', bench: 'Not supported', conf: 'Verify' },
      'Toyota-8A': { akl: 'Toyota 8A blade cable + G-Box3 + APB112 (blade); smart = OBD', bench: 'Not supported', conf: 'Confirmed' },
      Honda: { akl: 'OBD only', bench: 'Not supported', conf: 'Verify' }, Nissan: { akl: 'OBD only', bench: 'Not supported', conf: 'Confirmed' },
      'Chrysler/FCA': { akl: 'OBD only', bench: 'Not supported', conf: 'Confirmed' }, 'Hyundai/Kia': { akl: 'OBD only', bench: 'Not supported', conf: 'Verify' },
      VAG: { akl: 'OBD only legacy; MQB AKL not supported', bench: 'Not supported', conf: 'Verify' },
      BMW: { akl: 'OBD add-key only; CAS/FEM/BDC AKL not supported', bench: 'Not supported', conf: 'Verify' },
      Mercedes: { akl: 'Not supported', bench: 'Not supported', conf: 'Confirmed' }, Subaru: { akl: 'Verify', bench: 'Not supported', conf: 'Verify' }
    },
    ktmax: {
      GM: { akl: 'OBD via Mini OBD Tool or Key Tool Max Pro; GM 2020+ CAN FD = Max Pro', bench: 'VVDI Prog / Mini Prog (separate)', conf: 'Confirmed' },
      Ford: { akl: 'OBD via Mini OBD / Max Pro', bench: 'VVDI Prog / Mini Prog', conf: 'Confirmed' },
      'Toyota-G': { akl: 'OBD via Mini OBD/FT-OBD or Max Pro (G/ID72)', bench: 'VVDI Mini Prog / Prog', conf: 'Confirmed' },
      'Toyota-8A': { akl: 'Toyota 8A AKL adapter REQUIRED (XD8ASKGL smart / 8A blade) + Mini OBD or Max Pro', bench: 'VVDI Mini Prog / Prog', conf: 'Confirmed' },
      Honda: { akl: 'OBD via Mini OBD / Max Pro', bench: 'VVDI Prog / Mini Prog', conf: 'Confirmed' },
      Nissan: { akl: 'Nissan 40-pin adapter XDKP91GL (PIN-bypass AKL)', bench: 'VVDI Prog / Mini Prog', conf: 'Confirmed' },
      'Chrysler/FCA': { akl: 'OBD via Mini OBD / Max Pro', bench: 'VVDI Prog / Mini Prog', conf: 'Confirmed' },
      'Hyundai/Kia': { akl: 'OBD via Mini OBD / Max Pro', bench: 'VVDI Prog / Mini Prog', conf: 'Confirmed' },
      VAG: { akl: 'OBD via Mini OBD / Max Pro (MQB48/49)', bench: 'VVDI Prog / Mini Prog; MQB solder-free set = Key Tool Plus', conf: 'Confirmed' },
      BMW: { akl: 'CAS3/3+ via OBD (Max Pro); CAS4/FEM/BDC NOT on Key Tool Max (need Key Tool Plus)', bench: 'VVDI Mini Prog / Prog (CAS EEPROM)', conf: 'Confirmed' },
      Mercedes: { akl: 'NOT on Key Tool Max — needs VVDI MB BGA Tool (separate)', bench: 'VVDI MB BGA Tool', conf: 'Confirmed' },
      Subaru: { akl: 'Verify', bench: 'Verify', conf: 'Verify' }
    },
    smartpro: {
      GM: { akl: 'OBD (Smart Dongle); GM CAN dongle for CAN platforms', bench: 'N/A (no EEPROM bench)', conf: 'Verify' },
      Ford: { akl: 'ADC2025 Ford BCM bypass cable + ADC2020 emulator', bench: 'N/A', conf: 'Confirmed' },
      'Toyota-G': { akl: 'ADC2016 AKL cable + ADC2015 Toyota/Subaru emulator', bench: 'N/A', conf: 'Confirmed' },
      'Toyota-8A': { akl: 'ADC2018 security bypass (AA/A9 prox); ADC2021/ADC2022 gateway bypass (CAN-gateway models)', bench: 'N/A', conf: 'Confirmed' },
      Honda: { akl: 'OBD (Honda PROX dongle)', bench: 'N/A', conf: 'Verify' },
      Nissan: { akl: 'ADC2017 Nissan/Mitsubishi bypass cable (2020+ prox)', bench: 'N/A', conf: 'Confirmed' },
      'Chrysler/FCA': { akl: 'ADC2012 RF Hub bypass (2018+); ADC2019 SGW bypass', bench: 'N/A', conf: 'Confirmed' },
      'Hyundai/Kia': { akl: 'OBD; ADC193 for RKE remotes (not AKL)', bench: 'N/A', conf: 'Verify' },
      VAG: { akl: 'ADC187 VAG ignition bypass (listed, unverified)', bench: 'ADC219 cluster reset (listed)', conf: 'Verify' },
      BMW: { akl: 'OBD (CAS2/CAS3 software)', bench: 'N/A', conf: 'Verify' },
      Mercedes: { akl: 'ADC2600 Mercedes AKL kit + ADC260 Smart Programmer (EIS)', bench: 'ADC2600 (EIS)', conf: 'Confirmed' },
      Subaru: { akl: 'ADC2015 Toyota/Subaru emulator (legacy ADC117)', bench: 'N/A', conf: 'Confirmed' }
    },
    apropad: {
      GM: { akl: 'OBD only; CAN-FD adapter for 2020+ Global B', bench: 'KC501 (EEPROM/MCU)', conf: 'Confirmed' },
      Ford: { akl: 'OBD only (expected)', bench: 'KC501', conf: 'Verify' },
      'Toyota-G': { akl: 'KS-1 smart key emulator (needs KC100 or KC501)', bench: 'KC501', conf: 'Confirmed' },
      'Toyota-8A': { akl: 'M822 adapter (8A/4A); 8A smart also needs KS-1', bench: 'KC501', conf: 'Confirmed' },
      Honda: { akl: 'OBD only (expected)', bench: 'KC501', conf: 'Verify' },
      Nissan: { akl: 'OBD only; OBD-1 adapter (included) for older', bench: 'KC501', conf: 'Verify' },
      'Chrysler/FCA': { akl: 'OBD only (SGW kit via resellers)', bench: 'KC501', conf: 'Verify' },
      'Hyundai/Kia': { akl: 'OBD only (expected)', bench: 'KC501', conf: 'Verify' },
      VAG: { akl: 'KC100 precoding adapter (MQB/4th-5th gen)', bench: 'KC501; KC100 for IMMO precoding', conf: 'Confirmed' },
      BMW: { akl: 'KC100 (CAS1/CAS3); FEM/BDC/CAS4 unconfirmed', bench: 'KC501', conf: 'Confirmed' },
      Mercedes: { akl: 'M821 AKL adapter + KC501 (IR)', bench: 'KC501 (IR keys, EEPROM)', conf: 'Confirmed' },
      Subaru: { akl: 'OBD only (G-Key 80-bit, reseller-stated)', bench: 'KC501', conf: 'Verify' }
    },
    lonsdor: {
      GM: { akl: 'OBD only', bench: 'OBD only', conf: 'Confirmed' }, Ford: { akl: 'OBD only', bench: 'OBD only', conf: 'Confirmed' },
      'Toyota-G': { akl: 'OBD only', bench: 'OBD only', conf: 'Verify' },
      'Toyota-8A': { akl: 'Super ADP / ADP + LKE emulator (or FP30 cable for 8A-BA/4A)', bench: 'ADP/Super ADP (no-solder smart-box read)', conf: 'Confirmed' },
      Honda: { akl: 'OBD only', bench: 'OBD only', conf: 'Confirmed' },
      Nissan: { akl: 'Nissan 40-pin BCM cable (B18, 2019+) + Nissan AKL license', bench: 'Nissan 40-pin BCM cable', conf: 'Confirmed' },
      'Chrysler/FCA': { akl: 'L-JCD / FCA SGW 12+8 bypass (2018+)', bench: 'OBD only', conf: 'Confirmed' },
      'Hyundai/Kia': { akl: 'OBD only', bench: 'OBD only', conf: 'Verify' },
      VAG: { akl: 'OBD only (4th/5th gen); MQB limited', bench: 'Verify', conf: 'Verify' },
      BMW: { akl: 'OBD (CAS/FEM-BDC); FEM/BDC AKL needs module pre-processing (service-mode EEPROM)', bench: 'FEM/BDC EEPROM (dismantled, service mode)', conf: 'Confirmed' },
      Mercedes: { akl: 'Verify (not an established K518 strength)', bench: 'Verify', conf: 'Verify' },
      Subaru: { akl: 'Verify', bench: 'Verify', conf: 'Verify' }
    },
    obdstar: {
      GM: { akl: 'OBD with OEM key; CAN FD adapter for 2020+', bench: 'OBD only', conf: 'Confirmed' },
      Ford: { akl: 'P002 adapter + Ford AKL cable', bench: 'P002 + Bosch ECU flash cable', conf: 'Confirmed' },
      'Toyota-G': { akl: 'OBD + Key SIM emulator (read EEPROM by OBD)', bench: 'OBD only', conf: 'Confirmed' },
      'Toyota-8A': { akl: '8A blade: P002 + Toyota 8A cable. 4A/8A-BA smart: Toyota-30 cable + Key SIM', bench: 'P002 (8A non-smart)', conf: 'Confirmed' },
      Honda: { akl: 'OBD only (incl. prox AKL)', bench: 'P001 / EEPROM (PIN-from-EEPROM only)', conf: 'Confirmed' },
      Nissan: { akl: 'Nissan-40 BCM cable (2019+ B18, bypass 28-digit PIN); older OBD', bench: 'OBD via Nissan-40 BCM cable', conf: 'Confirmed' },
      'Chrysler/FCA': { akl: 'FCA 12+8 universal adapter (2018+ SGW); pre-2018 OBD', bench: 'OBD only', conf: 'Confirmed' },
      'Hyundai/Kia': { akl: 'OBD; smart-key AKL uses Key SIM emulator', bench: 'OBD only', conf: 'Confirmed' },
      VAG: { akl: '4th/5th-gen: RFID + EEPROM-PIC adapter (P001). MQB AKL unconfirmed on DP Plus', bench: 'EEPROM/PIC adapter or P001', conf: 'Confirmed' },
      BMW: { akl: 'Verify — no specific BMW AKL cable confirmed for X300 DP Plus (P002 does NOT cover BMW)', bench: 'Verify', conf: 'Verify' },
      Mercedes: { akl: 'Verify — Benz FBS3 kit marketed for X300 Classic G3, not DP Plus/Pro4', bench: 'Verify', conf: 'Verify' },
      Subaru: { akl: 'OBD only (72G blade reset; 8A-H smart via Key SIM)', bench: 'OBD only', conf: 'Confirmed' }
    },
    keydiy: {
      GM: { akl: 'KD-MATE OBD adapter (recently added; no AKL detail)', bench: 'Not supported', conf: 'Verify' },
      Ford: { akl: 'KD-MATE OBD adapter (recently added; no AKL detail)', bench: 'Not supported', conf: 'Verify' },
      'Toyota-G': { akl: 'KD-MATE OBD adapter (4D smart, pincode/simulator-free)', bench: 'Not supported', conf: 'Confirmed' },
      'Toyota-8A': { akl: 'KD-MATE; 2020+ also need Toyota 30-Pin cable (ABK-5314)', bench: 'Not supported', conf: 'Confirmed' },
      Honda: { akl: 'KD-MATE OBD adapter (recently added; no AKL detail)', bench: 'Not supported', conf: 'Verify' },
      Nissan: { akl: 'KD-MATE OBD adapter (recently added; no AKL detail)', bench: 'Not supported', conf: 'Verify' },
      'Chrysler/FCA': { akl: 'KD-MATE OBD adapter (recently added; no AKL detail)', bench: 'Not supported', conf: 'Verify' },
      'Hyundai/Kia': { akl: 'KD-MATE OBD adapter (recently added; no AKL detail)', bench: 'Not supported', conf: 'Verify' },
      VAG: { akl: 'KD-MATE (smart/4th-immo); MQB AKL needs KD Mini Prog (ABK-5173) + C2', bench: 'KD Mini Prog (C1 EEPROM / C2 RH850)', conf: 'Confirmed' },
      BMW: { akl: 'Not supported', bench: 'Not supported', conf: 'Verify' },
      Mercedes: { akl: 'Not supported', bench: 'Not supported', conf: 'Verify' },
      Subaru: { akl: 'KD-MATE OBD adapter (Toyota-derived)', bench: 'Not supported', conf: 'Confirmed' }
    },
    cgdi_bmw: { BMW: { akl: 'BMW OBD cable (incl. CAS4/4+ match, CAS3+ downgrade)', bench: '8-pin chip-free clip (CAS1-3+ EEPROM, FEM/BDC 95128)', conf: 'Confirmed' } },
    cgdi_mb: { Mercedes: { akl: 'EIS/ELV test line (no-disassembly EIS read) + NEC key adapter', bench: 'EIS/ELV test line + NEC adapter + ELV adapter/simulator', conf: 'Confirmed' } }
  };

  // covkey + platform → the cable record (handles shared tools + cgdi split)
  window.TKS_CABLE = function (covkey, platform) {
    if (!covkey || !platform) return null;
    var k = covkey;
    if (covkey === 'im508') k = 'im608';
    else if (covkey === 'cgdi') k = (platform === 'BMW') ? 'cgdi_bmw' : (platform === 'Mercedes') ? 'cgdi_mb' : null;
    if (!k) return null;
    var rec = C[k] && C[k][platform];
    return rec ? { akl: rec.akl || '', bench: rec.bench || '', note: rec.note || '', conf: rec.conf || '', src: rec.source || '' } : null;
  };
  window.PROG_CABLES = C;
})();

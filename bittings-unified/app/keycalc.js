/* keycalc.js - master-key / pinning calculator (pure logic, no UI, no deps).
 * All values are PIN NUMBERS / CUT NUMBERS (integers), never inches.
 * A bitting is an array of cut numbers, position 1 first. Depth 0 = shallowest.
 */
(function (root) {
  'use strict';

  var TOP_NOTE_SC = 'Top pins: use your Schlage kit chart (rule not confirmed yet)';

  var SPECS = {
    sc: {
      id: 'sc',
      name: 'Schlage Classic',
      pins: [5, 6],
      defaultPins: 6,
      depths: [0, 9],
      increment: '.015"',
      macs: 7,
      ic: false,
      pinRange: { bottom: [0, 9], master: [2, 9] },
      topRule: null,
      verified: false,
      notes: [],
      source: 'Schlage manuals (depths, MACS 7); top-pin rule not confirmed'
    },
    a2: {
      id: 'a2',
      name: 'Best-style IC core (A2)',
      pins: [6, 7],
      defaultPins: 7,
      depths: [0, 9],
      increment: '.0125"',
      macs: null,
      ic: true,
      stackTotal: 23,
      controlConst: 10,
      minPin: 2,
      verified: false,
      notes: ['No MACS limit is assumed for A2; not confirmed by a manufacturer document.'],
      source: 'Schlage SFIC service manual: build-up = control + 10 − plug total, total stack 23'
    },
    s6300: {
      id: 's6300',
      name: 'Sargent 6300 IC core',
      pins: [6],
      defaultPins: 6,
      depths: [0, 9],
      increment: null,
      macs: null,
      ic: true,
      controlChambers: [3, 4],
      stackNormal: 15,
      stackControl: 20,
      controlConst: 8,
      controlMustMatchTMK: [1, 2, 5, 6],
      hollowDriverNote: 'Chambers 3 and 4 use hollow drivers and the special spring',
      verified: false,
      notes: [
        'Depth range 0..9 is treated as such but is unconfirmed for Sargent 6300.',
        'MACS for Sargent 6300 is unknown; no MACS check is applied.'
      ],
      source: 'SARGENT 5100 & 6300 Removable Core Pinning Manual'
    }
  };

  function getSpec(specId) {
    var s = SPECS[specId];
    if (!s) throw new Error('Unknown system: ' + specId);
    return s;
  }

  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }
  function sum(a) { var t = 0; for (var i = 0; i < a.length; i++) t += a[i]; return t; }
  function product(a) { var t = 1; for (var i = 0; i < a.length; i++) t *= a[i]; return t; }

  function macsBreaks(spec, cuts) {
    var out = [];
    if (spec.macs == null) return out;
    for (var i = 1; i < cuts.length; i++) {
      if (Math.abs(cuts[i] - cuts[i - 1]) > spec.macs) out.push(i); // 0-based index of second
    }
    return out;
  }

  function validateKey(specId, cuts, opts) {
    var spec = getSpec(specId);
    opts = opts || {};
    var errors = [], warnings = [];
    var want = opts.pins || spec.defaultPins;
    if (!Array.isArray(cuts)) {
      return { ok: false, errors: ['Bitting must be an array of cut numbers'], warnings: warnings };
    }
    if (cuts.length !== want) {
      errors.push('Wrong length: ' + cuts.length + ' cuts, expected ' + want);
    }
    var allInt = true;
    for (var i = 0; i < cuts.length; i++) {
      var c = cuts[i];
      if (!isInt(c)) {
        allInt = false;
        errors.push('Position ' + (i + 1) + ': cut ' + c + ' is not an integer');
      } else if (c < spec.depths[0] || c > spec.depths[1]) {
        errors.push('Position ' + (i + 1) + ': cut ' + c + ' is outside depth range ' +
          spec.depths[0] + '..' + spec.depths[1]);
      }
    }
    if (allInt) {
      var b = macsBreaks(spec, cuts);
      for (var j = 0; j < b.length; j++) {
        var k = b[j];
        errors.push('MACS ' + spec.macs + ' broken between positions ' + k + ' and ' + (k + 1) +
          ' (' + cuts[k - 1] + ' and ' + cuts[k] + ')');
      }
    }
    if (opts.step === 2 && Array.isArray(opts.parityOf)) {
      for (var p = 0; p < cuts.length; p++) {
        if (isInt(cuts[p]) && isInt(opts.parityOf[p]) &&
            (cuts[p] % 2 + 2) % 2 !== (opts.parityOf[p] % 2 + 2) % 2) {
          warnings.push('Position ' + (p + 1) + ': cut ' + cuts[p] +
            ' has different odd/even from ' + opts.parityOf[p] + ' (breaks 2-step progression)');
        }
      }
    }
    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  function pinLock(specId, input) {
    var spec = getSpec(specId);
    input = input || {};
    var operating = input.operating || [];
    var control = input.control || null;
    var errors = [], warnings = [], notes = [], rows = [];
    var pins = input.pins || (operating[0] && operating[0].length) || spec.defaultPins;
    var i, k;

    if (!operating.length) errors.push('No operating keys given');
    for (k = 0; k < operating.length; k++) {
      if (operating[k].length !== pins) {
        errors.push('Operating key ' + (k + 1) + ' has ' + operating[k].length + ' cuts, expected ' + pins);
      }
    }
    if (spec.ic) {
      if (!control) errors.push('A control key is required for ' + spec.name);
      else if (control.length !== pins) errors.push('Control key has ' + control.length + ' cuts, expected ' + pins);
    }
    if (errors.length) {
      return { rows: [], warnings: warnings, notes: notes, errors: errors, complete: false };
    }

    var complete = true;
    var minMaster = specId === 'sc' ? spec.pinRange.master[0] : (spec.minPin || null);

    if (specId === 's6300') {
      for (i = 0; i < spec.controlMustMatchTMK.length; i++) {
        var q = spec.controlMustMatchTMK[i] - 1;
        if (control[q] !== operating[0][q]) {
          errors.push('Control key position ' + (q + 1) + ' (' + control[q] +
            ') must match the top master (' + operating[0][q] + ')');
        }
      }
    }

    for (i = 0; i < pins; i++) {
      var pos = i + 1;
      var cutsHere = operating.map(function (key) { return key[i]; });
      var seen = {}, shear = [];
      cutsHere.forEach(function (c) { if (!seen[c]) { seen[c] = true; shear.push(c); } });
      shear.sort(function (a, b) { return a - b; });
      var masters = [];
      for (var m = 1; m < shear.length; m++) masters.push(shear[m] - shear[m - 1]);
      var bottom = shear[0];
      var plug = shear[shear.length - 1];
      var row = {
        pos: pos, cuts: cutsHere, shear: shear, bottom: bottom, masters: masters, plug: plug,
        build: null, controlSplit: null, control: spec.ic && control ? control[i] : null, top: null
      };
      var stackBelow = bottom + sum(masters);

      if (specId === 'sc') {
        row.top = null;
      } else if (specId === 'a2') {
        row.build = control[i] + spec.controlConst - plug;
        row.top = spec.stackTotal - (stackBelow + row.build);
        if (row.build < 0 || row.top < 0) {
          warnings.push('Position ' + pos + ': pin pack impossible (build-up ' + row.build + ', top ' +
            row.top + ') - change the control key or the top master');
        } else if (row.build < spec.minPin || row.top < spec.minPin) {
          warnings.push('Position ' + pos + ': build-up ' + row.build + ' / top ' + row.top +
            ' is smaller than ' + spec.minPin + ' - not in a standard kit');
        }
      } else if (specId === 's6300') {
        if (spec.controlChambers.indexOf(pos) >= 0) {
          var factor = control[i] + spec.controlConst;
          row.controlSplit = factor - plug;
          row.top = spec.stackControl - (stackBelow + row.controlSplit);
        } else {
          row.top = spec.stackNormal - stackBelow;
        }
        if (row.top < 0 || (row.controlSplit !== null && row.controlSplit < 0)) {
          warnings.push('Position ' + pos + ': computed pin is negative (top ' + row.top +
            (row.controlSplit !== null ? ', control split ' + row.controlSplit : '') +
            ') - not buildable, change the control key or top master');
        }
      }

      if (minMaster != null) {
        for (var mm = 0; mm < masters.length; mm++) {
          if (masters[mm] < minMaster) {
            warnings.push('Position ' + pos + ': master pin ' + masters[mm] + ' is smaller than ' +
              minMaster + (specId === 'a2' ? ' - not in a standard kit' : ' - not in the kit') +
              '; use 2-step progression');
            break;
          }
        }
      }
      if (row.top === null) complete = false;
      rows.push(row);
    }

    if (specId === 'sc') notes.push(TOP_NOTE_SC);
    if (specId === 's6300') notes.push(spec.hollowDriverNote);
    if (errors.length) complete = false;
    return { rows: rows, warnings: warnings, notes: notes, errors: errors, complete: complete };
  }

  function opens(rows, cuts) {
    if (!rows || !rows.length || !cuts || cuts.length !== rows.length) return false;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].shear.indexOf(cuts[i]) < 0) return false;
    }
    return true;
  }

  function acceptedKeyCount(rows) {
    var n = 1;
    for (var i = 0; i < rows.length; i++) n *= rows[i].shear.length;
    return n;
  }

  function checkSystemLock(rows, intendedSymbols, allKeys) {
    var extra = [];
    (allKeys || []).forEach(function (k) {
      if (opens(rows, k.cuts) && (intendedSymbols || []).indexOf(k.symbol) < 0) extra.push(k.symbol);
    });
    return { extra: extra, ok: extra.length === 0 };
  }

  function progressions(specId, tmk, step) {
    var spec = getSpec(specId);
    var lo = spec.depths[0], hi = spec.depths[1];
    return tmk.map(function (t) {
      var valid = [];
      for (var d = lo; d <= hi; d++) {
        if (d === t) continue;
        if (step === 2 && ((d - t) % 2 !== 0)) continue;
        valid.push(d);
      }
      var above = valid.filter(function (d) { return d > t; });
      var below = valid.filter(function (d) { return d < t; });
      return above.concat(below);
    });
  }

  var LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I, no O

  function masterSymbol(n) {
    var L = LETTERS.length;
    return LETTERS.charAt(Math.floor(n / L) % L) + LETTERS.charAt(n % L);
  }

  // Walk the odometer (last list fastest); fn(values) returns true to stop.
  function odometer(lists, fn) {
    var n = lists.length, i;
    for (i = 0; i < n; i++) if (!lists[i].length) return;
    var idx = [];
    for (i = 0; i < n; i++) idx.push(0);
    for (;;) {
      if (fn(idx.map(function (x, j) { return lists[j][x]; }))) return;
      var j = n - 1;
      while (j >= 0) {
        idx[j]++;
        if (idx[j] < lists[j].length) break;
        idx[j] = 0;
        j--;
      }
      if (j < 0) return;
    }
  }

  function designTPP(specId, o) {
    var spec = getSpec(specId);
    o = o || {};
    var step = o.step || 2;
    var tmk = o.tmk;
    var v = validateKey(specId, tmk, { pins: o.pins });
    if (!v.ok) return { ok: false, errors: v.errors };
    var masterPositions = o.masterPositions || [];
    var mastersWanted = o.mastersWanted == null ? 3 : o.mastersWanted;
    var kpm = o.keysPerMaster == null ? 3 : o.keysPerMaster;
    var errors = [];
    masterPositions.forEach(function (p) {
      if (!isInt(p) || p < 1 || p > tmk.length) errors.push('Master position ' + p + ' is out of range');
    });
    if (errors.length) return { ok: false, errors: errors };

    var prog = progressions(specId, tmk, step);
    var mIdx = masterPositions.map(function (p) { return p - 1; });
    var cIdx = [];
    for (var i = 0; i < tmk.length; i++) if (mIdx.indexOf(i) < 0) cIdx.push(i);
    var mLists = mIdx.map(function (x) { return prog[x]; });
    var cLists = cIdx.map(function (x) { return prog[x]; });

    var keys = [{ symbol: 'GM', cuts: tmk.slice(), level: 0, parent: null }];
    var skipped = 0;
    var masters = [];

    odometer(mLists, function (vals) {
      if (masters.length >= mastersWanted) return true;
      var cuts = tmk.slice();
      mIdx.forEach(function (x, j) { cuts[x] = vals[j]; });
      if (macsBreaks(spec, cuts).length) { skipped++; return false; }
      var sym = masterSymbol(masters.length);
      var key = { symbol: sym, cuts: cuts, level: 1, parent: 'GM' };
      masters.push(key);
      keys.push(key);
      return masters.length >= mastersWanted;
    });

    masters.forEach(function (mk, mi) {
      var want = Array.isArray(kpm) ? (kpm[mi] != null ? kpm[mi] : kpm[kpm.length - 1]) : kpm;
      var made = 0;
      if (!(want > 0)) return;
      odometer(cLists, function (vals) {
        var cuts = mk.cuts.slice();
        cIdx.forEach(function (x, j) { cuts[x] = vals[j]; });
        if (macsBreaks(spec, cuts).length) { skipped++; return false; }
        made++;
        keys.push({ symbol: mk.symbol + made, cuts: cuts, level: 2, parent: mk.symbol });
        return made >= want;
      });
    });

    var notes = [];
    if (spec.ic) notes.push('The control key is separate from this design; pass it to pinLock.');
    if (specId === 's6300') {
      notes.push('The control key must match the top master in positions 1,2,5,6.');
    }
    return {
      ok: true,
      keys: keys,
      skipped: skipped,
      capacity: { masters: product(mLists.map(function (l) { return l.length; })),
                  perMaster: product(cLists.map(function (l) { return l.length; })) },
      notes: notes
    };
  }

  function chainOf(keys, symbol) {
    var map = {};
    keys.forEach(function (k) { map[k.symbol] = k; });
    var out = [], cur = map[symbol], guard = 0;
    while (cur && guard++ < 100) {
      out.unshift(cur.symbol);
      cur = cur.parent ? map[cur.parent] : null;
    }
    return out;
  }

  function pinForKey(specId, keys, symbol, control, pins) {
    var map = {};
    keys.forEach(function (k) { map[k.symbol] = k; });
    var operating = chainOf(keys, symbol).map(function (s) { return map[s].cuts; });
    return pinLock(specId, { operating: operating, control: control || null, pins: pins });
  }

  var API = {
    SPECS: SPECS,
    validateKey: validateKey,
    pinLock: pinLock,
    opens: opens,
    acceptedKeyCount: acceptedKeyCount,
    checkSystemLock: checkSystemLock,
    progressions: progressions,
    designTPP: designTPP,
    chainOf: chainOf,
    pinForKey: pinForKey
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TKS_KEYCALC = API;
})(typeof window !== 'undefined' ? window : this);

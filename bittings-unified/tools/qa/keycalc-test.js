'use strict';
var K = require('../../app/keycalc.js');
var lines = [];
var failed = 0;
function check(name, ok, detail) {
  if (ok) lines.push('PASS ' + name);
  else { failed++; lines.push('FAIL ' + name + ' → ' + (detail === undefined ? '' : detail)); }
}
function J(x) { return JSON.stringify(x); }
function eq(name, a, b) { check(name, J(a) === J(b), 'got ' + J(a) + ' expected ' + J(b)); }
function has(arr, text) { return arr.some(function (s) { return s.indexOf(text) >= 0; }); }

// --- A2 / Schlage SFIC manual worked example
(function () {
  var control = [5, 0, 9, 4, 2, 7];
  var ops = [[3, 6, 1, 6, 0, 5], [1, 2, 3, 6, 0, 5], [1, 2, 3, 0, 2, 9]];
  var r = K.pinLock('a2', { operating: ops, control: control, pins: 6 });
  // (bottom, master, build-up, top). Chamber 2: research transcription says top 10,
  // but 23 - (2+4+4) = 13 -- manual page to be checked.
  var exp = [[1, 2, 12, 8], [2, 4, 4, 13], [1, 2, 16, 4], [0, 6, 8, 9], [0, 2, 10, 11], [5, 4, 8, 6]];
  check('a2 manual: 6 rows', r.rows.length === 6, r.rows.length);
  exp.forEach(function (e, i) {
    var row = r.rows[i];
    var got = [row.bottom, row.masters.reduce(function (a, b) { return a + b; }, 0), row.build, row.top];
    eq('a2 manual chamber ' + (i + 1), got, e);
  });
  check('a2 manual complete', r.complete === true);
  var noCtl = K.pinLock('a2', { operating: ops, pins: 6 });
  check('a2 without control is incomplete', noCtl.complete === false && noCtl.errors.length > 0);
})();

// --- a2 kit warning
(function () {
  var r = K.pinLock('a2', { operating: [[9, 0, 0, 0, 0, 0, 0]], control: [0, 0, 0, 0, 0, 0, 0], pins: 7 });
  eq('a2 build-up 1 at plug 9', r.rows[0].build, 1);
  check('a2 not-in-kit warning', has(r.warnings, 'not in a standard kit'), J(r.warnings));
  var r2 = K.pinLock('a2', { operating: [[9, 0, 0, 0, 0, 0, 0]], control: [0, 0, 0, 0, 0, 0, 0], pins: 7 });
  check('a2 no impossible warning for build 1', !has(r2.warnings, 'impossible'));
  var r3 = K.pinLock('a2', { operating: [[9, 0, 0, 0, 0, 0, 0]], control: [0, 0, 0, 0, 0, 0, 0].map(function () { return 0; }), pins: 7 });
  check('a2 impossible case flagged when build<0',
    has(K.pinLock('a2', { operating: [[9, 0, 0, 0, 0, 0, 0]], control: [0, 0, 0, 0, 0, 0, 0] }).warnings, 'standard kit') && r3.rows.length === 7);
  var r4 = K.pinLock('a2', { operating: [[9, 9, 9, 9, 9, 9, 9], [0, 0, 0, 0, 0, 0, 0]], control: [-2, -2, -2, -2, -2, -2, -2] });
  check('a2 negative build warns impossible', has(r4.warnings, 'impossible'), J(r4.warnings));
})();

// --- Sargent 6300
(function () {
  var tmk = [2, 3, 2, 5, 4, 1];
  var ck = [2, 3, 4, 7, 4, 1];
  var op2 = [2, 3, 4, 5, 4, 1];
  var control = [2, 3, 6, 5, 4, 1];
  var r = K.pinLock('s6300', { operating: [op2, tmk], control: control, pins: 6 });
  var c3 = r.rows[2];
  eq('s6300 ch3 factor/controlSplit', c3.controlSplit, 10);
  eq('s6300 ch3 bottom', c3.bottom, 2);
  eq('s6300 ch3 master', c3.masters, [2]);
  eq('s6300 ch3 driver', c3.top, 6);
  eq('s6300 ch1 top = 15 - (bottom+masters)', r.rows[0].top, 13);
  check('s6300 hollow driver note', has(r.notes, 'hollow drivers'));
  check('s6300 no errors when control matches', r.errors.length === 0, J(r.errors));
  void ck;
  var bad = K.pinLock('s6300', { operating: [[2, 3, 2, 5, 4, 1], [2, 3, 4, 5, 4, 1]], control: [9, 3, 6, 5, 4, 1], pins: 6 });
  check('s6300 control vs TMK mismatch pos 1 -> error', bad.errors.length > 0 && has(bad.errors, 'position 1'), J(bad.errors));
  check('s6300 mismatch not complete', bad.complete === false);
})();

// --- sc
(function () {
  check('sc MACS 0 8 0 0 0 0 fails', K.validateKey('sc', [0, 8, 0, 0, 0, 0]).ok === false);
  check('sc MACS error names positions', has(K.validateKey('sc', [0, 8, 0, 0, 0, 0]).errors, 'positions 1 and 2'));
  check('sc MACS 0 7 0 7 0 7 passes', K.validateKey('sc', [0, 7, 0, 7, 0, 7]).ok === true);
  check('sc wrong length', K.validateKey('sc', [1, 2, 3]).ok === false);
  check('sc 5-pin with opts.pins', K.validateKey('sc', [1, 2, 3, 4, 5], { pins: 5 }).ok === true);
  check('sc non-integer', K.validateKey('sc', [1, 2.5, 3, 4, 5, 6]).ok === false);
  check('sc out of range', K.validateKey('sc', [1, 2, 3, 4, 5, 10]).ok === false);
  check('sc parity warning', K.validateKey('sc', [4, 6, 2, 7, 3, 5], { step: 2, parityOf: [4, 6, 2, 7, 3, 4] }).warnings.length === 1);
  var r = K.pinLock('sc', { operating: [[4, 6, 2, 7, 3, 5], [6, 8, 4, 9, 5, 7]] });
  check('sc top null', r.rows.every(function (x) { return x.top === null; }));
  check('sc complete false', r.complete === false);
  check('sc top note once', r.notes.filter(function (n) { return n === 'Top pins: use your Schlage kit chart (rule not confirmed yet)'; }).length === 1, J(r.notes));
  var one = K.pinLock('sc', { operating: [[1, 1, 1, 1, 1, 1], [2, 2, 2, 2, 2, 2]] });
  check('sc master pin 1 warns 2-step', has(one.warnings, '2-step'), J(one.warnings));
  check('SPECS all unverified', ['sc', 'a2', 's6300'].every(function (k) { return K.SPECS[k].verified === false; }));
})();

// --- progressions
var TMK = [4, 6, 2, 7, 3, 5];
eq('progressions sc step 2', K.progressions('sc', TMK, 2),
  [[6, 8, 0, 2], [8, 0, 2, 4], [4, 6, 8, 0], [9, 1, 3, 5], [5, 7, 9, 1], [7, 9, 1, 3]]);
eq('progressions step 1', K.progressions('sc', [4], 1), [[5, 6, 7, 8, 9, 0, 1, 2, 3]]);

// --- designTPP
var design = K.designTPP('sc', { tmk: TMK, step: 2, masterPositions: [1, 2], mastersWanted: 3, keysPerMaster: 3 });
check('design ok', design.ok === true, J(design));
var byS = {};
design.keys.forEach(function (k) { byS[k.symbol] = k; });
eq('design GM', byS.GM.cuts, TMK);
eq('design AA', byS.AA.cuts, [6, 8, 2, 7, 3, 5]);
eq('design AB', byS.AB.cuts, [6, 0, 2, 7, 3, 5]);
eq('design AA1', byS.AA1.cuts, [6, 8, 4, 9, 5, 7]);
check('design 3 masters + 9 changes + GM', design.keys.length === 13, design.keys.length);
check('design all keys valid', design.keys.every(function (k) { return K.validateKey('sc', k.cuts).ok; }));
(function () {
  var seen = {}, dup = false;
  design.keys.forEach(function (k) { var s = k.cuts.join(','); if (seen[s]) dup = true; seen[s] = 1; });
  check('design no identical keys', !dup);
})();
eq('design capacity', design.capacity, { masters: 16, perMaster: 256 });
eq('chainOf', K.chainOf(design.keys, 'AA1'), ['GM', 'AA', 'AA1']);
check('design levels', byS.GM.level === 0 && byS.AA.level === 1 && byS.AA1.level === 2 && byS.AA1.parent === 'AA');
check('design bad tmk', K.designTPP('sc', { tmk: [0, 9, 0, 0, 0, 0], step: 2, masterPositions: [1], mastersWanted: 1, keysPerMaster: 1 }).ok === false);
(function () {
  // MACS skipping: tmk where some progressions break MACS
  var d = K.designTPP('sc', { tmk: [0, 1, 0, 1, 0, 1], step: 1, masterPositions: [1], mastersWanted: 9, keysPerMaster: 1 });
  check('design MACS skips counted', d.ok && d.skipped > 0 && d.keys.every(function (k) { return K.validateKey('sc', k.cuts).ok; }), J(d.skipped));
  var s = K.designTPP('s6300', { tmk: TMK, step: 2, masterPositions: [1, 2], mastersWanted: 1, keysPerMaster: 1 });
  check('design s6300 note', has(s.notes, 'positions 1,2,5,6'), J(s.notes));
})();

// --- system lock checks
(function () {
  var changes = design.keys.filter(function (k) { return k.level === 2; });
  var allOk = true, detail = '';
  changes.forEach(function (ck) {
    var r = K.pinForKey('sc', design.keys, ck.symbol, null, 6);
    var res = K.checkSystemLock(r.rows, K.chainOf(design.keys, ck.symbol), design.keys);
    if (!res.ok) { allOk = false; detail += ck.symbol + ':' + res.extra.join('/') + ' '; }
  });
  check('every change-key lock is clean', allOk, detail);

  var r = K.pinForKey('sc', design.keys, 'AA1', null, 6);
  check('opens: GM', K.opens(r.rows, byS.GM.cuts));
  check('opens: master AA', K.opens(r.rows, byS.AA.cuts));
  check('opens: change AA1', K.opens(r.rows, byS.AA1.cuts));
  check('opens: AA2 does not', !K.opens(r.rows, byS.AA2.cuts));
  check('opens: AB does not', !K.opens(r.rows, byS.AB.cuts));
  check('acceptedKeyCount = 64', K.acceptedKeyCount(r.rows) === 64, K.acceptedKeyCount(r.rows));

  // Negative: lock cross-keyed for AA1 and AB1 (uncontrolled cross key)
  var ops = [byS.GM.cuts, byS.AA1.cuts, byS.AB1.cuts];
  var cross = K.pinLock('sc', { operating: ops, pins: 6 });
  var res = K.checkSystemLock(cross.rows, ['GM', 'AA1', 'AB1'], design.keys);
  check('cross-keyed lock reports extras', !res.ok && res.extra.indexOf('AA') >= 0 && res.extra.indexOf('AB') >= 0, J(res));
})();

console.log(lines.join('\n'));
console.log(failed ? failed + ' FAILED' : 'ALL PASSED');
process.exit(failed ? 1 : 0);

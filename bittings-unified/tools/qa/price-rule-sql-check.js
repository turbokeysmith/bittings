// 8z139 / 8z140 — the automatic key-price rule exists twice: in the app (autoPriceFor in index.html — the price box and the
// "change every price" button) and in the database (public.auto_price_calc — the price a key gets when its TYPE is changed).
// This runs the SAME grid of settings × costs × key types through both and compares every answer, cent for cent.
// READ-ONLY; needs the Supabase CLI link.   node tools/qa/price-rule-sql-check.js
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..'), REPO = path.resolve(ROOT, '..');
let fails = 0; const check = (name, ok, info) => { if (ok) console.log('ok   ' + name); else { fails++; console.log('FAIL ' + name + '  → ' + JSON.stringify(info).slice(0, 1500)); } };

// ---- the app's copy, lifted out of the real files ----
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), fit = fs.readFileSync(path.join(ROOT, 'app', 'fitment.js'), 'utf8');
const a0 = html.indexOf('function autoPriceFor(cost, category, name){'), a1 = html.indexOf('/* 8z89', a0);
if (a0 < 0 || a1 < 0) { console.log('CRASH autoPriceFor not found in index.html'); process.exit(1); }
const prox = (fit.match(/var KEY_PROX=.*?;/) || [])[0], ksub = (fit.match(/function keySub\(p\)\{.*?\n/) || [])[0];
if (!prox || !ksub) { console.log('CRASH keySub not found in app/fitment.js'); process.exit(1); }
const box = { A: null }; vm.createContext(box);
vm.runInContext(prox + '\n' + ksub + '\nvar TKS_FIT={ keySub:keySub }, TKS={ Config:{ autoPrice:function(){ return A; } } };\n' + html.slice(a0, a1), box);
const DEFAULTS = { on: true, stdMarkupPct: 150, smartMarkupPct: 200, roundTo: 5, stdMin: 25, smartMin: 75 };   // app/store.js

const base = { on: true, stdMarkupPct: 150, smartMarkupPct: 200, roundTo: 5, stdMin: 25, smartMin: 150 };
const SETTINGS = [
  ['the shop today (two percentages, two lowest prices)', base],
  ['remote / flip and transponder with their own % and lowest price', Object.assign({}, base, { remoteMarkupPct: 300, remoteMin: 95, transponderMarkupPct: 200, transponderMin: 60 })],
  ['… plus a highest price on every kind', Object.assign({}, base, { remoteMarkupPct: 300, remoteMin: 95, transponderMarkupPct: 200, transponderMin: 60, smartMax: 400, remoteMax: 150, transponderMax: 80, stdMax: 40 })],
  ['no rounding, no lowest price, blanks left blank', { on: true, stdMarkupPct: 100, smartMarkupPct: 120, roundTo: 0, stdMin: 0, smartMin: 0, remoteMin: '', transponderMin: null, smartMax: '', remoteMarkupPct: null }],
  ['a highest price that is UNDER what some keys cost (never sell under cost)', Object.assign({}, base, { roundTo: 10, remoteMax: 60, smartMax: 100, stdMax: 10 })],
  ['numbers saved as text', { on: true, stdMarkupPct: '150', smartMarkupPct: '200', roundTo: '5', stdMin: '25', smartMin: '150', remoteMin: '95', remoteMax: '200' }],
  ['accessories switched on: +300 %, lowest $2, highest $20, rounded to the next $1', Object.assign({}, base, { accMarkupPct: 300, accMin: 2, accMax: 20, accRoundTo: 1 })],
  ['accessories on with no rounding of their own (they use the $5 step of the keys)', Object.assign({}, base, { accMarkupPct: 100, accRoundTo: '' })],
  ['accessories on, rounded to 50 cents, saved as text', Object.assign({}, base, { accMarkupPct: '250', accMin: '0', accRoundTo: '0.5' })],
  ['the rules switched off', Object.assign({}, base, { on: false, accMarkupPct: 300 })],
  ['a shop that never saved any rules', {}],
];
const COSTS = [0, 0.3, 1.19, 2.5, 4, 7, 12, 19.99, 20, 20.85, 30, 55, 65, 120, 199.5, 400];
const KEYS = [['Keys/Smart Key', 'TEST key'], ['Keys/Remote Head / Flip', 'TEST key'], ['Keys/Remote / Fob', 'TEST key'], ['Keys/Transponder', 'TEST key'], ['Keys/Mechanical', 'TEST key'], ['Keys/Key Shell', 'TEST key'],
  ['Keys/Remote / Fob', 'TEST PEPS key'], ['Keys/Transponder', 'TEST Proximity key'], ['Hardware/Locks', 'TEST lock'], ['Hardware/Locks', 'TEST prox reader'], ['', 'TEST nothing'], ['Keys/', 'TEST bare'], ['keys/remote / fob', 'TEST lower case'],
  ['Accessories/Key Rings & Clips', 'TEST ring'], ['Accessories/Skins & Covers', 'TEST prox key cover'], ['accessories/lights', 'TEST light']];

const rows = [], app = [];
SETTINGS.forEach((S, si) => COSTS.forEach((c) => KEYS.forEach((k, ki) => {
  box.A = Object.assign({}, DEFAULTS, S[1]);
  const r = vm.runInContext('autoPriceFor(' + JSON.stringify(c) + ', ' + JSON.stringify(k[0]) + ', ' + JSON.stringify(k[1]) + ')', box);
  app.push(r ? r.cents : null); rows.push([si, c, ki]);
})));
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const sql = `with s(si, a) as (values ${SETTINGS.map((S, i) => `(${i}, ${q(JSON.stringify(S[1]))}::jsonb)`).join(', ')}),
     k(ki, cat, nm) as (values ${KEYS.map((k, i) => `(${i}, ${q(k[0])}, ${q(k[1])})`).join(', ')}),
     c(cost) as (values ${COSTS.map(c => `(${c}::numeric)`).join(', ')})
select json_build_object('cells', (select json_object_agg(s.si || '|' || c.cost || '|' || k.ki, public.auto_price_calc(s.a, c.cost, k.cat, k.nm)) from s, c, k),
  'kinds', (select json_object_agg(k.ki, public.key_price_kind(k.cat, k.nm)) from k),
  'trigger', (select count(*) from pg_trigger t join pg_class cl on cl.oid = t.tgrelid where cl.relname = 'inventory' and t.tgname = 'trg_inventory_reprice_on_kind' and t.tgenabled <> 'D')) as r;`;
const tmp = path.join(os.tmpdir(), 'price-rule-check-' + process.pid + '.sql'); fs.writeFileSync(tmp, sql);
let out = '';
try { out = cp.execSync(`npx supabase@3.0.0 db query --remote --read-only --file "${tmp}"`, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }); }
catch (e) { console.log('CRASH could not query the cloud: ' + String(e.stdout || e.stderr || e.message).slice(0, 800)); process.exit(1); }
finally { try { fs.unlinkSync(tmp); } catch (e) {} }
const p0 = out.indexOf('{'); let d = 0, p1 = -1, inS = false, esc = false;
for (let i = p0; i < out.length; i++) { const ch = out[i]; if (inS) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inS = false; continue; } if (ch === '"') inS = true; else if (ch === '{') d++; else if (ch === '}') { d--; if (!d) { p1 = i; break; } } }
const r = JSON.parse(out.slice(p0, p1 + 1)).rows[0].r;

SETTINGS.forEach((S, si) => { const wrong = [];
  rows.forEach((row, n) => { if (row[0] !== si) return; const srv = r.cells[row[0] + '|' + row[1] + '|' + row[2]]; const s2 = (srv === undefined) ? null : srv;
    if (s2 !== app[n]) wrong.push({ cost: row[1], key: KEYS[row[2]].join(' · '), app: app[n], server: s2 }); });
  check('app and server give the same price for every key and cost — ' + S[0] + ' (' + COSTS.length * KEYS.length + ' cases)', wrong.length === 0, wrong.slice(0, 8)); });
const kinds = KEYS.map((k, i) => r.kinds[i]);
check('the server sorts stock into the same kinds: smart, remote (remote-head / flip / fob), transponder, other, accessory (even with "prox" in its name); anything else has none',
  JSON.stringify(kinds) === JSON.stringify(['smart', 'remote', 'remote', 'transponder', 'other', 'other', 'smart', 'smart', null, 'smart', null, 'other', 'remote', 'accessory', 'accessory', 'accessory']), kinds);
const at = (si, cost, ki) => r.cells[si + '|' + cost + '|' + ki];
check('worked examples on the server: today a $30 fob is $75 and the SAME key as a smart key is $150; with a highest price of $400 a $199.50 smart key is $400, not $600',
  at(0, 30, 2) === 7500 && at(0, 30, 0) === 15000 && at(2, 199.5, 0) === 40000 && at(0, 199.5, 0) === 60000, [at(0, 30, 2), at(0, 30, 0), at(2, 199.5, 0), at(0, 199.5, 0)]);
check('a highest price never puts a key under its cost: remote highest $60, a $120 remote key is priced at its cost ($120), not $60', at(4, 120, 1) === 12000, at(4, 120, 1));
check('rules switched off → the server sets no price', COSTS.every(c => KEYS.every((k, ki) => at(9, c, ki) == null)), null);
check('accessories are left alone until a percentage is typed (priced by hand), and with +300 %, lowest $2, highest $20, $1 steps: a 30-cent ring is $2, a $2.50 item is $10, a $7 item is capped at $20',
  at(0, 2.5, 13) == null && at(6, 0.3, 13) === 200 && at(6, 2.5, 13) === 1000 && at(6, 7, 13) === 2000, [at(0, 2.5, 13), at(6, 0.3, 13), at(6, 2.5, 13), at(6, 7, 13)]);
check('the "price follows the key type" trigger is in place on the stock list', Number(r.trigger) === 1, r.trigger);
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);

// 8z142 — "Jobs by type" on the dashboard: every completed job is sorted by what it was (TKS.JobKinds in app/store.js).
// Pure: lifts the classifier out of the real file and runs it on jobs shaped like the ones the shop really has.
//   node tools/qa/job-kinds-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
let fails = 0; const check = (name, ok, info) => { if (ok) console.log('ok   ' + name); else { fails++; console.log('FAIL ' + name + '  → ' + JSON.stringify(info).slice(0, 1200)); } };

const src = fs.readFileSync(path.join(ROOT, 'app', 'store.js'), 'utf8');
const a = src.indexOf('  var JOB_KIND_RULES = ['), b = src.indexOf('  global.TKS = {', a);
if (a < 0 || b < 0) { console.log('CRASH JobKinds not found in app/store.js'); process.exit(1); }
const box = {}; vm.createContext(box);
vm.runInContext("var _catByKey={ automotive:{code:'auto'}, residential:{code:'res'}, commercial:{code:'com'}, safe:{code:'safe'}, accesscontrol:{code:'accesscontrol'}, other:{code:'other'} };\n" + src.slice(a, b) + '\nthis.JK=JobKinds;', box);
const JK = box.JK, L = (bk) => JK.classify(bk).label;
const it = (...d) => d.map(x => ({ desc: x, qty: 1 }));

// ---- the shop's own jobs (Quick form: free text in "Service / details" + the charges) ----
const REAL = [
  [{ jobType: 'auto', subType: 'AKL', items: it('Service call', 'Cut customer key') }, 'All keys lost'],
  [{ jobType: 'auto', subType: 'Akl' }, 'All keys lost'],
  [{ jobType: 'auto', subType: 'Car lockout', items: it('Car lockout') }, 'Car lockout'],
  [{ jobType: 'auto', subType: 'lockout', items: it('Car lockout') }, 'Car lockout'],
  [{ jobType: 'auto', subType: 'ESL', items: it('Service call', 'ESL Module', 'Key fob / remote programming', 'Financing') }, 'Ignition / key problem'],
  [{ jobType: 'auto', subType: 'REMOTE ISSUE' }, 'Spare key / programming'],
  [{ jobType: 'auto', subType: 'RESYNC', items: it('Travel fee', 'Smart / proximity key programming', 'ECU RESYNC', 'Service call') }, 'Spare key / programming'],
  [{ jobType: 'auto', subType: 'ROVER/JAG 5-Button (KOBJTF10A)', items: it('Smart / proximity key programming') }, 'Spare key / programming'],
  [{ jobType: 'auto', subType: 'SERVICE CALL', items: it('Service call', 'Key fob / remote programming') }, 'Spare key / programming'],
  [{ jobType: 'auto', subType: '', items: it('Smart / proximity key programming', 'Service call') }, 'Spare key / programming'],
  [{ jobType: 'res', subType: 'CYLINDER REPAIR/ REPLACEMENT', items: it('Service call', 'Lock change / replacement') }, 'Lock change / repair'],
  [{ jobType: 'res', subType: 'REKEY', items: it('Service call', 'Rekey') }, 'Rekey'],
];
const wrongReal = REAL.filter(r => L(r[0]) !== r[1]).map(r => ({ job: r[0].subType, want: r[1], got: L(r[0]) }));
check('the shop’s own twelve kinds of job each land in a real type — none is "Something else"', wrongReal.length === 0, wrongReal);

// ---- the guided wizard's choices (it stores a short code) ----
const WIZ = [['auto', 'lockout', 'Car lockout'], ['auto', 'lost', 'All keys lost'], ['auto', 'spare', 'Spare key / programming'], ['auto', 'ignition', 'Ignition / key problem'], ['auto', 'other', 'Other car work'],
  ['res', 'lockout', 'Home lockout'], ['res', 'rekey', 'Rekey'], ['res', 'new', 'Lock change / repair'], ['res', 'lost', 'Lost keys'], ['res', 'other', 'Other home work'],
  ['com', 'lockout', 'Business lockout'], ['com', 'master', 'Master key system'], ['com', 'rekey', 'Rekey'], ['com', 'access', 'Access control'], ['com', 'other', 'Other business work']];
const wrongWiz = WIZ.filter(w => L({ jobType: w[0], subType: w[1], bookedVia: 'guided', serviceCategory: 'automotive', serviceLabel: 'Car key replacement / lost key' }) !== w[2]).map(w => ({ w, got: L({ jobType: w[0], subType: w[1] }) }));
check('every choice in the guided "new job" steps maps to its type (car, home and business)', wrongWiz.length === 0, wrongWiz);

// ---- the shop's service list: a job whose only clue is the charge line ----
const SVC = [['auto', 'Car lockout', 'Car lockout'], ['auto', 'Car key duplication / spare', 'Spare key / programming'], ['auto', 'Car key replacement (lost all keys)', 'All keys lost'],
  ['auto', 'Transponder / chip key programming', 'Spare key / programming'], ['auto', 'Push-to-start programming', 'Spare key / programming'], ['auto', 'Ignition repair / replacement', 'Ignition / key problem'],
  ['auto', 'Broken key extraction', 'Ignition / key problem'], ['auto', 'Cut customer provided key', 'Spare key / programming'], ['auto', 'Blade key programming', 'Spare key / programming'],
  ['res', 'House lockout', 'Home lockout'], ['res', 'Rekey W/O Existing Key', 'Rekey'], ['res', 'Lock change / replacement', 'Lock change / repair'], ['res', 'Lock repair', 'Lock change / repair'],
  ['res', 'Deadbolt installation', 'Lock change / repair'], ['res', 'Smart lock installation', 'Lock change / repair'], ['res', 'Key duplication', 'Key copies'],
  ['com', 'Commercial lockout', 'Business lockout'], ['com', 'Commercial rekey', 'Rekey'], ['com', 'Commercial lock change / install', 'Lock change / repair'], ['com', 'Panic / exit device (push bar)', 'Lock change / repair'],
  ['com', 'Door closer install / repair', 'Lock change / repair'], ['com', 'Storefront / mortise locks', 'Lock change / repair'], ['com', 'High-security locks', 'Lock change / repair']];
const wrongSvc = SVC.filter(s => L({ jobType: s[0], subType: '', items: it('Service call', s[1], 'Travel fee') }) !== s[2]).map(s => ({ svc: s[1], want: s[2], got: L({ jobType: s[0], items: it(s[1]) }) }));
check('a job with nothing typed is sorted by its charges — the shop’s service list, with "Service call" and "Travel fee" ignored', wrongSvc.length === 0, wrongSvc);

check('the most telling charge wins: programming + "Car key replacement (lost all keys)" on one job = All keys lost',
  L({ jobType: 'auto', items: it('Smart / proximity key programming', 'Service call', 'Car key replacement (lost all keys)') }) === 'All keys lost', null);
check('what was typed beats the charges: "AKL" with only a cut-key charge is All keys lost', L({ jobType: 'auto', subType: 'AKL', items: it('Cut customer key') }) === 'All keys lost', null);
check('nothing to go on → "Other car / home / business work", never "Something else"',
  L({ jobType: 'auto', items: it('Service call') }) === 'Other car work' && L({ jobType: 'res' }) === 'Other home work' && L({ jobType: 'com', subType: 'see notes' }) === 'Other business work' && L({}) === 'Other', [L({ jobType: 'auto' }), L({})]);
check('an estimate marked "a key" with only the key on it is a key job', L({ jobType: 'auto', need: 'key', subType: 'TOY PRIUS 04-09 (MOZB21TG)', items: it('TOY PRIUS 04-09 (MOZB21TG)') }) === 'Spare key / programming', null);
check('an explicit jobKind on the job is used as it is', L({ jobType: 'auto', jobKind: 'akl', subType: 'lockout' }) === 'All keys lost', null);
check('a job with no jobType but a category (older records) still reads right', L({ serviceCategory: 'residential', subType: 'locked out' }) === 'Home lockout' && L({ serviceCategory: 'safe' }) === 'Safe work', [L({ serviceCategory: 'residential', subType: 'locked out' }), L({ serviceCategory: 'safe' })]);

// ---- the dashboard uses it ----
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const d0 = html.indexOf('function dashTypes(monthB){'), d1 = html.indexOf('\nfunction dashDeltaPct', d0);
const dbox = { TKS: { JobKinds: JK }, BK: [] }; vm.createContext(dbox);
vm.runInContext('function dashAllBookings(){ return BK; } function dashInMonth(d,b){ return !!d; }\n' + html.slice(d0, d1) + '\nthis.dashTypes=dashTypes;', dbox);
dbox.BK = REAL.map(r => Object.assign({ status: 'Completed', date: '2026-11-11' }, r[0])).concat([{ status: 'Scheduled', date: '2026-11-11', jobType: 'auto', subType: 'lockout' }, { status: 'Completed', date: '2026-11-11', jobType: 'auto', subType: 'see notes' }]);
const T = dbox.dashTypes({});
check('the chart: biggest type first, "Other" last, only completed jobs counted, the shares add up',
  T.total === 13 && T.rows[0].label === 'Spare key / programming' && T.rows[0].n === 5 && T.rows[T.rows.length - 1].label === 'Other car work' && T.rows.reduce((s, r) => s + r.n, 0) === 13 && !T.rows.some(r => /Something else/.test(r.label)),
  T.rows.map(r => r.label + ' ' + r.n));
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);

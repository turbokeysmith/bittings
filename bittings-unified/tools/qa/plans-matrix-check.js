// 8z136 — "pays $79, gets Pro" cannot slip through: the plan → feature table the SERVER enforces
// (public.tier_feature) is read from the cloud and compared, cell by cell, with the copy the app uses to
// lock its menu (app/tier.js). Also shows each shop's subscription row and that the daily billing check is scheduled.
// READ-ONLY. Needs the Supabase CLI link (run from anywhere):  node tools/qa/plans-matrix-check.js
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..'), REPO = path.resolve(ROOT, '..');
let fails = 0; const check = (name, ok, info) => { if (ok) console.log('ok   ' + name); else { fails++; console.log('FAIL ' + name + '  → ' + JSON.stringify(info)); } };

// the app's copy: run app/tier.js with a stand-in page and read TKS_TIER.matrix
const el = () => ({ dataset: {}, classList: { toggle() {}, contains() { return false; }, add() {}, remove() {} }, setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, appendChild() {}, insertBefore() {}, querySelector() { return null; }, addEventListener() {}, remove() {}, style: {} });
const win = { localStorage: { getItem() { return null; }, setItem() {} }, location: { search: '', pathname: '/', hash: '' }, history: { replaceState() {} },
  document: { readyState: 'complete', hidden: false, querySelectorAll() { return []; }, getElementById() { return null; }, addEventListener() {}, createElement: el, body: el(), head: el(), querySelector() { return null; } } };
win.window = win; vm.createContext(win);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'app', 'tier.js'), 'utf8'), win);
const M = win.TKS_TIER.matrix, TIERS = ['none', 'lookup', 'starter', 'pro'];
const FEATURES = Array.from(new Set([].concat(M.lookup, M.starter, M.pro))).sort();
const EXTRA = ['activity', 'settings', 'nonsense_feature'];     // not in any plan → the server must answer false

const sql = `select json_build_object(
  'cells', (select json_object_agg(t || ':' || f, public.tier_feature(t, f)) from unnest(array[${TIERS.map(t => `'${t}'`).join(',')}, 'gold']) t, unnest(array[${FEATURES.concat(EXTRA).map(f => `'${f}'`).join(',')}]) f),
  'null_tier', public.tier_feature(null, 'lookup'),
  'grace', public.billing_grace_days(),
  'subs', (select json_agg(json_build_object('shop', sh.name, 'tier', s.tier, 'status', s.status, 'users', s.seats_included + s.seats_addon, 'billed_by_stripe', s.stripe_subscription_id is not null, 'past_due_since', s.past_due_since, 'founder_ends_at', s.founder_ends_at)) from public.subscriptions s join public.shops sh on sh.id = s.shop_id),
  'shops_without_row', (select coalesce(json_agg(sh.name), '[]'::json) from public.shops sh where not exists (select 1 from public.subscriptions s where s.shop_id = sh.id)),
  'cron', (select json_agg(json_build_object('name', jobname, 'schedule', schedule, 'active', active)) from cron.job where jobname = 'billing-notices-daily'),
  'last_run', (select json_build_object('ran_at', ran_at, 'summary', summary) from public.billing_runs order by ran_at desc limit 1)
) as r;`;
const tmp = path.join(os.tmpdir(), 'plans-matrix-check-' + process.pid + '.sql'); fs.writeFileSync(tmp, sql);
let out = '';
try { out = cp.execSync(`npx supabase@3.0.0 db query --remote --read-only --file "${tmp}"`, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
catch (e) { console.log('CRASH could not query the cloud: ' + String(e.stderr || e.message).slice(0, 600)); process.exit(1); }
finally { try { fs.unlinkSync(tmp); } catch (e) {} }
// the CLI prints a JSON document and may add an update notice after it
const a = out.indexOf('{'); let d = 0, e = -1, inS = false, esc = false;
for (let i = a; i < out.length; i++) { const c = out[i]; if (inS) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inS = false; continue; } if (c === '"') inS = true; else if (c === '{') d++; else if (c === '}') { d--; if (!d) { e = i; break; } } }
const r = JSON.parse(out.slice(a, e + 1)).rows[0].r;

const wrong = [];
for (const t of TIERS) for (const f of FEATURES) { const app = (M[t] || []).indexOf(f) >= 0, srv = r.cells[t + ':' + f]; if (app !== srv) wrong.push(t + ':' + f + ' app=' + app + ' server=' + srv); }
check('every plan × feature cell is the same in the app and on the server (' + TIERS.length * FEATURES.length + ' cells)', wrong.length === 0, wrong);
const price = { lookup: M.lookup.length, starter: M.starter.length, pro: M.pro.length };
check('each plan includes everything in the plan below it, and more (Lookup < Starter < Pro)', M.lookup.every(f => M.starter.includes(f)) && M.starter.every(f => M.pro.includes(f)) && price.lookup < price.starter && price.starter < price.pro, price);
check('no plan ("none") gets nothing at all on the server', FEATURES.every(f => r.cells['none:' + f] === false), FEATURES.filter(f => r.cells['none:' + f]));
check('a plan name the server does not know gets nothing', FEATURES.every(f => r.cells['gold:' + f] === false) && r.null_tier === false, null);
check('a feature that is in no plan is refused on every plan', TIERS.every(t => EXTRA.every(f => r.cells[t + ':' + f] === false)), null);
check('Starter does NOT get the Pro-only features (commission, reports, NASTF, timesheets …)', ['commission', 'fleet', 'reports', 'dashboard', 'nastf', 'closeout', 'move_requests', 'timesheets', 'keysystems'].every(f => r.cells['starter:' + f] === false && r.cells['pro:' + f] === true), null);
check('Lookup does NOT get the Starter features (register, inventory, scheduler, quotes …)', ['pos', 'receipts', 'customers', 'inventory', 'scheduler', 'fitment', 'estimates', 'leads'].every(f => r.cells['lookup:' + f] === false && r.cells['starter:' + f] === true), null);
check('the grace after a failed payment is 7 days', r.grace === 7, r.grace);
check('the daily billing check is scheduled and switched on', Array.isArray(r.cron) && r.cron.length === 1 && r.cron[0].active === true, r.cron);
console.log('\nSubscriptions today:'); (r.subs || []).forEach(s => console.log('  ' + JSON.stringify(s)));
console.log('Shops with no subscription row (locked until the owner chooses a plan): ' + JSON.stringify(r.shops_without_row));
console.log('Last daily check: ' + JSON.stringify(r.last_run));
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);

// Multi-tenant RLS isolation proof on a REAL Postgres (embedded-postgres).
// Replicates the production security pattern (shops + shop_members + current_shop()
// + role functions + RESTRICTIVE tenant fence AND-ed under permissive role policies),
// seeds 2 shops with their own users + data, then runs cross-tenant probes as each
// authenticated user. Reports PASS/FAIL like the role sweep.
const path = require('path');
const os = require('os');
// Portable across PCs: pgdata in the system temp dir (override with PG_DBDIR),
// embedded-postgres resolved relative to the repo root (below).
const DBDIR = process.env.PG_DBDIR || path.join(os.tmpdir(), 'bittings-isolation-pgdata');

const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b';
const uA1 = '00000000-0000-0000-0000-0000000000a1', uA2 = '00000000-0000-0000-0000-0000000000a2', uB1 = '00000000-0000-0000-0000-0000000000b1';

const SETUP = `
create role authenticated nologin;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.user_id', true),'')::uuid $$;

create table shops(id uuid primary key default gen_random_uuid(), name text, created_at timestamptz default now());
create table shop_members(shop_id uuid references shops(id), user_id uuid, role text, active boolean default true, created_at timestamptz default now(), primary key(shop_id,user_id));
create function current_shop() returns uuid language sql stable security definer set search_path=public as $$ select shop_id from shop_members where user_id=auth.uid() and active order by created_at limit 1 $$;
create function current_staff_role() returns text language sql stable security definer set search_path=public as $$ select role from shop_members where user_id=auth.uid() and active and shop_id=current_shop() limit 1 $$;
create function is_staff() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from shop_members where user_id=auth.uid() and active) $$;
create function is_manager() returns boolean language sql stable security definer set search_path=public as $$ select current_staff_role() in ('manager','owner') $$;
create function is_owner() returns boolean language sql stable security definer set search_path=public as $$ select current_staff_role()='owner' $$;

create table customers(id uuid primary key default gen_random_uuid(), name text, shop_id uuid default current_shop());
create table inventory(id uuid primary key default gen_random_uuid(), part text, shop_id uuid default current_shop());
alter table customers enable row level security; alter table inventory enable row level security;
alter table shops enable row level security; alter table shop_members enable row level security;

-- permissive ROLE policies (the existing app rules: staff read, manager writes inventory, owner deletes)
create policy c_sel on customers for select to authenticated using (is_staff());
create policy c_ins on customers for insert to authenticated with check (is_staff());
create policy c_upd on customers for update to authenticated using (is_staff()) with check (is_staff());
create policy c_del on customers for delete to authenticated using (is_owner());
create policy i_sel on inventory for select to authenticated using (is_staff());
create policy i_ins on inventory for insert to authenticated with check (is_manager());
create policy i_upd on inventory for update to authenticated using (is_manager()) with check (is_manager());
-- RESTRICTIVE tenant fence (AND-ed under every role policy)
create policy c_tenant on customers as restrictive for all to authenticated using (shop_id=current_shop()) with check (shop_id=current_shop());
create policy i_tenant on inventory as restrictive for all to authenticated using (shop_id=current_shop()) with check (shop_id=current_shop());
create policy sh_sel on shops for select to authenticated using (id=current_shop());
create policy sm_sel on shop_members for select to authenticated using (shop_id=current_shop());

grant usage on schema public, auth to authenticated;
grant select,insert,update,delete on customers, inventory to authenticated;
grant select on shops, shop_members to authenticated;

-- seed (as superuser -> RLS bypassed; set shop_id explicitly)
insert into shops(id,name) values ('${A}','Shop A'),('${B}','Shop B');
insert into shop_members(shop_id,user_id,role) values
  ('${A}','${uA1}','owner'),('${A}','${uA2}','technician'),('${B}','${uB1}','owner');
insert into customers(name,shop_id) values ('Acme A1','${A}'),('Acme A2','${A}'),('Beta B1','${B}'),('Beta B2','${B}');
insert into inventory(part,shop_id) values ('A-part-1','${A}'),('A-part-2','${A}'),('B-part-1','${B}'),('B-part-2','${B}');

-- ===================== PAYMENT PATH (5b money-path guard) =====================
-- Mirrors production: receipts + payment_transactions + payment_events all carry
-- shop_id + a RESTRICTIVE tenant fence. The edge functions run as SERVICE ROLE
-- (RLS-bypassing), so the real protections are (a) DB triggers that DERIVE a
-- payment row's shop from its receipt/txn — forge-proof even under service_role —
-- and (b) the functions scoping every lookup by the caller's shop. Both proven below.
create table receipts(id text primary key, data jsonb, shop_id uuid default current_shop());
create table payment_transactions(
  id uuid primary key default gen_random_uuid(),
  invoice_id text, stripe_payment_intent_id text unique, method text,
  status text default 'pending', base_cents int, captured_cents int,
  stripe_refund_id text, created_by uuid, shop_id uuid default current_shop());
create table payment_events(
  id text primary key, type text, payment_intent_id text, payload jsonb,
  shop_id uuid default current_shop());

-- (5b) a transaction's shop is ALWAYS its receipt's shop — never trusted from the writer
create function payment_txn_stamp_shop() returns trigger language plpgsql security definer set search_path=public as $$
declare v uuid; begin
  select shop_id into v from receipts where id = NEW.invoice_id;
  if v is not null then NEW.shop_id := v; end if; return NEW; end $$;
create trigger trg_pt before insert or update on payment_transactions for each row execute function payment_txn_stamp_shop();
-- (5b) an event's shop is the matching transaction's shop (webhook has no caller)
create function payment_event_stamp_shop() returns trigger language plpgsql security definer set search_path=public as $$
declare v uuid; begin
  if NEW.shop_id is null and NEW.payment_intent_id is not null then
    select shop_id into v from payment_transactions where stripe_payment_intent_id = NEW.payment_intent_id limit 1;
    NEW.shop_id := v; end if; return NEW; end $$;
create trigger trg_pe before insert on payment_events for each row execute function payment_event_stamp_shop();

alter table receipts enable row level security;
alter table payment_transactions enable row level security;
alter table payment_events enable row level security;
-- permissive ROLE policies (staff read; manager mutates payments) ...
create policy r_sel  on receipts for select to authenticated using (is_staff());
create policy pt_sel on payment_transactions for select to authenticated using (is_staff());
create policy pt_all on payment_transactions for all to authenticated using (is_manager()) with check (is_manager());
create policy pe_sel on payment_events for select to authenticated using (is_manager());
-- ... AND a RESTRICTIVE tenant fence under each
create policy r_tenant  on receipts             as restrictive for all to authenticated using (shop_id=current_shop()) with check (shop_id=current_shop());
create policy pt_tenant on payment_transactions as restrictive for all to authenticated using (shop_id=current_shop()) with check (shop_id=current_shop());
create policy pe_tenant on payment_events       as restrictive for all to authenticated using (shop_id=current_shop()) with check (shop_id=current_shop());
grant select,insert,update,delete on receipts, payment_transactions, payment_events to authenticated;

-- seed one receipt + one completed card sale per shop (txn shop derived by trigger)
insert into receipts(id,shop_id) values ('rcptA','${A}'),('rcptB','${B}');
insert into payment_transactions(invoice_id,stripe_payment_intent_id,method,status,base_cents,captured_cents)
  values ('rcptA','pi_A','reader','completed',10000,10000),
         ('rcptB','pi_B','reader','completed',20000,20000);

-- (5f) EXECUTE hygiene, mirrored from production: trigger fns need no caller
-- EXECUTE (checked at CREATE TRIGGER, not at fire time). Proven by the probe below.
revoke execute on function payment_txn_stamp_shop()   from public, authenticated;
revoke execute on function payment_event_stamp_shop() from public, authenticated;
`;

(async () => {
  const epPath = path.join(__dirname, '..', '..', '..', 'node_modules', 'embedded-postgres', 'dist', 'index.js');
  const { default: EmbeddedPostgres } = await import('file:///' + epPath.replace(/\\/g, '/'));
  const pg = new EmbeddedPostgres({ databaseDir: DBDIR, user: 'postgres', password: 'pw', port: 54330, persistent: false, initdbFlags: ['--encoding=UTF8','--locale=C'] });
  await pg.initialise(); await pg.start(); await pg.createDatabase('mt');
  const c = pg.getPgClient('mt'); await c.connect();
  await c.query(SETUP);

  const results = [];
  function check(name, pass, detail) { results.push({ name, pass: !!pass, detail: detail || '' }); }

  // run a query AS an authenticated user (RLS applies); returns rows or throws
  async function asUser(uid, sql, params) {
    await c.query('begin');
    try {
      await c.query("set local role authenticated");
      await c.query("select set_config('app.user_id', $1, true)", [uid]);
      const r = await c.query(sql, params || []);
      await c.query('rollback');
      return r;
    } catch (e) { await c.query('rollback'); throw e; }
  }
  async function tryUser(uid, sql, params) { try { return { rows: (await asUser(uid, sql, params)).rows, err: null }; } catch (e) { return { rows: null, err: e.message }; } }

  // get a shop-B customer id (as superuser) to attack with
  const bCust = (await c.query("select id from customers where shop_id=$1 limit 1", [B])).rows[0].id;
  const bPart = (await c.query("select id from inventory where shop_id=$1 limit 1", [B])).rows[0].id;

  // --- ISOLATION PROBES ---
  let r;
  r = await tryUser(uA1, 'select count(*)::int n, count(*) filter (where shop_id=$1)::int own from customers', [A]);
  check('A-owner sees ONLY shop A customers', r.rows && r.rows[0].n === 2 && r.rows[0].own === 2, r.rows && JSON.stringify(r.rows[0]));
  r = await tryUser(uA1, 'select count(*)::int n from inventory where shop_id=$1', [B]);
  check('A-owner sees 0 of shop B inventory', r.rows && r.rows[0].n === 0, r.rows && JSON.stringify(r.rows[0]));
  r = await tryUser(uB1, 'select count(*)::int n, count(*) filter (where shop_id=$1)::int own from customers', [B]);
  check('B-owner sees ONLY shop B customers', r.rows && r.rows[0].n === 2 && r.rows[0].own === 2, r.rows && JSON.stringify(r.rows[0]));
  r = await tryUser(uA1, 'select * from customers where id=$1', [bCust]);
  check('A-owner cannot SELECT a shop B customer by id', r.rows && r.rows.length === 0, 'rows=' + (r.rows ? r.rows.length : r.err));
  r = await tryUser(uA1, 'update customers set name=$2 where id=$1', [bCust, 'HACKED']);
  check('A-owner cannot UPDATE a shop B customer (0 rows)', r.rows !== null && r.err === null, r.err || 'ok');
  const after = (await c.query("select name from customers where id=$1", [bCust])).rows[0].name;
  check('  -> shop B customer name unchanged', after !== 'HACKED', 'name=' + after);
  r = await tryUser(uA1, 'delete from customers where id=$1', [bCust]);
  const stillThere = (await c.query("select count(*)::int n from customers where id=$1", [bCust])).rows[0].n;
  check('A-owner cannot DELETE a shop B customer', stillThere === 1, 'remaining=' + stillThere);
  r = await tryUser(uA1, "insert into customers(name,shop_id) values ('cross',$1)", [B]);
  check('A-owner cannot INSERT into shop B (with-check blocks)', r.err && /policy/i.test(r.err), r.err || 'NO ERROR (bad)');
  r = await tryUser(uA1, "insert into customers(name) values ('mine') returning shop_id");
  check('A-owner INSERT defaults to shop A', r.rows && r.rows[0].shop_id === A, r.rows && r.rows[0].shop_id);
  r = await tryUser(uA1, 'select count(*)::int n from shops');
  check('A-owner sees ONLY their own shop row', r.rows && r.rows[0].n === 1, r.rows && r.rows[0].n);
  r = await tryUser(uA1, 'select count(*)::int n from shop_members');
  check('A-owner sees ONLY shop A members (2)', r.rows && r.rows[0].n === 2, r.rows && r.rows[0].n);

  // --- ROLE STILL LAYERED WITHIN A SHOP ---
  r = await tryUser(uA2, 'select count(*)::int n from customers');
  check('A-tech (staff) CAN read own-shop customers', r.rows && r.rows[0].n === 2, r.rows && r.rows[0].n);
  r = await tryUser(uA2, "insert into inventory(part) values ('x')");
  check('A-tech (non-manager) CANNOT insert inventory (role still enforced)', r.err && /policy/i.test(r.err), r.err || 'NO ERROR (bad)');
  r = await tryUser(uA1, "insert into inventory(part) values ('ok') returning shop_id");
  check('A-owner (manager) CAN insert inventory -> shop A', r.rows && r.rows[0].shop_id === A, r.rows ? r.rows[0].shop_id : r.err);

  // ===================== PAYMENT-PATH ISOLATION (5b) =====================
  // The edge functions run as SERVICE ROLE (RLS bypassed). We model that with the
  // plain superuser connection `c`, plus the function's own `and shop_id=<caller>`
  // filter — the caller's shop resolved from shop_members exactly like the auth
  // helper does. This proves a Shop A operator cannot touch Shop B's money.
  async function callerShop(uid) {
    return (await c.query("select shop_id from shop_members where user_id=$1 and active order by created_at limit 1", [uid])).rows[0]?.shop_id ?? null;
  }
  const shopOfA = await callerShop(uA1);
  check('auth resolves caller A -> shop A (from shop_members, not client input)', shopOfA === A, 'shop=' + shopOfA);

  // (1) TRIGGER: a txn's shop is DERIVED from its receipt — a forged shop_id is ignored.
  await c.query("insert into payment_transactions(invoice_id,stripe_payment_intent_id,method,status,base_cents,shop_id) values ('rcptB','pi_forge','reader','pending',999,$1)", [A]);
  let row = (await c.query("select shop_id from payment_transactions where stripe_payment_intent_id='pi_forge'")).rows[0];
  check('txn shop_id is DERIVED from its receipt (forged shop_id A on a shop-B receipt is overridden to B)', row.shop_id === B, 'shop=' + row.shop_id);
  await c.query("delete from payment_transactions where stripe_payment_intent_id='pi_forge'");

  // (2) CREATE-CHARGE: a Shop A caller cannot even load a Shop B receipt to charge it.
  let n = (await c.query("select count(*)::int n from receipts where id='rcptB' and shop_id=$1", [shopOfA])).rows[0].n;
  check('charge path: Shop A caller cannot load a Shop B receipt (scoped lookup -> 404)', n === 0, 'rows=' + n);

  // (3) REFUND: a Shop A manager refunding Shop B's PI hits 0 rows -> no Stripe refund issued.
  let upd = await c.query("update payment_transactions set status='refunded', stripe_refund_id='re_hack' where stripe_payment_intent_id='pi_B' and shop_id=$1", [shopOfA]);
  check('refund path: Shop A cannot refund a Shop B payment (0 rows)', upd.rowCount === 0, 'rows=' + upd.rowCount);
  let st = (await c.query("select status from payment_transactions where stripe_payment_intent_id='pi_B'")).rows[0].status;
  check('  -> Shop B payment still completed (untouched)', st === 'completed', 'status=' + st);

  // (4) VOID: a Shop A operator voiding Shop B's txn by id hits 0 rows.
  const bTxnId = (await c.query("select id from payment_transactions where stripe_payment_intent_id='pi_B'")).rows[0].id;
  upd = await c.query("update payment_transactions set status='refunded' where id=$1 and shop_id=$2", [bTxnId, shopOfA]);
  check('void path: Shop A cannot void a Shop B transaction by id (0 rows)', upd.rowCount === 0, 'rows=' + upd.rowCount);

  // (5) STATUS: a Shop A operator reading Shop B's PI status gets nothing.
  n = (await c.query("select count(*)::int n from payment_transactions where stripe_payment_intent_id='pi_B' and shop_id=$1", [shopOfA])).rows[0].n;
  check('status path: Shop A cannot read a Shop B payment status (0 rows)', n === 0, 'rows=' + n);

  // (6) POSITIVE CONTROL: a Shop A manager CAN refund its OWN shop's payment.
  upd = await c.query("update payment_transactions set status='refunded', stripe_refund_id='re_ok' where stripe_payment_intent_id='pi_A' and shop_id=$1", [shopOfA]);
  check('own-shop control: Shop A CAN refund its OWN payment (1 row)', upd.rowCount === 1, 'rows=' + upd.rowCount);
  await c.query("update payment_transactions set status='completed', stripe_refund_id=null where stripe_payment_intent_id='pi_A'");

  // (7) WEBHOOK: a payment_event inserted with NO shop (as Stripe does) is auto-stamped to its txn's shop.
  await c.query("insert into payment_events(id,type,payment_intent_id) values ('evt_B','payment_intent.succeeded','pi_B')");
  row = (await c.query("select shop_id from payment_events where id='evt_B'")).rows[0];
  check('webhook: payment_event auto-stamped to its transaction\'s shop (B)', row.shop_id === B, 'shop=' + row.shop_id);

  // (8) 5f EXECUTE hygiene: the stamp trigger STILL fires for an authenticated
  // session even though EXECUTE on the trigger fn was revoked (checked at
  // CREATE TRIGGER, not at fire time) — proves the production 5f revoke is safe.
  r = await tryUser(uA1, "insert into payment_transactions(invoice_id,stripe_payment_intent_id,method,status,base_cents) values ('rcptA','pi_5f','reader','pending',500) returning shop_id");
  check('5f: stamp trigger fires under authenticated AFTER EXECUTE revoke (shop derived)', r.rows && r.rows[0].shop_id === A, r.rows ? 'shop=' + r.rows[0].shop_id : r.err);

  // (9) RLS defense-in-depth: as authenticated A-owner, only shop A payments are visible.
  r = await tryUser(uA1, 'select count(*)::int n, count(*) filter (where shop_id=$1)::int own from payment_transactions', [A]);
  check('RLS: A-owner sees ONLY shop A payment_transactions', r.rows && r.rows[0].n === 1 && r.rows[0].own === 1, r.rows && JSON.stringify(r.rows[0]));

  await c.end(); await pg.stop();

  const pass = results.filter(x => x.pass).length, fail = results.length - pass;
  console.log('\n================ MULTI-TENANT ISOLATION SWEEP ================');
  results.forEach(x => console.log((x.pass ? 'PASS ' : 'FAIL ') + x.name + (x.detail ? '   [' + x.detail + ']' : '')));
  console.log('-------------------------------------------------------------');
  console.log(`${pass}/${results.length} PASS` + (fail ? `  · ${fail} FAIL` : '  · ALL GREEN'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e.message); process.exit(2); });

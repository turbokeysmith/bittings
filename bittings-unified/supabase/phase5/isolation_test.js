// Multi-tenant RLS isolation proof on a REAL Postgres (embedded-postgres).
// Replicates the production security pattern (shops + shop_members + current_shop()
// + role functions + RESTRICTIVE tenant fence AND-ed under permissive role policies),
// seeds 2 shops with their own users + data, then runs cross-tenant probes as each
// authenticated user. Reports PASS/FAIL like the role sweep.
const path = require('path');
const DBDIR = 'C:/Users/turbo/AppData/Local/Temp/claude/C--Users-turbo-OneDrive-Desktop-bittings-deploy/42e24751-5828-4461-a253-96e50ac54e24/scratchpad/pgdata';

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
`;

(async () => {
  const { default: EmbeddedPostgres } = await import('file:///C:/Users/turbo/OneDrive/Desktop/turbokeysmith-main/node_modules/embedded-postgres/dist/index.js');
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

  await c.end(); await pg.stop();

  const pass = results.filter(x => x.pass).length, fail = results.length - pass;
  console.log('\n================ MULTI-TENANT ISOLATION SWEEP ================');
  results.forEach(x => console.log((x.pass ? 'PASS ' : 'FAIL ') + x.name + (x.detail ? '   [' + x.detail + ']' : '')));
  console.log('-------------------------------------------------------------');
  console.log(`${pass}/${results.length} PASS` + (fail ? `  · ${fail} FAIL` : '  · ALL GREEN'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e.message); process.exit(2); });

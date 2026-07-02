/* ============================================================================
   Turbo Keysmith — shared front-end data layer  (window.TKS)
   ----------------------------------------------------------------------------
   ONE place that every screen (Customers, Receipts, Scheduler, Payments,
   Inventory, and the public Contact form) talks to for data. Today it reads
   and writes the browser's localStorage. Nothing here calls the network.

   >>> CLOUD SWAP POINT <<<
   When the cloud login is ready, implement `CloudAdapter` (Supabase calls) with
   the same method names as `LocalAdapter`, then set ADAPTER = CloudAdapter below.
   No screen code needs to change — they only ever call TKS.* methods, never
   localStorage directly. The localStorage keys are the SAME ones the existing
   Bittings/Scheduler pages already use, so the customer list stays shared.
   ============================================================================ */
(function (global) {
  'use strict';

  // localStorage keys — shared with the existing Bittings + Scheduler pages.
  var KEYS = {
    customers: 'tks_customers',   // individuals + businesses (lead → customer)
    shops:     'tks_shops',       // contracting / NASTF accounts
    inventory: 'tks_inventory',   // parts & stock
    bookings:  'tks_bookings',    // scheduler jobs
    receipts:  'tks_receipts',    // invoices (Bittings)
    settings:  'tks_settings'
  };

  // ---- low-level localStorage helpers (the only place storage is touched) ----
  function read(key, fallback) {
    try { var v = global.localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function write(key, value) {
    try { global.localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' +
      Date.now().toString(36) + '_' +
      Math.random().toString(36).slice(2, 8);
  }
  function now() { return Date.now(); }

  /* ------------------------------------------------------------------ *
   *  LocalAdapter — the storage implementation in use today.           *
   *  CloudAdapter (later) must expose the SAME method names.           *
   * ------------------------------------------------------------------ */
  var LocalAdapter = {
    name: 'local',
    listRaw: function (logicalKey) { return read(KEYS[logicalKey], []); },
    saveRaw: function (logicalKey, arr) { return write(KEYS[logicalKey], arr); }
  };

  /* ------------------------------------------------------------------ *
   *  CloudAdapter — Supabase. READY BUT SWITCHED OFF.                   *
   *  Stays dormant until TKS.connectCloud({url, anonKey}) is called.    *
   *  Same listRaw/saveRaw contract as LocalAdapter, kept synchronous    *
   *  by caching: hydrate() loads every table once, reads come from the  *
   *  cache, writes update the cache immediately and push to Supabase in *
   *  the background. Nothing here runs until you connect — no network,  *
   *  no credentials embedded.                                           *
   *                                                                     *
   *  Table mapping (see supabase/*.sql):                                *
   *    customers  -> public.customers  (is_contracting = false)         *
   *    shops      -> public.customers  (is_contracting = true)          *
   *    inventory  -> public.inventory                                   *
   *    bookings   -> public.bookings   (whole record in jsonb `data`)   *
   *    receipts   -> public.receipts   (whole record in jsonb `data`)   *
   * ------------------------------------------------------------------ */
  function isUuid(v) {
    return typeof v === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  }
  function ts(v) { return v ? Date.parse(v) : undefined; }

  // per-logical-key config: which table, how to map rows <-> JS objects
  var CLOUD_MAP = {
    customers: {
      table: 'customers', idStrategy: 'uuid', filter: { is_contracting: false },
      fromRow: function (r) { return {
        id: r.id, customer: r.name, contact: r.contact, phone: r.phone, email: r.email,
        address: r.address, customerType: r.customer_type,
        status: r.is_contracting ? 'contracting' : 'customer',
        serviceNeeded: r.service_needed, notes: r.notes, lang: r.lang, source: r.source,
        lastUsed: ts(r.last_used), createdAt: ts(r.created_at), updatedAt: ts(r.updated_at),
        deletedAt: ts(r.deleted_at), deletedBy: r.deleted_by }; },
      toRow: function (o) { return {
        name: o.customer || '', contact: o.contact || '', phone: o.phone || '', email: o.email || '',
        address: o.address || '', customer_type: o.customerType || 'individual', is_contracting: false,
        service_needed: o.serviceNeeded || '', notes: o.notes || '', lang: o.lang || '', source: o.source || '',
        deleted_at: o.deletedAt || null, deleted_by: o.deletedBy || null }; }
    },
    shops: {
      table: 'customers', idStrategy: 'uuid', filter: { is_contracting: true },
      fromRow: function (r) { return {
        id: r.id, customer: r.name, contact: r.contact, phone: r.phone, email: r.email,
        address: r.address, customerType: r.customer_type, status: 'contracting',
        serviceNeeded: r.service_needed, notes: r.notes, lang: r.lang, source: r.source,
        lastUsed: ts(r.last_used), createdAt: ts(r.created_at), updatedAt: ts(r.updated_at),
        deletedAt: ts(r.deleted_at), deletedBy: r.deleted_by }; },
      toRow: function (o) { return {
        name: o.customer || '', contact: o.contact || '', phone: o.phone || '', email: o.email || '',
        address: o.address || '', customer_type: o.customerType || 'business', is_contracting: true,
        service_needed: o.serviceNeeded || '', notes: o.notes || '', lang: o.lang || '', source: o.source || '',
        deleted_at: o.deletedAt || null, deleted_by: o.deletedBy || null }; }
    },
    inventory: {
      table: 'inventory', readTable: 'inventory_safe', idStrategy: 'text', filter: null,   // read via cost-masking view (cost null for non-managers)
      fromRow: function (r) { return {
        id: r.id, name: r.name, sku: r.sku, category: r.category, qty: r.qty, lowAt: r.low_at,
        unit: r.unit, cost: r.cost, sellPriceCents: r.sell_price_cents, location: r.location, notes: r.notes,
        supplier: r.supplier, reorderQty: r.reorder_qty, fitment: r.fitment,
        createdAt: ts(r.created_at), updatedAt: ts(r.updated_at) }; },
      toRow: function (o) { return {
        id: o.id, name: o.name || '', sku: o.sku || '', category: o.category || '',
        qty: parseInt(o.qty, 10) || 0, low_at: parseInt(o.lowAt, 10) || 0, unit: o.unit || '',
        cost: o.cost === '' || o.cost == null ? null : Number(o.cost),
        sell_price_cents: (o.sellPriceCents === '' || o.sellPriceCents == null) ? null : parseInt(o.sellPriceCents, 10),
        location: o.location || '',
        notes: o.notes || '', supplier: o.supplier || '', reorder_qty: parseInt(o.reorderQty, 10) || 0,
        fitment: o.fitment || '' }; }
    },
    // bookings + receipts: keep their full (nested) shape inside jsonb `data`
    bookings: {
      table: 'bookings', idStrategy: 'text', filter: null,
      fromRow: function (r) { return Object.assign({}, r.data, { id: r.id }); },
      toRow: function (o) { return {
        id: o.id, data: o, date: o.date || null, time: o.time || null,
        customer_name: (o.customer && o.customer.name) || null }; }
    },
    receipts: {
      table: 'receipts', readTable: 'receipts_safe', idStrategy: 'text', filter: null,   // read via cost-masking view (per-line cost null for non-managers); writes still target receipts
      fromRow: function (r) { return Object.assign({}, r.data, { id: r.id }); },
      toRow: function (o) { return { id: o.id, data: o }; }
    }
  };

  function makeCloudAdapter(sb) {
    var cache = {};       // logicalKey -> array (the synchronous view screens read)
    var shadow = {};      // logicalKey -> last-synced snapshot (to diff on write)
    var localKeys = {};   // logicalKey -> true  (table missing / failed: use localStorage instead)

    function snapshot(arr) { return JSON.parse(JSON.stringify(arr || [])); }

    // load one logical key into the cache
    function hydrateKey(key) {
      var cfg = CLOUD_MAP[key];
      var q = sb.from(cfg.readTable || cfg.table).select('*');   // reads may use a role-safe view; writes still target cfg.table
      if (cfg.filter) Object.keys(cfg.filter).forEach(function (k) { q = q.eq(k, cfg.filter[k]); });
      return q.then(function (res) {
        if (res.error) throw res.error;
        cache[key] = (res.data || []).map(cfg.fromRow);
        shadow[key] = snapshot(cache[key]);
        return cache[key];
      });
    }

    // Resilient: hydrate every table independently. If a table is missing or
    // errors (e.g. you haven't run app_tables_setup.sql yet), THAT key quietly
    // falls back to localStorage while the others sync. Nothing throws.
    function hydrateAll() {
      var keys = Object.keys(CLOUD_MAP);
      return Promise.all(keys.map(function (key) {
        return hydrateKey(key).then(function () { return { key: key, ok: true }; })
          .catch(function (e) {
            localKeys[key] = true;            // this table isn't ready -> stay local for it
            if (global.console) console.warn('[TKS cloud] "' + key + '" staying local:', e.message || e);
            return { key: key, ok: false };
          });
      }));
    }

    function isLocal(key) { return !!localKeys[key]; }

    // diff cache vs shadow and push inserts / updates / deletes
    function flush(key) {
      var cfg = CLOUD_MAP[key];
      var cur = cache[key] || [], prev = shadow[key] || [];
      var prevById = {}; prev.forEach(function (r) { if (r.id) prevById[r.id] = r; });
      var curById = {};  cur.forEach(function (r) { if (r.id) curById[r.id] = r; });

      var inserts = [], updates = [], deletes = [];
      cur.forEach(function (o) {
        var existed = o.id && prevById[o.id];
        if (!existed) inserts.push(o);
        else if (JSON.stringify(o) !== JSON.stringify(prevById[o.id])) updates.push(o);
      });
      prev.forEach(function (o) { if (o.id && !curById[o.id]) deletes.push(o); });

      var ops = [];
      // deletes — verify the server actually removed the row. An RLS-blocked delete
      // returns 0 rows (no error); we must NOT let it vanish locally (no phantom deletes).
      var blockedDeletes = [];
      deletes.forEach(function (o) {
        ops.push(sb.from(cfg.table).delete().eq('id', o.id).select().then(function (res) {
          if (!res.error && Array.isArray(res.data) && res.data.length === 0) blockedDeletes.push(o);
          return res;
        }));
      });
      // updates
      updates.forEach(function (o) { ops.push(sb.from(cfg.table).update(cfg.toRow(o)).eq('id', o.id)); });
      // inserts
      inserts.forEach(function (o) {
        var row = cfg.toRow(o);
        if (cfg.idStrategy === 'uuid' && !isUuid(o.id)) { delete row.id; } // let DB mint a uuid
        ops.push(sb.from(cfg.table).insert(row).select().then(function (res) {
          // adopt the DB-generated id back into the cache record
          if (!res.error && res.data && res.data[0] && res.data[0].id) o.id = res.data[0].id;
          return res;
        }));
      });

      return Promise.all(ops).then(function () {
        if (blockedDeletes.length) {
          // restore rows the server refused to delete → the UI stays honest (no phantom delete)
          var have = {}; (cache[key] || []).forEach(function (r) { if (r.id) have[r.id] = 1; });
          blockedDeletes.forEach(function (o) { if (o.id && !have[o.id]) cache[key].push(o); });
          try { global.dispatchEvent(new CustomEvent('tks:access-blocked', { detail: { action: 'delete', key: key, count: blockedDeletes.length } })); } catch (e) {}
          changeHandlers.forEach(function (fn) { try { fn(); } catch (e) {} });
        }
        shadow[key] = snapshot(cache[key]);
      }).catch(function (e) { if (global.console) console.warn('[TKS cloud flush]', key, e); });
    }

    var pending = {};
    function scheduleFlush(key) {
      if (pending[key]) return;
      pending[key] = setTimeout(function () { pending[key] = null; flush(key); }, 250);
    }

    return {
      name: 'cloud',
      hydrate: hydrateAll,
      isLocal: isLocal,
      // reads/writes for a table that didn't hydrate go to localStorage instead,
      // so the app keeps working table-by-table as you bring the cloud online.
      listRaw: function (key) { return isLocal(key) ? LocalAdapter.listRaw(key) : (cache[key] || []); },
      saveRaw: function (key, arr) {
        if (isLocal(key)) return LocalAdapter.saveRaw(key, arr);
        cache[key] = arr; scheduleFlush(key); return true;
      }
    };
  }

  var ADAPTER = LocalAdapter; // <<< CloudAdapter takes over via TKS.connectCloud() — see below

  // ================= CUSTOMERS (shared across every tile) =================
  // Shape (back-compatible with existing pages):
  //   { id, customer, contact, phone, email, address, customerType,
  //     serviceNeeded, source, status, lastUsed, createdAt, updatedAt }
  // Existing pages key the display name off `customer`, so we keep that.
  var Customers = {
    all: function () { return ADAPTER.listRaw('customers'); },

    search: function (q) {
      q = (q || '').trim().toLowerCase();
      var list = this.all().filter(function (c) { return !c.deletedAt; });   // hide soft-deleted from normal views
      if (!q) return list;
      return list.filter(function (c) {
        return ['customer', 'contact', 'phone', 'email', 'address', 'serviceNeeded']
          .some(function (f) { return (c[f] || '').toLowerCase().indexOf(q) !== -1; });
      });
    },

    // Add or merge a record. Matches an existing customer by phone (preferred)
    // or by exact name, so the Contact form and the front desk don't duplicate.
    upsert: function (data) {
      var list = this.all();
      var phone = (data.phone || '').replace(/\D/g, '');
      var name = (data.customer || '').trim().toLowerCase();
      var existing = list.find(function (c) {
        var cp = (c.phone || '').replace(/\D/g, '');
        if (phone && cp && cp === phone) return true;
        return name && (c.customer || '').trim().toLowerCase() === name;
      });
      if (existing) {
        Object.keys(data).forEach(function (k) {
          if (data[k] !== undefined && data[k] !== '') existing[k] = data[k];
        });
        existing.updatedAt = now();
        existing.lastUsed = now();
        ADAPTER.saveRaw('customers', list);
        return existing;
      }
      var rec = Object.assign({
        id: uid('cust'),
        customerType: 'individual',
        source: 'staff',
        status: 'customer',
        createdAt: now()
      }, data, { updatedAt: now(), lastUsed: now() });
      if (!rec.id) rec.id = uid('cust');
      list.push(rec);
      ADAPTER.saveRaw('customers', list);
      return rec;
    },

    // Used by the public contact form — records a new lead.
    addLead: function (data) {
      return this.upsert(Object.assign({
        source: 'website-contact',
        status: 'lead'
      }, data));
    },

    remove: function (id) {
      var list = this.all().filter(function (c) { return c.id !== id; });
      ADAPTER.saveRaw('customers', list);
    },
    // Manager soft-delete: hide the customer (recoverable) by stamping deleted_at.
    // Syncs as an UPDATE (RLS lets manager/owner set deleted_at) — the row stays in
    // the saved array so the adapter never treats it as a hard delete.
    softRemove: function (id) {
      var list = this.all(), changed = false;
      var by = authState.user ? authState.user.id : null;
      list.forEach(function (c) { if (c.id === id) { c.deletedAt = now(); c.deletedBy = by; c.updatedAt = now(); changed = true; } });
      if (changed) ADAPTER.saveRaw('customers', list);
      return changed;
    }
  };

  // ===================== INVENTORY (parts & stock) =====================
  // Shape: { id, name, sku, category, qty, lowAt, unit, cost, location,
  //          notes, supplier, reorderQty, createdAt, updatedAt }
  var Inventory = {
    all: function () { return ADAPTER.listRaw('inventory'); },

    search: function (q) {
      q = (q || '').trim().toLowerCase();
      var list = this.all();
      if (!q) return list;
      return list.filter(function (p) {
        // `fitment` = what vehicles a key/fob fits (make/model/years/FCC), so a
        // VIN search (decoded to make+model) finds the matching part.
        return ['name', 'sku', 'category', 'location', 'notes', 'fitment', 'vin']
          .some(function (f) { return (p[f] || '').toString().toLowerCase().indexOf(q) !== -1; });
      });
    },

    get: function (id) { return this.all().find(function (p) { return p.id === id; }) || null; },

    save: function (part) {
      var list = this.all();
      if (part.id) {
        var i = list.findIndex(function (p) { return p.id === part.id; });
        if (i !== -1) { list[i] = Object.assign(list[i], part, { updatedAt: now() }); ADAPTER.saveRaw('inventory', list); return list[i]; }
      }
      var rec = Object.assign({ id: uid('part'), qty: 0, lowAt: 0, createdAt: now() }, part, { updatedAt: now() });
      list.push(rec);
      ADAPTER.saveRaw('inventory', list);
      return rec;
    },

    adjustQty: function (id, delta) {
      var list = this.all();
      var p = list.find(function (x) { return x.id === id; });
      if (!p) return null;
      p.qty = Math.max(0, (parseInt(p.qty, 10) || 0) + delta);
      p.updatedAt = now();
      ADAPTER.saveRaw('inventory', list);
      return p;
    },

    remove: function (id) {
      ADAPTER.saveRaw('inventory', this.all().filter(function (p) { return p.id !== id; }));
    },

    isLow: function (p) {
      var qty = parseInt(p.qty, 10) || 0;
      var low = parseInt(p.lowAt, 10) || 0;
      return low > 0 && qty <= low;
    },
    lowCount: function () {
      var self = this;
      return this.all().filter(function (p) { return self.isLow(p); }).length;
    }
  };

  // ===================== BOOKINGS (scheduler) =====================
  // Shape (superset, back-compatible with the older scheduler records):
  //   { id, customerId, customer:{name,phone,email}, jobType, subType,
  //     serviceCategory, serviceLabel, address, parked,
  //     vehicle:{year,make,model,vin,ignition}, date, time, duration,
  //     status, notes, images:[], upsell, bookedBy, createdAt, updatedAt }
  var BOOKING_STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Rescheduled', 'Canceled'];

  // local "today" (YYYY-MM-DD), timezone-safe
  function todayLocalISO() {
    var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  var Bookings = {
    STATUSES: BOOKING_STATUSES,

    all: function () { return ADAPTER.listRaw('bookings'); },
    get: function (id) { return this.all().find(function (b) { return b.id === id; }) || null; },

    forDate: function (yyyy_mm_dd) {
      return this.all()
        .filter(function (b) { return (b.date || '') === yyyy_mm_dd; })
        .sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });
    },

    // A booking falls OFF the active scheduler ("archived") when it is marked
    // Completed or Canceled, OR when its date is in the past. Nothing is
    // deleted — archived bookings stay in storage and surface under the
    // customer's Job history.
    isArchived: function (b) {
      var s = b.status || 'Scheduled';
      if (s === 'Completed' || s === 'Canceled') return true;
      if (b.date && b.date < todayLocalISO()) return true;
      return false;
    },
    active: function () { var self = this; return this.all().filter(function (b) { return !self.isArchived(b); }); },
    archived: function () { var self = this; return this.all().filter(function (b) { return self.isArchived(b); }); },

    // Insert (no id) or update (existing id). Stamps timestamps + default status.
    save: function (b) {
      var list = this.all();
      if (b.id) {
        var i = list.findIndex(function (x) { return x.id === b.id; });
        if (i !== -1) {
          b.updatedAt = now();
          list[i] = b;
          ADAPTER.saveRaw('bookings', list);
          return b;
        }
      }
      b.id = b.id || ('bk_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6));
      if (!b.status) b.status = 'Scheduled';
      if (!b.createdAt) b.createdAt = now();
      b.updatedAt = now();
      list.push(b);
      ADAPTER.saveRaw('bookings', list);
      return b;
    },

    setStatus: function (id, status) {
      if (BOOKING_STATUSES.indexOf(status) === -1) return null;
      var list = this.all();
      var b = list.find(function (x) { return x.id === id; });
      if (!b) return null;
      b.status = status; b.updatedAt = now();
      ADAPTER.saveRaw('bookings', list);
      return b;
    },

    remove: function (id) {
      ADAPTER.saveRaw('bookings', this.all().filter(function (b) { return b.id !== id; }));
    },

    // Every booking for one customer (by id first, then phone, then name),
    // newest-first — powers the per-customer Job history.
    forCustomer: function (cust) {
      if (!cust) return [];
      var id = cust.id;
      var phone = (cust.phone || '').replace(/\D/g, '');
      var name = (cust.customer || cust.name || '').trim().toLowerCase();
      return this.all().filter(function (b) {
        if (id && b.customerId && b.customerId === id) return true;
        var bp = ((b.customer && b.customer.phone) || '').replace(/\D/g, '');
        if (phone && bp && bp === phone) return true;
        var bn = ((b.customer && b.customer.name) || '').trim().toLowerCase();
        return name && bn === name;
      }).sort(function (a, b) {
        return String((b.date || '') + (b.time || '')).localeCompare(String((a.date || '') + (a.time || '')));
      });
    }
  };

  // ===================== SERVICES (shared canonical catalog) =====================
  // ONE list used by the public contact form AND the staff scheduler so every
  // lead/booking lands in the dataset with the SAME fixed English value, no
  // matter which language the customer saw. `value` is what gets stored; `es`
  // is only what a Spanish visitor sees. `cat` is the canonical category
  // (automotive / residential / commercial / other) the scheduler auto-derives.
  var SERVICES = [
    { value: 'Car lockout',                     en: 'Car lockout',                     es: 'Auto bloqueado',                         cat: 'automotive' },
    { value: 'Car key replacement / lost key',  en: 'Car key replacement / lost key',  es: 'Reemplazo de llave / llave perdida',     cat: 'automotive' },
    { value: 'Home or business lockout',        en: 'Home or business lockout',        es: 'Casa o negocio bloqueado',               cat: 'residential' },
    { value: 'Rekey / new locks',               en: 'Rekey / new locks',               es: 'Recodificar / cerraduras nuevas',        cat: 'residential' },
    { value: 'Other (describe)',                en: 'Other (describe)',                es: 'Otro (describe)',                        cat: 'other' }
  ];
  // ===================== SERVICE CATEGORIES (the single source of truth) =====================
  // Canonical category table. Keys match setup.html's SVC_CATS2 EXACTLY. This is the
  // one place that maps the owner's Setup selections (Config.serviceCats / Config.services)
  // into the labels, scheduler job-codes, and invoice serviceType strings that every app
  // uses — so the scheduler and the invoice builder stop hardcoding their own auto/res/com
  // lists. All accessors read getConfig() synchronously (cloud-synced, localStorage
  // fallback) — no network.
  //   key            scheduler code   invoice serviceType
  //   automotive  ↔  auto         →   "Automotive"
  //   residential ↔  res          →   "Residential"
  //   commercial  ↔  com          →   "Commercial"
  //   safe        ↔  safe         →   "Safe & Vault"
  //   emergency   ↔  emergency    →   "Emergency"
  //   accesscontrol ↔ accesscontrol → "Access Control"
  //   other       ↔  other        →   "Other"
  var SERVICE_CATS = [
    { key: 'automotive',    code: 'auto',          en: 'Car / vehicle',         es: 'Carro / vehículo',   invoice: 'Automotive',     emoji: '🚗' },
    { key: 'residential',   code: 'res',           en: 'House / home',          es: 'Casa / hogar',       invoice: 'Residential',    emoji: '🏠' },
    { key: 'commercial',    code: 'com',           en: 'Business / commercial', es: 'Negocio / comercial', invoice: 'Commercial',    emoji: '🏢' },
    { key: 'safe',          code: 'safe',          en: 'Safe & vault',          es: 'Caja fuerte',        invoice: 'Safe & Vault',   emoji: '🔐' },
    { key: 'emergency',     code: 'emergency',     en: 'Emergency',             es: 'Emergencia',         invoice: 'Emergency',      emoji: '🚨' },
    { key: 'accesscontrol', code: 'accesscontrol', en: 'Access control',        es: 'Control de acceso',  invoice: 'Access Control', emoji: '🎛️' },
    { key: 'other',         code: 'other',         en: 'Something else',        es: 'Otra cosa',          invoice: 'Other',          emoji: '➕' }
  ];
  var CORE_CAT_KEYS = ['automotive', 'residential', 'commercial'];
  var _catByKey = {}, _catByCode = {};
  SERVICE_CATS.forEach(function (c) { _catByKey[c.key] = c; _catByCode[c.code] = c; });
  var ServiceCats = {
    all: function () { return SERVICE_CATS.slice(); },
    byKey: function (k) { return _catByKey[k] || null; },
    byCode: function (c) { return _catByCode[c] || null; },
    keyToCode: function (k) { var c = _catByKey[k]; return c ? c.code : k; },
    codeToKey: function (c) { var x = _catByCode[c]; return x ? x.key : c; },
    // The categories the shop OFFERS (Setup step 1), in canonical order. Falls back to
    // the 3 core categories when the shop hasn't configured any (a fresh install behaves
    // exactly like before).
    active: function () {
      var sel; try { sel = getConfig().serviceCats; } catch (e) { sel = null; }
      if (!Array.isArray(sel) || !sel.length) sel = CORE_CAT_KEYS.slice();
      var set = {}; sel.forEach(function (k) { set[k] = 1; });
      return SERVICE_CATS.filter(function (c) { return set[c.key]; });
    },
    label: function (key, lang) { var c = _catByKey[key]; return c ? (lang === 'es' ? c.es : c.en) : (key || ''); },
    invoiceLabel: function (key) { var c = _catByKey[key]; return c ? c.invoice : (key || ''); },
    // The category KEY for an invoice serviceType label ("Safe & Vault" → "safe").
    keyForInvoice: function (label) { var f = SERVICE_CATS.filter(function (c) { return c.invoice === label; })[0]; return f ? f.key : null; },
    // Option list for the invoice "What type of service?" — the offered categories'
    // invoice labels, e.g. ["Automotive","Residential","Safe & Vault"].
    invoiceActive: function () { return this.active().map(function (c) { return c.invoice; }); },
    // The owner's Setup services (with prices) filtered to one category key.
    servicesFor: function (key) {
      var svcs; try { svcs = getConfig().services; } catch (e) { svcs = []; }
      if (!Array.isArray(svcs)) return [];
      return svcs.filter(function (s) { return s && (s.cat || 'other') === key; });
    },
    // Only the 3 core categories have full step-by-step coaching/subtypes in the
    // scheduler; everything else books "not in detail" (a job type, no sub-steps).
    hasDetail: function (code) { return code === 'auto' || code === 'res' || code === 'com'; }
  };

  var Services = {
    // The owner's configured catalog (Setup → Services) when set, else the canonical default.
    list: function () { try { var s = getConfig().services; if (Array.isArray(s) && s.length) return s.slice(); } catch (e) {} return SERVICES.slice(); },
    // map the scheduler's coaching tiles (jobType auto/res/com + subType) to a
    // canonical service { value, cat } — no double entry for the trainee.
    fromJob: function (jobType, subType) {
      // core auto/res/com map as before; any other scheduler code (safe/emergency/…)
      // keeps its real category via the canonical table (not lumped into 'other').
      var cat = jobType === 'auto' ? 'automotive' : jobType === 'com' ? 'commercial' : jobType === 'res' ? 'residential'
        : (_catByCode[jobType] ? _catByCode[jobType].key : 'other');
      var value;
      if (jobType === 'auto') value = (subType === 'lost' || subType === 'spare') ? 'Car key replacement / lost key'
        : subType === 'lockout' ? 'Car lockout' : 'Car key replacement / lost key';
      else if (jobType === 'res' || jobType === 'com') value = subType === 'lockout' ? 'Home or business lockout'
        : (subType === 'rekey' || subType === 'new') ? 'Rekey / new locks' : 'Home or business lockout';
      else value = 'Other (describe)';
      return { value: value, cat: cat };
    }
  };

  // ===================== VIN DECODE (network helper) =====================
  // The ONLY networked helper in this file. Uses the free NHTSA vPIC API
  // (no key required) to turn a 17-char VIN into { year, make, model }.
  // Returns a Promise; rejects on a bad VIN or if offline (callers fall back
  // to manual entry). Note: there was no pre-existing VIN API in this repo —
  // NHTSA vPIC is the standard free decoder.
  function decodeVin(vin) {
    vin = (vin || '').trim().toUpperCase();
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      return Promise.reject(new Error('Enter a full 17-character VIN.'));
    }
    var url = 'https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/' + encodeURIComponent(vin) + '?format=json';
    return global.fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var row = (j && j.Results && j.Results[0]) || {};
      var out = { year: row.ModelYear || '', make: row.Make || '', model: row.Model || '', vin: vin };
      if (!out.make && !out.year) throw new Error("Couldn't read that VIN — enter the details manually.");
      // vPIC returns ALL-CAPS make; title-case it for display.
      if (out.make) out.make = out.make.charAt(0) + out.make.slice(1).toLowerCase();
      return out;
    });
  }

  var changeHandlers = [];
  var authState = { user: null, sb: null, staffRole: (function(){ try{ return (localStorage.getItem('tks_demo_mode')==='1' && localStorage.getItem('tks_demo_role')) || null; }catch(e){ return null; } })() };   // current signed-in user + staff role (cloud; or a seeded demo role)
  // Capability → roles allowed (mirrors the server RLS matrix). Gates destructive UI.
  var TKS_CAPS = {
    hardDelete:     ['owner'],
    softDelete:     ['owner','manager'],
    refundVoid:     ['owner','manager'],
    inventoryWrite: ['owner','manager'],
    editPricing:    ['owner','manager'],
    manageStaff:    ['owner'],
    setup:          ['owner','manager'],
    viewAudit:      ['owner','manager'],
    editReference:  ['owner','manager'],
    jobStatus:      ['owner','manager','technician'],  // change job status (front_desk cannot); own-job enforced server-side
    invMove:        ['owner','manager','technician'],  // move stock between locations (inv_move) — front_desk cannot
    invReceive:     ['owner','manager','front_desk'],  // receive new stock to shop (inv_receive) — technician cannot
    takePayment:    ['owner','manager','front_desk','technician'],  // take a payment / new charge — all staff
    keycodes:       ['owner','manager','technician'],  // dealer/OEM keycode portals — front_desk cannot
    vendorTools:    ['owner','manager']                // vendor list + NASTF tiles — manager/owner only
  };
  // Fetch + cache the signed-in user's role from the `staff` table.
  function fetchStaffRole(sb) {
    try {
      // DEMO: a seeded demo sets the role directly (cloud query would fail on the fake token).
      if (_demoOn()) { var dr = null; try { dr = localStorage.getItem('tks_demo_role'); } catch (e) {} authState.staffRole = dr || authState.staffRole; return Promise.resolve(authState.staffRole); }
      if (!sb || !authState.user) { authState.staffRole = null; return Promise.resolve(null); }
      return sb.from('staff').select('role,active').eq('user_id', authState.user.id).maybeSingle()
        .then(function (res) {
          authState.staffRole = (res && res.data && res.data.active) ? String(res.data.role) : null;
          return authState.staffRole;
        }).catch(function () { authState.staffRole = null; return null; });
    } catch (e) { authState.staffRole = null; return Promise.resolve(null); }
  }

  // ---- cloud-synced owner config (shop_config table; localStorage fallback) ----
  // The single source of truth for the Setup wizard + Settings: business identity,
  // tax, payments display, access (owner/staff/PIN/switches), vendor links, service
  // catalog, hours, receipt footer, and setup progress. Mirrored to Supabase so
  // every signed-in device shares it. Structured in GROUPS so it can later become
  // per-shop onboarding for a multi-tenant version without hardcoding.
  var CONFIG_LSKEY = 'tks_shop_config';
  var DEFAULT_VENDORS = [
    { label: 'American Key Supply', url: 'https://www.americankeysupply.com/' },
    { label: 'Key Innovations', url: 'https://keyinnovations.com/' }
  ];
  // Full default locksmith catalog (editable in Setup → Services; stored in config).
  // Folds in the canonical 5 (Car lockout / key replacement / lockout / rekey / Other).
  var DEFAULT_SERVICES = [
    { value: 'Car lockout', cat: 'automotive' },
    { value: 'Car key duplication / spare', cat: 'automotive' },
    { value: 'Car key replacement (lost all keys)', cat: 'automotive' },
    { value: 'Transponder/chip key programming', cat: 'automotive' },
    { value: 'Key fob / remote programming', cat: 'automotive' },
    { value: 'Smart / proximity key programming', cat: 'automotive' },
    { value: 'Push-to-start programming', cat: 'automotive' },
    { value: 'Ignition repair/replacement', cat: 'automotive' },
    { value: 'Broken key extraction', cat: 'automotive' },
    { value: 'ECU / immobilizer programming', cat: 'automotive' },
    { value: 'High-security / laser-cut key cutting', cat: 'automotive' },
    { value: 'Motorcycle / powersport keys', cat: 'automotive' },
    { value: 'Fleet / commercial vehicle keys', cat: 'automotive' },
    { value: 'House lockout', cat: 'residential' },
    { value: 'Rekey', cat: 'residential' },
    { value: 'Lock change / replacement', cat: 'residential' },
    { value: 'Lock repair', cat: 'residential' },
    { value: 'Deadbolt installation', cat: 'residential' },
    { value: 'Smart lock installation', cat: 'residential' },
    { value: 'Key duplication', cat: 'residential' },
    { value: 'Master key system (residential)', cat: 'residential' },
    { value: 'Mailbox lock', cat: 'residential' },
    { value: 'Commercial lockout', cat: 'commercial' },
    { value: 'Commercial rekey', cat: 'commercial' },
    { value: 'Commercial lock change / install', cat: 'commercial' },
    { value: 'Master key system (commercial)', cat: 'commercial' },
    { value: 'Access control / keypad / electronic locks', cat: 'commercial' },
    { value: 'Panic / exit device (push bar)', cat: 'commercial' },
    { value: 'Door closer install/repair', cat: 'commercial' },
    { value: 'File cabinet / desk locks', cat: 'commercial' },
    { value: 'Safe opening / lockout', cat: 'safe' },
    { value: 'Safe combination change', cat: 'safe' },
    { value: 'Safe installation / moving', cat: 'safe' },
    { value: '24/7 emergency lockout', cat: 'emergency' },
    { value: 'Roadside assistance', cat: 'emergency' },
    { value: 'Security audit / consultation', cat: 'emergency' },
    { value: 'Other (describe)', cat: 'other' }
  ];
  // Quick-link CATEGORIES for the Home screen (common locksmith bookmark groups).
  // Pre-filled where we have known links; empty categories are hidden on Home but
  // still editable in Setup. (Keycodes is a separate built-in OEM list in the app.)
  var DEFAULT_QUICKLINKS = [
    { key: 'vendors',      label: 'Vendors',              icon: '🔧', links: DEFAULT_VENDORS.slice() },
    { key: 'nastf',        label: 'NASTF / Registry',     icon: '🛡️', links: [{ label: 'NASTF SDRM', url: 'https://sdrm.nastfsecurityregistry.org/login?dotOrg=yes' }] },
    { key: 'programming',  label: 'Programming & Tools',  icon: '🧰', links: [] },
    { key: 'reference',    label: 'Reference & Lookups',  icon: '🔎', links: [] },
    { key: 'associations', label: 'Associations',         icon: '🤝', links: [] },
    { key: 'other',        label: 'Other',                icon: '🔗', links: [] }
  ];
  var CONFIG_DEFAULTS = {
    // tax (kept at top level for back-compat with existing tax wiring)
    taxRate: 0,
    taxableByCategory: { Labor: false, Materials: true, Travel: false, Programming: false, AfterHours: false },
    // groups
    identity: { name: '', address: '', phone: '', email: '', license: '', logo: '', logoCustom: false, footer: '', termsUrl: '' },
    payments: { surchargePct: 2, drawerFloatCents: 12000 },     // surcharge DISPLAY ONLY (server enforces 2% credit-only); drawerFloatCents = standard cash-drawer float (default $120)
    // standard labor/parts warranty offered on receipts & invoices (not estimates).
    // months=0 disables; defaultOn pre-checks the warranty box on new documents.
    warranty: { months: 6, defaultOn: true },
    // where the shop operates: mobile (van) and/or a physical storefront. Drives whether
    // inventory splits into van vs shop + shows "move" buttons. Mobile-first default.
    locations: { van: true, shop: false },
    // NASTF D1 filing window (days) — manager-set in Setup; drives the D1 countdown badge.
    nastf: { d1Days: 5 },
    // Shift/time-clock + screen-lock (phase 7). OFF by default — the owner turns
    // it on in Settings → Time clock when ready to test. idleMin = minutes before
    // the workstation locks. (Per-device "this is a workstation" flag is a local
    // setting, not shop config — see app/timeclock.js.)
    timeclock: { enabled: false, idleMin: 5 },
    // misc UI preferences (e.g. suppress the "save this Other service?" offer). Shop-wide, cloud-synced.
    prefs: { offerSaveOtherService: true },
    // employees: [{name,email,owner}]; ownerEmails is derived from owner=true rows.
    access: { employees: [], ownerEmails: [], staffEmails: [], quickFormPin: '', quickInvoiceEnabled: true, quickInvoiceDefault: true },
    quickLinks: DEFAULT_QUICKLINKS.map(function (c) { return { key: c.key, label: c.label, icon: c.icon, links: c.links.slice() }; }),
    serviceCats: [],                    // categories the shop offers (Setup step 1)
    services: [],                       // the offered services [{value,cat,price,en,es}] (Setup step 2)
    // hours: STOREFRONT/walk-in hours. per-day { mode:'open'|'closed'|'24', open:'HH:MM', close:'HH:MM' }
    hours: { mon:{mode:'open',open:'08:00',close:'17:00'}, tue:{mode:'open',open:'08:00',close:'17:00'},
             wed:{mode:'open',open:'08:00',close:'17:00'}, thu:{mode:'open',open:'08:00',close:'17:00'},
             fri:{mode:'open',open:'08:00',close:'17:00'}, sat:{mode:'open',open:'08:00',close:'17:00'},
             sun:{mode:'closed',open:'08:00',close:'17:00'} },
    // serviceHours: MOBILE/field service hours (when you take jobs) — separate from the
    // storefront. Same per-day shape; an overnight window is open<close. Default matches
    // the public site: Mon–Sat 24h, Sun open 00:00–05:00 (Saturday-night/club crowd).
    serviceHours: { mon:{mode:'24',open:'00:00',close:'23:30'}, tue:{mode:'24',open:'00:00',close:'23:30'},
             wed:{mode:'24',open:'00:00',close:'23:30'}, thu:{mode:'24',open:'00:00',close:'23:30'},
             fri:{mode:'24',open:'00:00',close:'23:30'}, sat:{mode:'24',open:'00:00',close:'23:30'},
             sun:{mode:'open',open:'00:00',close:'05:00'} },
    setup: { completed: false, done: {}, skipped: {} }   // per-step progress
  };
  // Coerce hours to the structured per-day object (migrates the old free-text string).
  function normalizeHours(h, def) {
    var days = ['mon','tue','wed','thu','fri','sat','sun'], out = {};
    def = def || CONFIG_DEFAULTS.hours;
    var src = (h && typeof h === 'object' && !Array.isArray(h)) ? h : {};
    days.forEach(function (d) {
      var dd = src[d] || {};
      out[d] = {
        mode: (dd.mode === 'open' || dd.mode === 'closed' || dd.mode === '24') ? dd.mode : def[d].mode,
        open: dd.open || def[d].open,
        close: dd.close || def[d].close
      };
    });
    return out;
  }
  // Quick-link categories: keep the predefined category skeleton, fill each with the
  // owner's saved links (empty stays empty); migrate a legacy flat `vendors` list once.
  function normalizeQuickLinks(saved, legacyVendors) {
    var bykey = {};
    if (Array.isArray(saved)) saved.forEach(function (c) { if (c && c.key) bykey[c.key] = c; });
    var hasSaved = Array.isArray(saved) && saved.length;
    return DEFAULT_QUICKLINKS.map(function (d) {
      var s = bykey[d.key], links;
      if (s && Array.isArray(s.links)) links = s.links;
      else if (!hasSaved && d.key === 'vendors' && Array.isArray(legacyVendors) && legacyVendors.length) links = legacyVendors;
      else links = d.links;
      return { key: d.key, label: d.label, icon: d.icon, links: links.map(function (l) { return { label: (l && l.label) || '', url: (l && l.url) || '' }; }) };
    });
  }
  var configCache = null;
  function mergeConfig(c) {
    c = c || {};
    var d = CONFIG_DEFAULTS;
    return {
      taxRate: (c.taxRate != null && c.taxRate !== '') ? Number(c.taxRate) : d.taxRate,
      taxableByCategory: Object.assign({}, d.taxableByCategory, c.taxableByCategory || {}),
      identity: Object.assign({}, d.identity, c.identity || {}),
      payments: Object.assign({}, d.payments, c.payments || {}),
      locations: Object.assign({}, d.locations, c.locations || {}),
      nastf: Object.assign({}, d.nastf, c.nastf || {}),
      timeclock: Object.assign({}, d.timeclock, c.timeclock || {}),
      prefs: Object.assign({}, d.prefs, c.prefs || {}),
      access: Object.assign({}, d.access, c.access || {}),
      quickLinks: normalizeQuickLinks(c.quickLinks, c.vendors),
      services: Array.isArray(c.services) ? c.services : [],
      // categories offered: explicit list, else derived from the saved services' cats
      serviceCats: (Array.isArray(c.serviceCats) && c.serviceCats.length) ? c.serviceCats
        : (Array.isArray(c.services) ? Object.keys(c.services.reduce(function (a, s) { if (s && s.cat) a[s.cat] = 1; return a; }, {})) : []),
      hours: normalizeHours(c.hours, d.hours),
      serviceHours: normalizeHours(c.serviceHours, d.serviceHours),
      setup: Object.assign({ completed: false, done: {}, skipped: {} }, c.setup || {})
    };
  }
  function getConfig() { if (!configCache) configCache = mergeConfig(read(CONFIG_LSKEY, null)); return configCache; }

  global.TKS = {
    KEYS: KEYS, uid: uid, read: read, write: write,
    adapter: function () { return ADAPTER.name; },
    Customers: Customers, Inventory: Inventory, Bookings: Bookings,
    Services: Services, ServiceCats: ServiceCats, decodeVin: decodeVin,

    /* ---------------------------------------------------------------- *
     *  auth — who is signed in, and are they the owner?                 *
     *  Owner is decided by email allowlist in window.TKS_OWNER.         *
     *  OWNER_EMAILS (app/cloud-config.js). role() is 'guest' (nobody    *
     *  signed in), 'staff' (signed in, not owner), or 'owner'.          *
     *  This is the single place the app asks "who's signed in" — later  *
     *  it can be backed by Supabase roles without changing callers.     *
     * ---------------------------------------------------------------- */
    auth: {
      user: function () { return authState.user; },
      // The signed-in email FROM THE LIVE SESSION (populated by connectCloud).
      liveEmail: function () { return authState.user ? authState.user.email : null; },
      // The email from a REMEMBERED session token in localStorage — read WITHOUT
      // network, so an owner stays recognized as owner when the internet drops.
      // (supabase-js v2 stores the session JSON under sb-<ref>-auth-token.)
      rememberedEmail: function () {
        try {
          var ls = global.localStorage;
          for (var i = 0; i < ls.length; i++) {
            var k = ls.key(i);
            if (k && k.indexOf('sb-') === 0 && k.indexOf('-auth-token') !== -1) {
              var v = ls.getItem(k); if (!v) continue;
              var o = JSON.parse(v);
              var u = (o && (o.user || (o.currentSession && o.currentSession.user))) || null;
              if (u && u.email) return String(u.email);
            }
          }
        } catch (e) {}
        return null;
      },
      // Effective identity = live session if present, else the remembered token.
      // This is what gates owner UI, so offline ≠ "not owner".
      email: function () { return this.liveEmail() || this.rememberedEmail(); },
      isSignedIn: function () { return !!this.email(); },
      // Owner allowlist = the cloud-config.js bootstrap owners (always owner — can't
      // lock yourself out) UNION any owners added in the Setup wizard (cloud config).
      ownerEmails: function () {
        var list = [];
        var o = global.TKS_OWNER && global.TKS_OWNER.OWNER_EMAILS;
        if (Array.isArray(o)) list = list.concat(o);
        try {
          var ac = getConfig().access || {};
          if (Array.isArray(ac.ownerEmails)) list = list.concat(ac.ownerEmails);             // legacy/explicit
          if (Array.isArray(ac.employees)) list = list.concat(ac.employees.filter(function (e) { return e && e.owner; }).map(function (e) { return e.email; }));
        } catch (e) {}
        return list.map(function (e) { return String(e || '').trim().toLowerCase(); }).filter(Boolean);
      },
      isOwner: function () {
        var e = this.email(); if (!e) return false;
        return this.ownerEmails().indexOf(e.toLowerCase()) !== -1;
      },
      role: function () { var e = this.email(); return !e ? 'guest' : (this.isOwner() ? 'owner' : 'staff'); },
      // --- Per-manager PINs (no-login fallback) -------------------------------
      // Each manager (an employee row marked as a manager) can have their OWN PIN.
      // managerByPin(entered) returns the matching manager {name,email} if the
      // entered digits equal ANY manager's personal PIN, OR a generic {name:'Manager'}
      // if they equal the shared fallback PIN (Setup quickFormPin / cloud-config
      // default). Returns null on no match. This lets several managers each have a
      // distinct PIN while keeping the old single-PIN fallback working.
      managerByPin: function (entered) {
        entered = String(entered == null ? '' : entered).trim();
        if (!entered) return null;
        try {
          var emps = getConfig().access.employees || [];
          for (var i = 0; i < emps.length; i++) {
            var e = emps[i];
            if (e && e.owner && e.pin && String(e.pin).trim() === entered)
              return { name: (e.name || e.email || 'Manager'), email: (e.email || '') };
          }
        } catch (e) {}
        var shared = '';
        try { shared = getConfig().access.quickFormPin || ''; } catch (e) {}
        if (!shared && global.TKS_OWNER && global.TKS_OWNER.QUICK_FORM_PIN) shared = String(global.TKS_OWNER.QUICK_FORM_PIN);
        if (shared && String(shared).trim() === entered) return { name: 'Manager', email: '' };
        return null;
      },
      // True if ANY PIN gate exists (a manager has a personal PIN, or a shared
      // fallback PIN is configured). Used to decide whether to offer a PIN prompt.
      hasManagerPin: function () {
        try {
          var emps = getConfig().access.employees || [];
          for (var i = 0; i < emps.length; i++) { if (emps[i] && emps[i].owner && String(emps[i].pin || '').trim()) return true; }
        } catch (e) {}
        var shared = '';
        try { shared = getConfig().access.quickFormPin || ''; } catch (e) {}
        if (!shared && global.TKS_OWNER && global.TKS_OWNER.QUICK_FORM_PIN) shared = String(global.TKS_OWNER.QUICK_FORM_PIN);
        return !!String(shared).trim();
      },
      // --- Real role from the `staff` table (Phase 1). null = not an active staff
      //     member, or not loaded yet. ---
      staffRole: function () { return authState.staffRole; },
      // Capability gate for destructive/privileged UI. Local/offline single-operator
      // = full. Signed in with a known role = gated by the matrix. While the role is
      // still loading (or offline), fall back to the email-owner check so the owner
      // is never locked out of their own screen.
      can: function (cap) {
        if (!this.isSignedIn()) return true;
        var r = authState.staffRole;
        if (r) return (TKS_CAPS[cap] || []).indexOf(r) !== -1;
        return this.isOwner();
      },
      // Human-readable role label for the UI badge — the REAL staff-table role.
      roleLabel: function () {
        var map = { owner:'Owner', manager:'Manager', front_desk:'Front Desk', technician:'Technician' };
        var r = authState.staffRole;
        if (r && map[r]) return map[r];
        if (this.isOwner()) return 'Owner';            // email-owner fallback while the role loads / offline
        return this.isSignedIn() ? 'Staff' : '';
      },
      signOut: function () { return (authState.sb && authState.sb.auth) ? authState.sb.auth.signOut() : Promise.resolve(); }
    },

    /* ---------------------------------------------------------------- *
     *  Config — cloud-synced owner config (sales tax today).            *
     *  get() returns { taxRate, taxableByCategory }. taxableDefault(cat) *
     *  is the per-category default for a new line. save() writes local  *
     *  + upserts shop_config (one row PER SHOP, keyed by shop_id — 5g).  *
     * ---------------------------------------------------------------- */
    Config: {
      get: function () { return getConfig(); },
      taxableDefault: function (category) { return !!getConfig().taxableByCategory[category]; },
      // group accessors (used by the Setup wizard + consumers)
      identity: function () { return getConfig().identity; },
      access: function () { return getConfig().access; },
      payments: function () { return getConfig().payments; },
      warranty: function () { return getConfig().warranty || { months: 0, defaultOn: false }; },
      locations: function () { return getConfig().locations; },
      nastf: function () { return getConfig().nastf || { d1Days: 5 }; },
      d1Days: function () { var n = getConfig().nastf || {}; var d = parseInt(n.d1Days, 10); return (d >= 1) ? d : 5; },
      prefs: function () { return getConfig().prefs || {}; },
      quickLinks: function () { return getConfig().quickLinks; },
      // back-compat: the links in the "vendors" category
      vendors: function () { var q = getConfig().quickLinks.filter(function (c) { return c.key === 'vendors'; })[0]; return q ? q.links : []; },
      services: function () { return getConfig().services; },
      serviceCats: function () { return getConfig().serviceCats; },
      hours: function () { return getConfig().hours; },
      serviceHours: function () { return getConfig().serviceHours; },
      setupState: function () { return getConfig().setup; },
      isSetupComplete: function () { return !!getConfig().setup.completed; },
      // Owner PIN: wizard value wins, else the cloud-config.js bootstrap default.
      ownerPin: function () {
        var p = getConfig().access.quickFormPin;
        if (p) return String(p);
        return (global.TKS_OWNER && global.TKS_OWNER.QUICK_FORM_PIN) ? String(global.TKS_OWNER.QUICK_FORM_PIN) : '';
      },
      // save(partial): deep-merge the partial onto the current config (so a single
      // group/step doesn't clobber the others), persist locally + to shop_config.data.
      save: function (partial) {
        partial = partial || {};
        var cur = getConfig();
        var merged = Object.assign({}, cur);
        ['identity', 'payments', 'access', 'setup', 'locations', 'warranty', 'nastf', 'prefs'].forEach(function (g) {
          if (partial[g]) merged[g] = Object.assign({}, cur[g], partial[g]);
        });
        if (partial.taxableByCategory) merged.taxableByCategory = Object.assign({}, cur.taxableByCategory, partial.taxableByCategory);
        ['taxRate', 'quickLinks', 'services', 'serviceCats', 'hours', 'serviceHours'].forEach(function (k) { if (partial[k] !== undefined) merged[k] = partial[k]; });
        configCache = mergeConfig(merged);
        write(CONFIG_LSKEY, configCache);
        if (authState.sb) {
          try {
            // Per-shop config (5g): one row per shop, keyed by shop_id (the DB
            // defaults shop_id to current_shop(), so we never send it).
            authState.sb.from('shop_config').upsert({
              data: configCache,
              tax_rate: configCache.taxRate, taxable_categories: configCache.taxableByCategory,
              updated_by: (authState.user ? authState.user.id : null), updated_at: new Date().toISOString()
            }, { onConflict: 'shop_id' }).then(function () {}, function () {});
          } catch (e) {}
        }
        changeHandlers.forEach(function (fn) { try { fn(); } catch (e) {} });
        return configCache;
      },
      load: function () {
        if (!authState.sb) return Promise.resolve(getConfig());
        try {
          // Per-shop config (5g): the RLS tenant fence returns only OUR shop's row.
          return authState.sb.from('shop_config').select('*').limit(1).then(function (res) {
            var row = res && res.data && res.data[0];
            if (row) {
              var src = (row.data && Object.keys(row.data).length) ? row.data
                : { taxRate: row.tax_rate, taxableByCategory: row.taxable_categories };
              configCache = mergeConfig(src); write(CONFIG_LSKEY, configCache);
            }
            return configCache;
          }, function () { return getConfig(); });
        } catch (e) { return Promise.resolve(getConfig()); }
      }
    },

    // Generic passthroughs so pages that keep their own array logic
    // (e.g. the Customers/Shops tile) still flow through the active adapter.
    list: function (key) { return ADAPTER.listRaw(key); },
    saveList: function (key, arr) { return ADAPTER.saveRaw(key, arr); },

    // Is a given logical key actually backed by the cloud right now?
    isCloud: function (key) {
      return ADAPTER.name === 'cloud' && !(ADAPTER.isLocal && ADAPTER.isLocal(key));
    },

    // Register a callback to re-render after the cloud finishes hydrating.
    onChange: function (fn) { if (typeof fn === 'function') changeHandlers.push(fn); },

    /* -------------------------------------------------------------------- *
     *  connectCloud — call this ONCE, with your Supabase project URL +      *
     *  anon (publishable) key, to switch the whole app from localStorage    *
     *  to the cloud. Until you call it, everything stays local.             *
     *                                                                       *
     *  Requirements before this works (NOT wired yet, on purpose):          *
     *   1) Add the Supabase JS library to the page:                         *
     *      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     *   2) Run the SQL in supabase/customers_setup.sql + supabase/app_tables_setup.sql
     *   3) Have employees signed in (Supabase Auth) — RLS only allows        *
     *      authenticated users.                                             *
     *      TKS.connectCloud({ url: '...', anonKey: '...' }).then(render)     *
     * -------------------------------------------------------------------- */
    connectCloud: function (opts) {
      opts = opts || {};
      if (!opts.url || !opts.anonKey) return Promise.reject(new Error('connectCloud needs { url, anonKey }'));
      if (!global.supabase || !global.supabase.createClient) {
        return Promise.reject(new Error('Supabase JS not loaded — add the supabase-js <script> first.'));
      }
      var sb = global.supabase.createClient(opts.url, opts.anonKey);
      var cloud = makeCloudAdapter(sb);
      return cloud.hydrate().then(function () {
        ADAPTER = cloud;                       // <<< the actual switch
        authState.sb = sb;
        // capture the signed-in user and keep it fresh on sign-in/out
        try {
          sb.auth.onAuthStateChange(function (_evt, session) {
            authState.user = (session && session.user) ? { id: session.user.id, email: session.user.email } : null;
            authState.staffRole = null;
            fetchStaffRole(sb).then(function () { changeHandlers.forEach(function (fn) { try { fn(); } catch (e) {} }); });
            changeHandlers.forEach(function (fn) { try { fn(); } catch (e) {} });
          });
        } catch (e) {}
        return sb.auth.getUser().then(function (res) {
          var u = res && res.data && res.data.user;
          authState.user = u ? { id: u.id, email: u.email } : null;
        }).catch(function () {}).then(function () { return fetchStaffRole(sb); }).then(function () {
          // pull the cloud-synced owner config (tax settings), then notify the UI
          var done = function () { changeHandlers.forEach(function (fn) { try { fn(); } catch (e) {} }); return true; };
          try { return global.TKS.Config.load().then(done, done); } catch (e) { return done(); }
        });
      });
    }
  };

  /* ===================================================================
     Phase 1b / 1c cloud operations — thin wrappers over the server-side
     RPCs/tables that already enforce the role matrix (RLS + SECURITY
     DEFINER functions). Every call returns the supabase-js promise, so a
     denied action surfaces as { error } and the UI shows the real reason.
     These need a live cloud session (authState.sb); offline they throw.
     =================================================================== */
  function _sb(){ if(!authState.sb) throw new Error('Connect to the cloud (sign in) to use this.'); return authState.sb; }
  // Expose the live Supabase client accessor. Several signed-in-only feature
  // modules (inventory-traceability, tier.js, timeclock/timesheets) fetch the
  // client via TKS._sb() — without this it was undefined, so those cloud
  // screens silently fell back to "sign in first" even when signed in.
  global.TKS._sb = _sb;

  /* ===================================================================
     DEMO MODE (offline pitch). START-DEMO.html seeds localStorage and sets
     tks_demo_mode='1'. The cloud-only sections below (Fleet, Commission,
     NASTF, per-location stock) have no local adapter, so they short-circuit
     to seeded local data when the flag is on. Production never sets the flag,
     so every branch here is inert outside the demo.
     =================================================================== */
  function _demoOn(){ try{ return localStorage.getItem('tks_demo_mode')==='1'; }catch(e){ return false; } }
  function _demoGet(k,d){ try{ var v=JSON.parse(localStorage.getItem(k)); return (v==null)?d:v; }catch(e){ return d; } }
  function _demoSet(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function _demoOk(data){ return Promise.resolve({ data:data, error:null }); }
  // Commission day-rows synthesized from the seeded transactions: 8% of the
  // commissionable base (sales ex-tax), with a $150/day minimum, by tech & day.
  function _demoCommissionRows(from, to, tech){
    var txns=_demoGet('tks_demo_txns',[]), staff=_demoGet('tks_demo_staff',[]);
    var nameById={}; staff.forEach(function(s){ nameById[s.user_id]=s.name; });
    var byKey={};
    txns.forEach(function(t){
      if(t.status!=='completed') return;
      var day=(t.created_at||'').slice(0,10);
      if(from && day<from) return; if(to && day>to) return;
      var tid=t.tech_id||t.technician||'tech';
      if(tech && tid!==tech) return;
      var base=Math.max(0,(t.base_cents||0)-(t.tax_cents||0));
      var k=tid+'|'+day, g=byKey[k]||(byKey[k]={tech_id:tid, tech_name:t.technician||nameById[tid]||'Tech', day:day, base:0});
      g.base+=base;
    });
    var DAILY_MIN=15000, PCT=0.08;
    return Object.keys(byKey).map(function(k){ var g=byKey[k];
      var raw=Math.round(g.base*PCT), met=raw>=DAILY_MIN;
      return { tech_id:g.tech_id, tech_name:g.tech_name, day:g.day, base_cents:g.base,
               commission_cents:Math.max(raw,DAILY_MIN), held_cents:0, met_min:met };
    });
  }
  function _demoNastfWorklist(includeFiled){
    var recs=_demoGet('tks_receipts',[]);
    return recs.filter(function(r){ return r.nastf && r.nastf.type && (includeFiled || !r.nastf.d1Filed); })
      .map(function(r){ return { id:r.id, number:r.number, customer:r.customer, doc_date:r.date,
        nastf_type:r.nastf.type, d1_days:r.nastf.d1Days, d1_due:r.nastf.d1DueDate,
        d1_filed:!!r.nastf.d1Filed, d1_filed_by_name:r.nastf.d1FiledByName||'', can_file:true }; })
      .sort(function(a,b){ return String(a.d1_due||'').localeCompare(String(b.d1_due||'')); });
  }

  // Fleet / vans (manage = manager+, read = any staff; enforced by RLS).
  global.TKS.Fleet = {
    list:    function(){ if(_demoOn()) return _demoOk(_demoGet('tks_demo_vans',[])); return _sb().from('vans').select('*').order('fleet_no', { ascending: true }); },
    save:    function(v){
      var row = { fleet_no: v.fleet_no || null, vin: (v.vin||'').toUpperCase() || null,
                  nickname: v.nickname || null, plate: v.plate || null, status: v.status || 'active' };
      if(_demoOn()){ var vs=_demoGet('tks_demo_vans',[]);
        if(v.id){ var i=vs.findIndex(function(x){return x.id===v.id;}); if(i>=0) vs[i]=Object.assign(vs[i],row); }
        else { row.id='van_'+Date.now().toString(36); vs.push(row); }
        _demoSet('tks_demo_vans',vs); return _demoOk([row]); }
      return v.id ? _sb().from('vans').update(row).eq('id', v.id).select()
                  : _sb().from('vans').insert(row).select();
    },
    setStatus: function(id, status){ if(_demoOn()){ var vs=_demoGet('tks_demo_vans',[]); var x=vs.find(function(v){return v.id===id;}); if(x)x.status=status; _demoSet('tks_demo_vans',vs); return _demoOk(null); } return _sb().from('vans').update({ status: status }).eq('id', id); },
    remove:  function(id){ if(_demoOn()){ _demoSet('tks_demo_vans', _demoGet('tks_demo_vans',[]).filter(function(v){return v.id!==id;})); return _demoOk(null); } return _sb().from('vans').delete().eq('id', id); },
    staff:   function(){ if(_demoOn()) return _demoOk(_demoGet('tks_demo_staff',[])); return _sb().from('staff').select('user_id,name,role,active,home_van_id').order('role'); },
    assignHomeVan: function(userId, vanId){ if(_demoOn()) return _demoOk(null); return _sb().from('staff').update({ home_van_id: vanId || null }).eq('user_id', userId); }
  };

  // Multi-tenant (phase5): each business = a shop. Onboarding calls ensure() so a
  // brand-new pilot owner gets their OWN isolated shop; current() = the caller's
  // shop. All data is fenced to current_shop() by RLS (see 5a_multitenant.sql).
  global.TKS.Shop = {
    create:  function(name){ if(_demoOn()) return _demoOk('demo-shop'); return _sb().rpc('create_shop', { p_name: name || '' }); },
    current: function(){ if(_demoOn()) return _demoOk('demo-shop'); return _sb().rpc('current_shop'); },
    rename:  function(name){ if(_demoOn()) return _demoOk(null);
      return _sb().rpc('current_shop').then(function(r){ var id=r&&r.data; if(!id) return { data:null }; return _sb().from('shops').update({ name: name||'' }).eq('id', id); }); },
    // create the shop only if the signed-in user doesn't have one yet (idempotent)
    ensure:  function(name){ var self=this; if(_demoOn()) return _demoOk('demo-shop');
      return self.current().then(function(r){ return (r && r.data) ? r : self.create(name); }).catch(function(){ return self.create(name); }); }
  };

  // Inventory location ops — all role-checked server-side.
  // location strings: 'shop' or 'van:<vanId>'.
  global.TKS.InvOps = {
    locations: function(itemId){
      if(_demoOn()){ var it=(_demoGet('tks_inventory',[])||[]).find(function(p){return p.id===itemId;});
        if(!it) return _demoOk([]);
        if(Array.isArray(it.locs) && it.locs.length) return _demoOk(it.locs.map(function(l){ return { item_id:itemId, location:l.location, qty:l.qty }; }));
        return _demoOk([{ item_id:itemId, location:it.location||'shop', qty:it.qty||0 }]); }
      return _sb().from('inventory_locations').select('*').eq('item_id', itemId).order('location'); },
    move:    function(item, from, to, qty){ if(_demoOn()) return _demoOk(null); return _sb().rpc('inv_move',    { p_item: item, p_from: from, p_to: to, p_qty: qty }); },   // tech+
    receive: function(item, qty){           if(_demoOn()) return _demoOk(null); return _sb().rpc('inv_receive', { p_item: item, p_qty: qty }); },                            // front_desk+
    adjust:  function(item, loc, newQty, reason){ if(_demoOn()) return _demoOk(null); return _sb().rpc('inv_adjust', { p_item: item, p_loc: loc, p_new_qty: newQty, p_reason: reason || '' }); } // manager+
  };

  // Stock-move requests (tech → manager approval) — Phase 3a. Synced cross-device via the
  // move_requests table; the approve action still calls InvOps.move (inv_move). Cloud-only;
  // the UI falls back to a local queue when offline.
  global.TKS.MoveReq = {
    create:  function(r){ if(_demoOn()) return _demoOk(null); return _sb().from('move_requests').insert({ item_id:r.itemId, item_name:r.itemName||null, from_loc:r.from, to_loc:r.to, qty:r.qty||1, job_id:r.jobId||null, note:r.note||null, requested_by_name:r.byName||null }).select(); },
    pending: function(){ if(_demoOn()) return _demoOk([]); return _sb().from('move_requests').select('*').eq('status','pending').order('created_at',{ascending:true}); },
    decide:  function(id, approve){ if(_demoOn()) return _demoOk(null); return _sb().from('move_requests').update({ status: approve?'approved':'denied', decided_at: new Date().toISOString() }).eq('id', id).select(); }, // manager (RLS)
    remove:  function(id){ if(_demoOn()) return _demoOk(null); return _sb().from('move_requests').delete().eq('id', id); }
  };

  // Job status + accountability — guarded RPCs (front_desk can't set status;
  // a tech only on own jobs; completion/cancel gated on parts reconciliation).
  global.TKS.Jobs = {
    setStatus: function(job, status){ return _sb().rpc('job_set_status', { p_job: job, p_status: status }); },
    cancel:    function(job, reason, detail){ return _sb().rpc('job_cancel', { p_job: job, p_reason: reason, p_detail: detail || '' }); },
    // authoritative top-level job fields (the RPC-only status + accountability flags)
    meta:      function(job){ return _sb().from('bookings').select('status,reconciliation_pending,responsible_tech,cancel_reason,cancel_detail,completed_at').eq('id', job).maybeSingle(); },
    parts:     function(job){ return _sb().from('job_parts').select('*').eq('job_id', job).order('created_at'); },
    addPart:   function(job, desc, isCut){ return _sb().from('job_parts').insert({ job_id: job, description: desc || '', is_cut_key: !!isCut }).select(); },
    reconcilePart: function(part, state, proof){ return _sb().rpc('job_reconcile_part', { p_part: part, p_state: state, p_proof: proof || '' }); },
    assign:    function(job, userId, role){ return _sb().from('job_staff').upsert({ job_id: job, user_id: userId, job_role: role || 'lead' }); },
    unassignRole: function(job, role){ return _sb().from('job_staff').delete().eq('job_id', job).eq('job_role', role || 'lead'); },
    staffOnJob: function(job){ return _sb().from('job_staff').select('user_id,job_role').eq('job_id', job); },
    // Upload a reconciliation proof photo to the private 'job-proof' bucket; returns the stored path.
    uploadProof: function(job, file){
      var sb = _sb(); var path = job + '/' + (file && file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g,'_') : 'proof.jpg');
      return sb.storage.from('job-proof').upload(path, file, { upsert: true }).then(function(res){
        if(res && res.error) throw res.error; return path;
      });
    }
  };

  // ---- Phase 2: POS / register (services price list + server-priced checkout) ----
  global.TKS.POS = {
    // services price list (read = any staff; write = manager+, enforced by RLS)
    services:    function(activeOnly){ var q=_sb().from('services').select('*').order('category').order('name'); return (activeOnly!==false)? q.eq('active',true) : q; },
    saveService: function(s){ var row={ name:(s.name||'').trim(), category:s.category||'service', price_cents:parseInt(s.price_cents,10)||0, active:s.active!==false, updated_at:new Date().toISOString() };
                              return s.id ? _sb().from('services').update(row).eq('id',s.id).select() : _sb().from('services').insert(row).select(); },
    removeService: function(id){ return _sb().from('services').delete().eq('id',id); },
    // checkout: server re-prices catalog lines, gates discount/override to manager+,
    // builds a receipts row, returns its id (then charge it via the existing pay flow).
    checkout:    function(payload){ return _sb().rpc('pos_checkout', { p_payload: payload }); },
    // decrement sold parts from the ticket's location (call after the charge succeeds).
    decrementStock: function(receiptId){ return _sb().rpc('pos_decrement_stock', { p_receipt: receiptId }); }
  };

  // ---- Phase 2b: configurable commission engine ----
  global.TKS.Commission = {
    config:     function(){ if(_demoOn()) return Promise.resolve({ data:_demoGet('tks_demo_comm_config', { id:1, pay_on:'whole_job', structure:'daily_min_pct', pct:8, daily_min_cents:15000, exclude_parts:true, earned_when:'paid', hold_unreconciled:true }), error:null }); return _sb().from('commission_config').select('*').limit(1).maybeSingle(); },     // read = any staff; RLS fence returns OUR shop's row (5j: per-shop)
    saveConfig: function(c){ if(_demoOn()){ _demoSet('tks_demo_comm_config', c); return _demoOk(null); } return _sb().from('commission_config').upsert(Object.assign({ updated_at:new Date().toISOString() }, c), { onConflict:'shop_id' }); },  // write = manager+ (RLS); one row per shop, shop_id defaults to current_shop() (5j)
    dayRows:    function(from,to,tech){
      if(_demoOn()){
        // Mirror the server rules locally (B-#1): front_desk sees nothing;
        // a technician sees ONLY their own rows (matched by email; no match = none).
        var role=null; try{ role=localStorage.getItem('tks_demo_role'); }catch(_){ }
        if(role==='front_desk') return _demoOk([]);
        if(role==='technician'){
          var me=null;
          try{ var em=(global.TKS.auth.email()||'').toLowerCase();
               var hit=_demoGet('tks_demo_staff',[]).find(function(s){ return (s.email||'').toLowerCase()===em; });
               me=hit&&hit.user_id; }catch(_){ }
          tech = me || '__self__';
        }
        return _demoOk(_demoCommissionRows(from,to,tech));
      }
      return _sb().rpc('commission_day_rows', { p_from:from, p_to:to, p_tech:tech||null }); },  // tech = own only (server-forced); front_desk = empty (server-forced, 5k)
    // 2d — manager sign-off / reconciliation approval (releasing a hold releases the commission hold)
    awaitingSignoff: function(){ if(_demoOn()) return _demoOk([]); return _sb().rpc('jobs_awaiting_signoff'); },                                   // manager+ only
    releaseHold:     function(job, action, note){ if(_demoOn()) return _demoOk(null); return _sb().rpc('job_release_hold', { p_job:job, p_action:action, p_note:note||'' }); }
  };

  // ---- NASTF D1 filing tracking (shared worklist + job-scoped filing) ----
  global.TKS.NASTF = {
    // the shared outstanding-D1 worklist (urgency-sorted; each row carries can_file).
    worklist:  function(includeFiled){ if(_demoOn()) return _demoOk(_demoNastfWorklist(includeFiled)); return _sb().rpc('nastf_worklist', { p_include_filed: includeFiled !== false }); },
    // file / un-file a D1 — server enforces job-scope (manager OR the staff who did the job).
    setFiled:  function(receiptId, filed){ if(_demoOn()){ var recs=_demoGet('tks_receipts',[]); var r=recs.find(function(x){return x.id===receiptId;}); if(r&&r.nastf){ r.nastf.d1Filed=(filed!==false); r.nastf.d1FiledByName=r.nastf.d1FiledByName||'Samer Haddad'; _demoSet('tks_receipts',recs); } return _demoOk(null); } return _sb().rpc('set_d1_filed', { p_receipt: receiptId, p_filed: filed !== false }); },
    // UI mirror: may this user file D1 on this receipt?
    canFile:   function(receiptId){ if(_demoOn()) return _demoOk(true); return _sb().rpc('can_file_d1', { p_receipt: receiptId }); }
  };
})(window);

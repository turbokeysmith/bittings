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
        lastUsed: ts(r.last_used), createdAt: ts(r.created_at), updatedAt: ts(r.updated_at) }; },
      toRow: function (o) { return {
        name: o.customer || '', contact: o.contact || '', phone: o.phone || '', email: o.email || '',
        address: o.address || '', customer_type: o.customerType || 'individual', is_contracting: false,
        service_needed: o.serviceNeeded || '', notes: o.notes || '', lang: o.lang || '', source: o.source || '' }; }
    },
    shops: {
      table: 'customers', idStrategy: 'uuid', filter: { is_contracting: true },
      fromRow: function (r) { return {
        id: r.id, customer: r.name, contact: r.contact, phone: r.phone, email: r.email,
        address: r.address, customerType: r.customer_type, status: 'contracting',
        serviceNeeded: r.service_needed, notes: r.notes, lang: r.lang, source: r.source,
        lastUsed: ts(r.last_used), createdAt: ts(r.created_at), updatedAt: ts(r.updated_at) }; },
      toRow: function (o) { return {
        name: o.customer || '', contact: o.contact || '', phone: o.phone || '', email: o.email || '',
        address: o.address || '', customer_type: o.customerType || 'business', is_contracting: true,
        service_needed: o.serviceNeeded || '', notes: o.notes || '', lang: o.lang || '', source: o.source || '' }; }
    },
    inventory: {
      table: 'inventory', idStrategy: 'text', filter: null,
      fromRow: function (r) { return {
        id: r.id, name: r.name, sku: r.sku, category: r.category, qty: r.qty, lowAt: r.low_at,
        unit: r.unit, cost: r.cost, location: r.location, notes: r.notes,
        supplier: r.supplier, reorderQty: r.reorder_qty, fitment: r.fitment,
        createdAt: ts(r.created_at), updatedAt: ts(r.updated_at) }; },
      toRow: function (o) { return {
        id: o.id, name: o.name || '', sku: o.sku || '', category: o.category || '',
        qty: parseInt(o.qty, 10) || 0, low_at: parseInt(o.lowAt, 10) || 0, unit: o.unit || '',
        cost: o.cost === '' || o.cost == null ? null : Number(o.cost), location: o.location || '',
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
      table: 'receipts', idStrategy: 'text', filter: null,
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
      var q = sb.from(cfg.table).select('*');
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
      // deletes
      deletes.forEach(function (o) { ops.push(sb.from(cfg.table).delete().eq('id', o.id)); });
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

      return Promise.all(ops).then(function () { shadow[key] = snapshot(cache[key]); })
        .catch(function (e) { if (global.console) console.warn('[TKS cloud flush]', key, e); });
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
      var list = this.all();
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
  var Services = {
    list: function () { return SERVICES.slice(); },
    // map the scheduler's coaching tiles (jobType auto/res/com + subType) to a
    // canonical service { value, cat } — no double entry for the trainee.
    fromJob: function (jobType, subType) {
      var cat = jobType === 'auto' ? 'automotive' : jobType === 'com' ? 'commercial' : jobType === 'res' ? 'residential' : 'other';
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
  var authState = { user: null, sb: null };   // current signed-in user (cloud)

  global.TKS = {
    KEYS: KEYS, uid: uid, read: read, write: write,
    adapter: function () { return ADAPTER.name; },
    Customers: Customers, Inventory: Inventory, Bookings: Bookings,
    Services: Services, decodeVin: decodeVin,

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
      email: function () { return authState.user ? authState.user.email : null; },
      isSignedIn: function () { return !!authState.user; },
      ownerEmails: function () {
        var o = global.TKS_OWNER && global.TKS_OWNER.OWNER_EMAILS;
        if (!Array.isArray(o)) return [];
        return o.map(function (e) { return String(e || '').trim().toLowerCase(); }).filter(Boolean);
      },
      isOwner: function () {
        var e = this.email(); if (!e) return false;
        return this.ownerEmails().indexOf(e.toLowerCase()) !== -1;
      },
      role: function () { return !this.isSignedIn() ? 'guest' : (this.isOwner() ? 'owner' : 'staff'); },
      signOut: function () { return (authState.sb && authState.sb.auth) ? authState.sb.auth.signOut() : Promise.resolve(); }
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
            changeHandlers.forEach(function (fn) { try { fn(); } catch (e) {} });
          });
        } catch (e) {}
        return sb.auth.getUser().then(function (res) {
          var u = res && res.data && res.data.user;
          authState.user = u ? { id: u.id, email: u.email } : null;
        }).catch(function () {}).then(function () {
          changeHandlers.forEach(function (fn) { try { fn(); } catch (e) {} });
          return true;
        });
      });
    }
  };
})(window);

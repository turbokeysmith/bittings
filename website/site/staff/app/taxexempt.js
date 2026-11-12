/* ============================================================================
   app/taxexempt.js — tax-exempt sales (8z78, owner 2026-11-12).
   ----------------------------------------------------------------------------
   window.TKS_EXEMPT. One shared place for: the kinds of exemption Oklahoma recognises and the paper each one
   needs, the "certificate on file" for a customer (table public.tax_exemptions + private bucket exemption-docs),
   the box staff fill in at the sale, and the snapshot a receipt carries.

   Why the paper matters (OAC 710:65-7-6): the shop only escapes the tax on an exempt sale when it holds the
   purchaser's documentation, taken in good faith, within 90 days of the sale.
     resale        (7-8)   name, address, type of business, sales tax permit number, signature
     entity        (7-15)  copy of the Tax Commission letter / card + signed "bought by the entity, with its funds"
     veteran       (7-17)  the exemption card shown at the sale: a copy, or name + address + exemption number
     agricultural  (7-11)  copy of the agricultural exemption permit card
     manufacturer  (7-9)   copy of the manufacturer's permit, or name + address + permit number
   A receipt marked exempt has taxRate 0 and r.taxExempt = snapshot(); the payment functions already read the
   receipt's own tax rate, so they are not involved.
   ========================================================================== */
(function () {
  'use strict';
  var CACHE = 'tks_tax_exemptions', PENDING = 'tks_tax_exemptions_pending', BUCKET = 'exemption-docs';
  var COLS = 'id,customer_id,customer_name,customer_phone,kind,holder_name,holder_address,business_type,permit_number,expires_on,doc_path,doc_added_at,statement,signer_name,signed_at,verified_at,verified_by,note,created_by,created_at,revoked_at';

  var KINDS = [
    { k: 'resale', label: 'Resale', who: 'A dealer or another locksmith buying to sell again',
      num: 'Oklahoma sales tax permit number', ask: 'Ask for their sales tax permit. Write down the number exactly as printed.',
      needBusiness: true, needSig: true, needDoc: false,
      statement: 'The purchaser certifies that the items on this sale are bought for resale in the regular course of its business, under the sales tax permit shown.' },
    { k: 'entity', label: 'Exempt organization', who: 'Government, public school, church, tribe and similar',
      num: 'Exemption number on the letter or card (type "Letter" if there is no number)', ask: 'Ask for the letter or card the Oklahoma Tax Commission sent them, and take a photo of it.',
      needSig: true, needDoc: true,
      statement: 'This purchase is authorized by, and being made by, the exempt entity named, with funds of the exempt entity, and not by the individual.' },
    { k: 'veteran', label: '100% disabled veteran', who: 'Veteran, surviving spouse, or a household member buying for them',
      num: 'Exemption number on the card', ask: 'They must show the Oklahoma Tax Commission exemption card at the sale. Take a photo of it, or copy the name, address and number from it.',
      needCard: true, needSig: false, needDoc: false,
      statement: 'Bought by, or for the benefit of, the holder of the Oklahoma Tax Commission disabled-veteran exemption card shown. Not a business purchase.' },
    { k: 'agricultural', label: 'Agricultural permit', who: 'A farm or ranch with an agricultural exemption permit',
      num: 'Agricultural exemption permit number', ask: 'Ask for the agricultural exemption permit card and take a photo of it.',
      needSig: false, needDoc: true,
      statement: 'The purchaser holds the agricultural exemption permit shown and the items are for use in agricultural production.' },
    { k: 'manufacturer', label: 'Manufacturer permit', who: 'A manufacturer with a manufacturer\'s exemption permit',
      num: 'Manufacturer exemption permit number', ask: 'Ask for the manufacturer\'s permit and take a photo of it (or copy the name, address and number).',
      needSig: false, needDoc: false,
      statement: 'The purchaser holds the manufacturer exemption permit shown and the items are for use in manufacturing.' },
    { k: 'other', label: 'Other', who: 'Anything else — say what the exemption is',
      num: 'Permit / exemption number', ask: 'Take a photo of whatever paper they have and write the reason in the note. Check with your accountant if you are not sure it is exempt.',
      needSig: true, needDoc: true, needNote: true,
      statement: 'The purchaser certifies that this purchase is exempt from Oklahoma sales tax for the reason stated, under the document shown.' }
  ];
  function kind(k) { for (var i = 0; i < KINDS.length; i++) if (KINDS[i].k === k) return KINDS[i]; return KINDS[KINDS.length - 1]; }

  function sb() { try { return (window.TKS && TKS._sb && TKS._sb()) || null; } catch (e) { return null; } }
  function live() { try { return !!(sb() && TKS.auth && TKS.auth.isSignedIn() && !(TKS.isDemo && TKS.isDemo())); } catch (e) { return false; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function lower(s) { return String(s || '').trim().toLowerCase(); }
  function isUuid(v) { return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v); }
  function uuid() { try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fmtDate(s) { if (!s) return ''; try { var d = new Date(String(s).length <= 10 ? s + 'T12:00:00' : s); return d.toLocaleDateString(); } catch (e) { return String(s); } }
  function readLS(k) { try { return JSON.parse(localStorage.getItem(k) || '[]') || []; } catch (e) { return []; } }
  function writeLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  // ------------------------------------------------------------------ data ----
  function all(includeRevoked) {
    var seen = {}, out = [];
    readLS(PENDING).concat(readLS(CACHE)).forEach(function (c) { if (!c || !c.id || seen[c.id]) return; seen[c.id] = 1; if (includeRevoked || !c.revoked_at) out.push(c); });
    return out;
  }
  var loading = null;
  function load(force) {
    if (!live()) return Promise.resolve(all());
    if (loading && !force) return loading;
    loading = flush().then(function () { return sb().from('tax_exemptions').select(COLS).order('created_at', { ascending: false }).limit(2000); })
      .then(function (r) { loading = null; if (r && !r.error && Array.isArray(r.data)) writeLS(CACHE, r.data); return all(); }, function () { loading = null; return all(); });
    return loading;
  }
  // certificates recorded while offline (or when the insert failed) are sent again here
  function flush() {
    var pend = readLS(PENDING); if (!pend.length || !live()) return Promise.resolve();
    return pend.reduce(function (p, row) { return p.then(function () {
      var send = Object.assign({}, row); delete send._pending; delete send.created_at;
      return sb().from('tax_exemptions').insert(send).then(function (r) {
        if (!r.error || String(r.error.code) === '23505') writeLS(PENDING, readLS(PENDING).filter(function (x) { return x.id !== row.id; }));
      }, function () {});
    }); }, Promise.resolve());
  }
  function expired(c) { return !!(c && c.expires_on && String(c.expires_on).slice(0, 10) < today()); }
  // what is still owed on a certificate, in plain words
  function missing(c) {
    var K = kind(c.kind), m = [];
    if (!String(c.permit_number || '').trim()) m.push('the number');
    if (!String(c.holder_address || '').trim()) m.push('the address');
    if (K.needBusiness && !String(c.business_type || '').trim()) m.push('the type of business');
    if (K.needSig && !c.signed_at) m.push('the signature');
    if (K.needDoc && !c.doc_path) m.push('a photo of the document');
    return m;
  }
  // days left to get the paper in hand (90 days from when the certificate was first used / recorded)
  function daysLeft(c) { var t = Date.parse(c.created_at || '') || Date.now(); return 90 - Math.floor((Date.now() - t) / 86400000); }
  function forCustomer(cust) {
    cust = cust || {}; var ph = digits(cust.phone), nm = lower(cust.name), id = cust.id;
    return all().filter(function (c) {
      if (id && isUuid(String(id)) && c.customer_id === id) return true;
      if (ph.length >= 7 && digits(c.customer_phone) === ph) return true;
      return !!nm && (lower(c.customer_name) === nm || lower(c.holder_name) === nm);
    }).sort(function (a, b) { return (expired(a) - expired(b)) || (Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0)); });
  }
  function find(cust) { var l = forCustomer(cust).filter(function (c) { return !expired(c); }); return l[0] || null; }
  function me() { try { return { id: (TKS.auth.user && TKS.auth.user() && TKS.auth.user().id) || null, name: (TKS.auth.displayName && TKS.auth.displayName()) || (TKS.auth.email && TKS.auth.email()) || '' }; } catch (e) { return { id: null, name: '' }; } }
  // what a receipt carries: enough to stand on its own in an audit, without the signature image
  function snapshot(c, extra) {
    var K = kind(c.kind), who = me();
    return Object.assign({ certId: c.id, kind: c.kind, kindLabel: K.label, holderName: c.holder_name || '', holderAddress: c.holder_address || '',
      businessType: c.business_type || '', permitNumber: c.permit_number || '', expiresOn: c.expires_on || '', hasDoc: !!c.doc_path,
      signerName: c.signer_name || '', signedAt: c.signed_at || '', statement: c.statement || K.statement, note: c.note || '',
      appliedBy: who.name, appliedAt: new Date().toISOString() }, extra || {});
  }
  function label(s) { if (!s) return ''; var n = String(s.permitNumber || '').trim(); return (s.kindLabel || kind(s.kind).label) + (n ? ' · ' + (/^letter$/i.test(n) ? 'letter on file' : n) : ''); }
  function certLines(s) {
    if (!s) return [];
    var out = ['TAX EXEMPT — ' + (s.kindLabel || kind(s.kind).label), [s.holderName, s.holderAddress].filter(Boolean).join(' — ')];
    var n = [s.permitNumber ? ('Permit / exemption no.: ' + s.permitNumber) : '', s.businessType ? ('Type of business: ' + s.businessType) : '', s.expiresOn ? ('Expires ' + fmtDate(s.expiresOn)) : ''].filter(Boolean).join('   ');
    if (n) out.push(n);
    if (s.statement) out.push(s.statement);
    if (s.signedAt) out.push('Certificate signed by ' + (s.signerName || 'the purchaser') + ' on ' + fmtDate(s.signedAt) + ' (on file).');
    return out.filter(Boolean);
  }

  // ---------------------------------------------------------------- photos ----
  function shrink(file) {   // phone photos are huge; a readable 1600px JPEG is plenty for a permit
    return new Promise(function (res) {
      if (!file || !/^image\//.test(file.type)) return res(file || null);
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { try {
        var k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(url); res(b || file); }, 'image/jpeg', 0.82);
      } catch (e) { URL.revokeObjectURL(url); res(file); } };
      img.onerror = function () { URL.revokeObjectURL(url); res(file); };
      img.src = url;
    });
  }
  function uploadDoc(certId, file) {
    var s = sb(); if (!s || !file) return Promise.resolve({ ok: false, error: 'Not connected.' });
    return shrink(file).then(function (blob) {
      return s.rpc('current_shop').then(function (r) {
        var shop = r && r.data; if (!shop) return { ok: false, error: 'Could not find your shop.' };
        var ext = blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
        var path = shop + '/' + certId + '/' + Date.now() + '.' + ext;
        return s.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false }).then(function (up) {
          if (up.error) return { ok: false, error: up.error.message };
          return s.rpc('tax_exemption_set_doc', { p_id: certId, p_path: path }).then(function (q) {
            if (q.error) return { ok: false, error: q.error.message };
            var list = readLS(CACHE); list.forEach(function (c) { if (c.id === certId) { c.doc_path = path; c.doc_added_at = new Date().toISOString(); } }); writeLS(CACHE, list);
            return { ok: true, path: path };
          });
        });
      });
    }).catch(function (e) { return { ok: false, error: (e && e.message) || String(e) }; });
  }
  function viewDoc(c) {
    var s = sb(); if (!s || !c || !c.doc_path) return;
    var w = null; try { w = window.open('about:blank', '_blank'); } catch (e) {}
    s.storage.from(BUCKET).createSignedUrl(c.doc_path, 300).then(function (r) {
      var u = r && r.data && r.data.signedUrl; if (!u) { if (w) w.close(); return; }
      if (w) w.location = u; else location.href = u;
    }, function () { if (w) w.close(); });
  }
  function review(id, action, note) {
    var s = sb(); if (!s) return Promise.resolve({ ok: false, error: 'Not connected.' });
    return s.rpc('tax_exemption_review', { p_id: id, p_action: action, p_note: note || null }).then(function (r) {
      if (r.error) return { ok: false, error: r.error.message };
      return load(true).then(function () { return { ok: true }; });
    }, function (e) { return { ok: false, error: (e && e.message) || String(e) }; });
  }

  // -------------------------------------------------------------------- UI ----
  function css() {
    if (document.getElementById('txCss')) return;
    var st = document.createElement('style'); st.id = 'txCss';
    st.textContent =
      '.tx-ov{position:fixed;inset:0;z-index:100020;background:rgba(0,0,0,.72);display:flex;align-items:flex-start;justify-content:center;padding:14px;overflow:auto;-webkit-overflow-scrolling:touch}' +
      '.tx-box{background:#fff;color:#16181d;width:100%;max-width:520px;border-radius:16px;padding:16px 16px 18px;font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.5)}' +
      '.tx-box *{box-sizing:border-box}.tx-h{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.tx-h b{font-size:18px;color:#16181d}' +
      '.tx-x{border:0;background:none;font-size:26px;line-height:1;color:#555;cursor:pointer;min-width:44px;min-height:44px}' +
      '.tx-l{display:block;font-weight:700;font-size:13px;color:#30343c;margin:12px 0 4px}.tx-l .m{font-weight:400;color:#6a7080}' +
      '.tx-i{width:100%;min-height:46px;padding:10px 12px;border:1px solid #c9ced8;border-radius:10px;background:#fff;color:#16181d;font:inherit}' +
      '.tx-i:focus{outline:2px solid #f2b43a;outline-offset:1px}' +
      '.tx-kinds{display:grid;gap:8px}.tx-k{display:block;text-align:left;width:100%;border:1px solid #c9ced8;border-radius:12px;background:#f6f7f9;color:#16181d;padding:10px 12px;cursor:pointer;font:inherit;min-height:52px}' +
      '.tx-k b{display:block;color:#16181d}.tx-k span{display:block;font-size:12.5px;color:#5a6070}.tx-k.on{border-color:#b3261e;background:#fdecea;box-shadow:inset 0 0 0 1px #b3261e}' +
      '.tx-note{font-size:13px;color:#454b58;background:#f3f5f8;border-radius:10px;padding:9px 11px;margin-top:10px}' +
      '.tx-warn{font-size:13px;color:#7a4b00;background:#fff4d6;border:1px solid #f0d58a;border-radius:10px;padding:9px 11px;margin-top:10px}' +
      '.tx-err{font-size:13.5px;color:#b3261e;font-weight:700;min-height:18px;margin-top:10px}' +
      '.tx-btn{min-height:48px;border-radius:12px;border:1px solid #c9ced8;background:#fff;color:#16181d;font:inherit;font-weight:700;padding:10px 14px;cursor:pointer}' +
      '.tx-btn.go{background:#b3261e;border-color:#b3261e;color:#fff}.tx-btn[disabled]{opacity:.55}' +
      '.tx-foot{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.tx-foot .tx-btn{flex:1 1 140px}' +
      '.tx-sig{width:100%;height:150px;border:1px dashed #8a90a0;border-radius:10px;background:#fff;touch-action:none;display:block}' +
      '.tx-cert{border:1px solid #c9ced8;border-radius:12px;padding:10px 12px;margin-top:8px;background:#f6f7f9;color:#16181d}.tx-cert b{color:#16181d}.tx-cert .s{font-size:12.5px;color:#5a6070}' +
      '.tx-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.tx-row .tx-btn{min-height:42px;padding:8px 12px;font-size:13.5px}' +
      '.tx-ok{color:#136c3a;font-weight:700}.tx-bad{color:#b3261e;font-weight:700}.tx-chk{display:flex;gap:10px;align-items:flex-start;margin-top:12px;font-weight:600;color:#16181d}.tx-chk input{width:22px;height:22px;flex:0 0 22px;margin-top:1px}';
    document.head.appendChild(st);
  }
  function certSummary(c) {
    var K = kind(c.kind), m = missing(c), ex = expired(c);
    return '<b>' + esc(K.label) + '</b> — ' + esc(c.holder_name) + (c.permit_number ? ' · no. ' + esc(c.permit_number) : '') +
      '<div class="s">' + (ex ? '<span class="tx-bad">Expired ' + esc(fmtDate(c.expires_on)) + '</span>' : (c.expires_on ? 'Expires ' + esc(fmtDate(c.expires_on)) : 'No expiry date recorded')) +
      ' · ' + (c.doc_path ? '<span class="tx-ok">photo on file</span>' : 'no photo') + ' · ' + (c.signed_at ? '<span class="tx-ok">signed</span>' : 'not signed') +
      (c.verified_at ? ' · <span class="tx-ok">checked by a manager</span>' : '') + (c._pending ? ' · saved on this device, not sent yet' : '') + '</div>' +
      (m.length && !ex ? '<div class="s tx-bad">Still needed: ' + esc(m.join(', ')) + (daysLeft(c) > 0 ? ' (' + daysLeft(c) + ' days left)' : ' — overdue') + '</div>' : '');
  }

  // The box at the sale. opts: { customer:{id,name,phone,address}, current: snapshot|null, onDone(snapshot | null) }.
  // onDone(snapshot) = apply; onDone(null) = remove the exemption from this sale; closing the box calls nothing.
  function open(opts) {
    opts = opts || {}; css();
    var cust = opts.customer || {}, onDone = opts.onDone || function () {};
    var ov = document.createElement('div'); ov.className = 'tx-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Tax exempt');
    document.body.appendChild(ov);
    function close() { ov.remove(); }
    function shell(inner) { ov.innerHTML = '<div class="tx-box"><div class="tx-h"><b>Tax exempt</b><button type="button" class="tx-x" data-x aria-label="Close">×</button></div>' + inner + '</div>'; ov.querySelector('[data-x]').onclick = close; ov.scrollTop = 0; }

    function pickView() {
      var list = forCustomer(cust);
      var h = '<div class="tx-note">Customer: <b>' + esc(cust.name || '') + '</b>. Sales tax is only left off when the paperwork is on file.</div>';
      if (opts.current) h += '<div class="tx-cert"><div class="s">On this sale now</div><b>' + esc(label(opts.current)) + '</b> — ' + esc(opts.current.holderName || '') + '<div class="tx-row"><button type="button" class="tx-btn" data-remove>Remove — charge tax on this sale</button></div></div>';
      if (list.length) {
        h += '<label class="tx-l">On file for this customer</label>';
        list.forEach(function (c) { h += '<div class="tx-cert">' + certSummary(c) + '<div class="tx-row">' +
          (expired(c) ? '' : '<button type="button" class="tx-btn go" data-use="' + esc(c.id) + '">Use this</button>') +
          (c.doc_path ? '<button type="button" class="tx-btn" data-view="' + esc(c.id) + '">View photo</button>' : (c._pending ? '' : '<button type="button" class="tx-btn" data-photo="' + esc(c.id) + '">📷 Add photo</button>')) + '</div></div>'; });
      } else h += '<div class="tx-note">Nothing on file for this customer yet.</div>';
      h += '<div class="tx-err" id="txErr"></div><div class="tx-foot"><button type="button" class="tx-btn' + (list.length ? '' : ' go') + '" data-new>+ Record ' + (list.length ? 'a different one' : 'their exemption') + '</button><button type="button" class="tx-btn" data-x2>Close</button></div>';
      shell(h);
      ov.querySelector('[data-x2]').onclick = close;
      ov.querySelector('[data-new]').onclick = formView;
      var rm = ov.querySelector('[data-remove]'); if (rm) rm.onclick = function () { close(); onDone(null); };
      ov.querySelectorAll('[data-use]').forEach(function (b) { b.onclick = function () { var c = list.filter(function (x) { return x.id === b.dataset.use; })[0]; if (!c) return;
        if (kind(c.kind).needCard) { cardView(c); return; } close(); onDone(snapshot(c)); }; });
      ov.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { viewDoc(list.filter(function (x) { return x.id === b.dataset.view; })[0]); }; });
      ov.querySelectorAll('[data-photo]').forEach(function (b) { b.onclick = function () { pickFile(function (f) { if (!f) return; var e = ov.querySelector('#txErr'); e.style.color = '#454b58'; e.textContent = 'Uploading photo…';
        uploadDoc(b.dataset.photo, f).then(function (r) { if (r.ok) pickView(); else { e.style.color = ''; e.textContent = 'Photo not saved: ' + r.error; } }); }); }; });
    }
    // a veteran's card has to be SHOWN at every sale
    function cardView(c) {
      shell('<div class="tx-cert">' + certSummary(c) + '</div>' +
        '<label class="tx-chk"><input type="checkbox" id="txSaw"> <span>I saw the Oklahoma Tax Commission exemption card at this sale, and this purchase is for the veteran (or surviving spouse), not for a business.</span></label>' +
        '<div class="tx-err" id="txErr"></div><div class="tx-foot"><button type="button" class="tx-btn go" data-ok>Apply to this sale</button><button type="button" class="tx-btn" data-back>Back</button></div>');
      ov.querySelector('[data-back]').onclick = pickView;
      ov.querySelector('[data-ok]').onclick = function () { if (!ov.querySelector('#txSaw').checked) { ov.querySelector('#txErr').textContent = 'Tick the box once you have seen the card.'; return; } close(); onDone(snapshot(c, { cardSeen: true })); };
    }
    function pickFile(cb) { var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*,application/pdf'; inp.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(inp);
      inp.onchange = function () { var f = inp.files && inp.files[0]; inp.remove(); cb(f || null); }; inp.click(); }

    function formView() {
      var K = KINDS[0], file = null, drawn = false;
      shell('<label class="tx-l" style="margin-top:4px">Why are they exempt?</label><div class="tx-kinds">' +
          KINDS.map(function (k) { return '<button type="button" class="tx-k" data-k="' + k.k + '"><b>' + esc(k.label) + '</b><span>' + esc(k.who) + '</span></button>'; }).join('') + '</div>' +
        '<div class="tx-note" id="txAsk"></div>' +
        '<label class="tx-l">Name on the permit / card <span class="m">(the business, organization or person)</span></label><input class="tx-i" id="txName" autocomplete="off">' +
        '<label class="tx-l">Their address</label><input class="tx-i" id="txAddr" autocomplete="off">' +
        '<div id="txBizW"><label class="tx-l">Type of business</label><input class="tx-i" id="txBiz" placeholder="e.g. used car dealer, locksmith" autocomplete="off"></div>' +
        '<label class="tx-l" id="txNumL"></label><input class="tx-i" id="txNum" autocomplete="off" autocapitalize="characters">' +
        '<label class="tx-l">Expires <span class="m">(if a date is printed on it)</span></label><input class="tx-i" id="txExp" type="date">' +
        '<label class="tx-l">Photo of the permit / letter / card <span class="m" id="txDocM"></span></label>' +
        '<div class="tx-row" style="margin-top:0"><button type="button" class="tx-btn" id="txPhoto">📷 Take or choose a photo</button><span id="txPhotoN" style="align-self:center;font-size:13px;color:#454b58"></span></div>' +
        '<div id="txNoteW"><label class="tx-l">Note <span class="m" id="txNoteM">(optional)</span></label><input class="tx-i" id="txNote" autocomplete="off"></div>' +
        '<div id="txCardW"><label class="tx-chk"><input type="checkbox" id="txSaw"> <span>I saw the Oklahoma Tax Commission exemption card at this sale, and this purchase is for the veteran (or surviving spouse), not for a business.</span></label></div>' +
        '<div id="txSigW"><label class="tx-l">What they are signing</label><div class="tx-note" id="txStmt" style="margin-top:0"></div>' +
          '<label class="tx-l">Name of the person signing</label><input class="tx-i" id="txSigner" autocomplete="off">' +
          '<label class="tx-l">Signature <span class="m" id="txSigM"></span></label><canvas class="tx-sig" id="txSig"></canvas>' +
          '<div class="tx-row"><button type="button" class="tx-btn" id="txSigClr">Clear signature</button></div></div>' +
        '<div class="tx-err" id="txErr"></div>' +
        '<div class="tx-foot"><button type="button" class="tx-btn go" id="txSave">Save and apply to this sale</button><button type="button" class="tx-btn" id="txBack">Back</button></div>');
      var $ = function (id) { return ov.querySelector('#' + id); };
      $('txName').value = cust.name || ''; $('txAddr').value = cust.address || '';
      $('txBack').onclick = pickView;
      // signature pad
      var cv = $('txSig'), cx = null, down = false;
      function fit() { var r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; cv.width = Math.max(10, Math.round(r.width * d)); cv.height = Math.round(150 * d); cx = cv.getContext('2d'); cx.scale(d, d); cx.lineWidth = 2.2; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.strokeStyle = '#111'; drawn = false; }
      function pt(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
      cv.addEventListener('pointerdown', function (e) { e.preventDefault(); if (!cx) fit(); down = true; var p = pt(e); cx.beginPath(); cx.moveTo(p.x, p.y); try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
      cv.addEventListener('pointermove', function (e) { if (!down) return; e.preventDefault(); var p = pt(e); cx.lineTo(p.x, p.y); cx.stroke(); drawn = true; });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { cv.addEventListener(n, function () { down = false; }); });
      $('txSigClr').onclick = fit;
      function sigData() { if (!drawn) return null; try { var o = document.createElement('canvas'); o.width = 600; o.height = Math.round(600 * cv.height / cv.width); var x = o.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, o.width, o.height); x.drawImage(cv, 0, 0, o.width, o.height); return o.toDataURL('image/png'); } catch (e) { return null; } }
      $('txPhoto').onclick = function () { pickFile(function (f) { if (!f) return; if (f.size > 20 * 1024 * 1024) { $('txErr').textContent = 'That file is too big.'; return; } file = f; $('txPhotoN').textContent = '✓ ' + (f.name || 'photo') + ' ready'; }); };
      function setKind(k) { K = kind(k);
        ov.querySelectorAll('.tx-k').forEach(function (b) { b.classList.toggle('on', b.dataset.k === K.k); });
        $('txAsk').textContent = K.ask; $('txNumL').textContent = K.num; $('txStmt').textContent = K.statement;
        $('txBizW').style.display = K.needBusiness ? '' : 'none'; $('txCardW').style.display = K.needCard ? '' : 'none';
        $('txSigM').textContent = K.needSig ? '(needed)' : '(optional)'; $('txDocM').textContent = K.needDoc ? '(needed — you have 90 days, but take it now if you can)' : '(recommended)';
        $('txNoteM').textContent = K.needNote ? '(say what the exemption is)' : '(optional)';
        requestAnimationFrame(fit); }
      ov.querySelectorAll('.tx-k').forEach(function (b) { b.onclick = function () { setKind(b.dataset.k); }; });
      setKind('resale');

      $('txSave').onclick = function () {
        var err = $('txErr'), v = function (id) { return ($(id).value || '').trim(); };
        var name = v('txName'), addr = v('txAddr'), num = v('txNum'), signer = v('txSigner'), sig = sigData();
        err.style.color = '';
        if (!name) { err.textContent = 'Type the name on the permit or card.'; return; }
        if (!addr) { err.textContent = 'Type their address — the Tax Commission requires it.'; return; }
        if (K.needBusiness && !v('txBiz')) { err.textContent = 'Type what kind of business they are.'; return; }
        if (!num) { err.textContent = 'Type the permit / exemption number.' + (K.k === 'entity' ? ' If they only have a letter with no number, type Letter.' : ''); return; }
        if (K.needNote && !v('txNote')) { err.textContent = 'Say in the note what the exemption is.'; return; }
        if (K.needCard && !$('txSaw').checked) { err.textContent = 'Tick the box once you have seen the card.'; return; }
        if (K.needSig && !sig) { err.textContent = 'They need to sign in the box.'; return; }
        if (K.needSig && !signer) { err.textContent = 'Type the name of the person signing.'; return; }
        if (v('txExp') && v('txExp') < today()) { err.textContent = 'That permit has already expired — it cannot be used.'; return; }
        var who = me();
        var row = { id: uuid(), customer_id: (cust.id && isUuid(String(cust.id))) ? cust.id : null, customer_name: (cust.name || name).trim(), customer_phone: digits(cust.phone),
          kind: K.k, holder_name: name, holder_address: addr, business_type: K.needBusiness ? v('txBiz') : '', permit_number: num, expires_on: v('txExp') || null,
          statement: K.statement, signature: sig, signer_name: sig ? signer : '', signed_at: sig ? new Date().toISOString() : null, note: v('txNote'), created_by: who.id };
        var btn = $('txSave'); btn.disabled = true; err.style.color = '#454b58'; err.textContent = 'Saving…';
        var local = Object.assign({}, row, { created_at: new Date().toISOString() });
        function finish(c, warn) { close(); onDone(snapshot(c, K.needCard ? { cardSeen: true } : null), warn || ''); }
        function keepLocal(why) { var p = readLS(PENDING); p.unshift(Object.assign({ _pending: true }, local)); writeLS(PENDING, p);
          finish(local, 'Saved on this device (' + why + '). It will be sent when you are back online' + (file ? ' — the photo was NOT saved, add it later.' : '.')); }
        if (!live()) { keepLocal('no connection'); return; }
        sb().from('tax_exemptions').insert(row).then(function (r) {
          if (r.error) { if (/fetch|network|failed/i.test(r.error.message || '')) { keepLocal('no connection'); return; } btn.disabled = false; err.style.color = ''; err.textContent = 'Not saved: ' + r.error.message; return; }
          var list = readLS(CACHE); var saved = Object.assign({}, local); delete saved.signature; list.unshift(saved); writeLS(CACHE, list);
          if (!file) { finish(saved, K.needDoc ? 'Saved. A photo of the document is still needed within 90 days.' : ''); return; }
          err.textContent = 'Uploading photo…';
          uploadDoc(row.id, file).then(function (u) { if (u.ok) saved.doc_path = u.path; finish(saved, u.ok ? '' : ('Saved, but the photo did not upload (' + u.error + '). Add it later from the same box.')); });
        }, function () { keepLocal('no connection'); });
      };
    }
    if (!String(cust.name || '').trim()) { shell('<div class="tx-note">Type the customer\'s name first, then tap Tax exempt again.</div><div class="tx-foot"><button type="button" class="tx-btn go" data-x2>OK</button></div>'); ov.querySelector('[data-x2]').onclick = close; return; }
    pickView();
    load().then(function () { if (ov.isConnected && !ov.querySelector('#txSave') && !ov.querySelector('#txSaw')) pickView(); });
  }

  // Owner's list (Settings → Sales tax): every certificate, what is missing, check / withdraw.
  function manage(box) {
    if (!box) return; css();
    var mgr = false; try { mgr = !!(TKS.auth.can && TKS.auth.can('editPricing')); } catch (e) {}
    function paint() {
      var list = all(true).sort(function (a, b) { return (!!a.revoked_at - !!b.revoked_at) || (Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0)); });
      if (!list.length) { box.innerHTML = '<div class="hint">No tax-exempt customers on file yet. They are added at the sale: on a quote, invoice or receipt tap <b>Tax exempt</b>.</div>'; return; }
      box.innerHTML = list.map(function (c) {
        return '<div class="tx-cert" style="' + (c.revoked_at ? 'opacity:.6' : '') + '"><div class="s">' + esc(c.customer_name) + (c.created_at ? ' · recorded ' + esc(fmtDate(c.created_at)) : '') + '</div>' + certSummary(c) +
          (c.revoked_at ? '<div class="s tx-bad">Withdrawn ' + esc(fmtDate(c.revoked_at)) + (c.note ? ' — ' + esc(c.note) : '') + '</div>' :
          '<div class="tx-row">' + (c.doc_path ? '<button type="button" class="tx-btn" data-view="' + esc(c.id) + '">View photo</button>' : '<button type="button" class="tx-btn" data-photo="' + esc(c.id) + '">📷 Add photo</button>') +
            (mgr ? (c.verified_at ? '' : '<button type="button" class="tx-btn" data-act="verify" data-id="' + esc(c.id) + '">✓ I checked this permit</button>') + '<button type="button" class="tx-btn" data-act="revoke" data-id="' + esc(c.id) + '">Withdraw</button>' : '') + '</div>') + '</div>';
      }).join('');
      var byId = function (id) { return list.filter(function (x) { return x.id === id; })[0]; };
      box.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { viewDoc(byId(b.dataset.view)); }; });
      box.querySelectorAll('[data-photo]').forEach(function (b) { b.onclick = function () { var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*,application/pdf'; inp.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(inp);
        inp.onchange = function () { var f = inp.files && inp.files[0]; inp.remove(); if (!f) return; b.disabled = true; b.textContent = 'Uploading…'; uploadDoc(b.dataset.photo, f).then(function (r) { if (!r.ok) { b.disabled = false; b.textContent = 'Not saved — try again'; return; } paint(); }); }; inp.click(); }; });
      box.querySelectorAll('[data-act]').forEach(function (b) { b.onclick = function () {
        if (b.dataset.act === 'revoke' && b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Tap again to withdraw'; return; }
        b.disabled = true; review(b.dataset.id, b.dataset.act).then(function (r) { if (!r.ok) { b.disabled = false; b.textContent = r.error; return; } paint(); }); }; });
    }
    paint(); load(true).then(function () { if (box.isConnected) paint(); });
  }

  window.TKS_EXEMPT = { KINDS: KINDS, kind: kind, load: load, all: all, forCustomer: forCustomer, find: find, expired: expired, missing: missing, daysLeft: daysLeft,
    snapshot: snapshot, label: label, certLines: certLines, open: open, manage: manage, viewDoc: viewDoc, uploadDoc: uploadDoc, review: review, flush: flush };
  // keep the device copy fresh once the app is connected
  try { var p = window.TKS_CONNECTING; if (p && p.then) p.then(function () { setTimeout(load, 1500); }, function () {}); else setTimeout(load, 3000); } catch (e) {}
  window.addEventListener('online', function () { try { load(true); } catch (e) {} });
})();

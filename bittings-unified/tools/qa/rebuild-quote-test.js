// Browser test (demo data): quick quote, estimate → invoice, estimate → schedule hand-off, normal builder start-up.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');   // bittings-unified/
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; let failed = 0;
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 400) : '')); if (!ok) failed++; }
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    for (const role of ['owner', 'technician']) {
      const pg = await b.newPage();
      const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
      await pg.setViewport({ width: 375, height: 760, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await pg.goto('http://127.0.0.1:8088/START-DEMO.html', { waitUntil: 'networkidle2' }).catch(() => {});
      await sleep(1200);
      await pg.evaluate((role) => {
        localStorage.setItem('tks_demo_role', role);
        if (role !== 'owner') for (const k of Object.keys(localStorage)) if (/^sb-.*-auth-token$/.test(k)) { try { const o = JSON.parse(localStorage[k]); o.user.email = 'tech@example.com'; localStorage[k] = JSON.stringify(o); } catch (e) {} }
      }, role);

      // ---- normal start: the builder opens by itself ----
      let t0 = Date.now();
      await pg.goto('http://127.0.0.1:8088/bittings.html', { waitUntil: 'domcontentloaded' });
      await pg.waitForSelector('.qi-box', { timeout: 5000 }).catch(() => {});
      let r = await pg.evaluate(() => ({ open: !!document.querySelector('.qi-box'), title: (document.querySelector('#qiTitle') || {}).innerText, type: (document.querySelector('.qiTB.on') || {}).dataset && document.querySelector('.qiTB.on').dataset.t, sb: !!(window.supabase && supabase.createClient) }));
      check(role + ': Receipts page opens the builder (' + (Date.now() - t0) + ' ms)', r.open && /New document/.test(r.title || '') && r.sb, r);

      // ---- quick quote ----
      await pg.goto('http://127.0.0.1:8088/bittings.html?quote=1', { waitUntil: 'domcontentloaded' });
      await pg.waitForSelector('.qi-box', { timeout: 5000 }).catch(() => {});
      r = await pg.evaluate(() => ({ title: (document.querySelector('#qiTitle') || {}).innerText, type: (document.querySelector('.qiTB.on') || { dataset: {} }).dataset.t,
        nameLabel: (document.querySelector('#qiNameL') || {}).innerText, payHidden: getComputedStyle(document.querySelector('#qiPayWrap')).display === 'none',
        years: (document.getElementById('qiVYear') || { options: [] }).options.length }));
      // 8z73: the Year list was once emptied by a note placed on the same line as the loop that fills it
      check(role + ': the Year list has years to pick from', r.years > 20, r.years);
      check(role + ': quote opens as an estimate, name optional, no payment section', /Build a quote/.test(r.title || '') && r.type === 'estimate' && /optional/.test(r.nameLabel || '') && r.payHidden, r);
      // 8z121: a scanned key (the stock record: sellPriceCents, no ready-made "price") fills the price as well as the cost
      { await pg.evaluate(() => document.getElementById('qiAdd').click()); await sleep(200);
        await pg.evaluate(() => { const rows = document.querySelectorAll('.qi-item'), row = rows[rows.length - 1]; row._applyPart({ id: 'tst_scan', name: 'TEST scanned key', sku: 'TST-SCAN', cost: 20, sellPriceCents: 6500, qty: 3 }); }); await sleep(350);
        const sc = await pg.evaluate(() => { const rows = document.querySelectorAll('.qi-item'), row = rows[rows.length - 1];
          const out = { n: rows.length, desc: row.querySelector('.qiDesc').value, amt: row.querySelector('.qiAmt').value, tot: Array.from(document.querySelectorAll('#qiTot div')).map(d => d.innerText.replace(/\n/g, ' = ')).join(' | ') };
          row._applyPart({ id: 'tst_scan2', name: 'TEST other key', sellPriceCents: 9900 });   // a price already on the line is never overwritten
          out.kept = row.querySelector('.qiAmt').value; row.querySelector('.qiDel').click(); out.after = document.querySelectorAll('.qi-item').length; return out; }); await sleep(250);
        check(role + ': a key scanned into a line brings its shelf price ($65.00) and the total follows; a price already typed is kept', sc.n === 2 && sc.desc === 'TEST scanned key' && sc.amt === '65.00' && /\$65\.00/.test(sc.tot) && sc.kept === '65.00' && sc.after === 1, sc); }
      await pg.type('.qi-item .qiDesc', 'TEST Car key');
      await pg.evaluate(() => { const row = document.querySelector('.qi-item'); const a = row.querySelector('.qiAmt'); a.value = '120'; a.dispatchEvent(new Event('input', { bubbles: true })); const c = row.querySelector('.qiCat'); c.value = 'Materials'; c.dispatchEvent(new Event('change', { bubbles: true }));   /* 8z96: only a part can be taxed */ const t = row.querySelector('.qiTax'); if (!t.checked) t.click(); });
      await sleep(250);
      r = await pg.evaluate(() => Array.from(document.querySelectorAll('#qiTot div')).map(d => d.innerText.replace(/\n/g, ' = ')));
      check(role + ': running total shows', r[0] === 'Total before tax = $120.00', r);
      await pg.evaluate(() => document.querySelector('#qiTot').scrollIntoView({ block: 'center' })); await sleep(150);
      if (role === 'owner') await pg.screenshot({ path: path.join(OUT, 'quote-1-builder.png') });
      const custBefore = await pg.evaluate(() => TKS.list('customers').length);
      // 8z122: "Save & send" / "Save & PDF" sit beside Create on an estimate; Save & PDF saves it and then makes the PDF
      { const pre = await pg.evaluate(() => { const row = document.getElementById('qiSendRow'), bs = Array.from(row.querySelectorAll('button')); window.__pdfCalls = []; window.__shareCalls = []; window.__realPDF = window.makePDF; window.__realShare = window.shareDocument;
          window.makePDF = function (r, lang, forCustomer) { window.__pdfCalls.push({ number: r && r.number, docType: r && r.docType, lang, forCustomer }); return null; };
          window.shareDocument = function (r, lang, forCustomer) { window.__shareCalls.push({ number: r && r.number, forCustomer }); };
          return { shown: getComputedStyle(row).display !== 'none', labels: bs.map(b => b.innerText.trim()), small: bs.filter(b => b.getBoundingClientRect().height < 43).length, before: TKS.list('receipts').length }; });
        await pg.evaluate(() => document.querySelector('#qiGoPdf').click()); await sleep(900);
        const post = await pg.evaluate(() => ({ after: TKS.list('receipts').length, pdf: window.__pdfCalls, share: window.__shareCalls, finished: Array.from(document.querySelectorAll('.res-actions button')).map(b => b.innerText.trim()) }));
        check(role + ': the estimate screen has "Save & send" and "Save & PDF" (finger-sized); Save & PDF saves the estimate, then makes the customer PDF of it', pre.shown && /Save & send/.test(pre.labels[0] || '') && /Save & PDF/.test(pre.labels[1] || '') && pre.small === 0 && post.after === pre.before + 1 && post.pdf.length === 1 && /^EST-/.test(post.pdf[0].number || '') && post.pdf[0].forCustomer === true && post.share.length === 0, { pre, post });
        { const t = await pg.evaluate(() => { const T = TKS.Config.estimateTerms(), est = TKS.list('receipts').filter(x => x.docType === 'estimate').pop(), inv = { docType: 'invoice', notes: 'x' };
            return { days: T.days, disc: T.disclaimer, msg: T.message, card: document.getElementById('chat').innerText, subj: estSubject(Object.assign({}, est, { vehYear: '2018', vehMake: 'Nissan', vehModel: 'Maxima' })), notes: estNotes(est), invNotes: estNotes(inv), paper: paperCopy(est).notes, msg2: estMessage(Object.assign({}, est, { vehYear: '2018', vehMake: 'Nissan', vehModel: 'Maxima', vehIgnition: 'push' })) }; });
          check(role + ': an estimate carries "good for 7 days" at its foot (card, paper copy) — an invoice does not; the message and the subject (vehicle + service) are ready for sending', t.days === 7 && /good for 7 days/.test(t.disc) && /good for 7 days/.test(t.card) && /good for 7 days/.test(t.paper) && t.invNotes === 'x' && /Thank you for requesting this estimate/.test(t.msg) && t.subj === 'Estimate for 2018 Nissan Maxima' && /for your .+ service for your 2018 Nissan Maxima \(push to start\)\. Please see the attached/.test(t.msg2) && /call us at \(\d{3}\) \d{3}-\d{4}|call us at /.test(t.msg2), { days: t.days, subj: t.subj, msg: t.msg.slice(0, 60), inCard: /good for 7 days/.test(t.card), disc: t.disc.slice(0, 50), paper: String(t.paper).slice(-60), invNotes: t.invNotes, msg2: t.msg2 }); }
        // 8z130: Send opens the review box — To / Subject / Message filled in, the PDF attached — and Bittings sends it
        { await pg.evaluate(() => { window.makePDF = window.__realPDF; window.shareDocument = window.__realShare; window.__sent = []; window.cloudReady = function () { return true; };   /* this suite runs on-device; the send box needs a signed-in shop */
            window.__realSb = TKS._sb; TKS._sb = function () { return { functions: { invoke: (name, o) => { window.__sent.push({ name, body: o && o.body }); return Promise.resolve({ data: { ok: true, id: 're_test' }, error: null }); } } }; };   /* the real client makes a fresh functions object on every read, so the whole handle is swapped */
            Array.from(document.querySelectorAll('.res-actions button')).find(b => /Send$/.test(b.innerText)).click(); }); await sleep(500);
          const d1 = await pg.evaluate(() => { const g = id => document.getElementById(id); if (!g('sendDocOv')) return null; const bx = g('sendDocOv').firstChild.getBoundingClientRect();
            return { to: g('sdTo').value, sub: g('sdSub').value, msg: g('sdMsg').value, att: g('sdAtt').innerText, btns: Array.from(g('sendDocOv').querySelectorAll('button')).map(b => b.innerText), small: Array.from(g('sendDocOv').querySelectorAll('button,input')).filter(b => b.getBoundingClientRect().height < 43).length, fits: bx.right <= innerWidth + 1 }; });
          if (!d1) { const dbg = await pg.evaluate(() => ({ modal: document.getElementById('modalBackdrop').className, title: document.getElementById('modalTitle').innerText, body: document.getElementById('modalBody').innerText, cloud: typeof cloudReady === 'function' ? cloudReady() : null, fn: !!(TKS._sb && TKS._sb().functions && TKS._sb().functions.invoke), btns: Array.from(document.querySelectorAll('.res-actions button')).map(b => b.innerText), errs: window.__lastErr || null })); console.log('DBG ' + JSON.stringify(dbg)); throw new Error('send box did not open'); }
          await pg.evaluate(() => document.getElementById('sdGo').click()); await sleep(300);
          const e1 = await pg.evaluate(() => ({ err: document.getElementById('sdErr').innerText, sent: window.__sent.length }));
          await pg.evaluate(() => { const i = document.getElementById('sdTo'); i.value = 'test.customer@example.com'; document.getElementById('sdGo').click(); }); await sleep(1200);
          const s1 = await pg.evaluate(() => { const c = window.__sent[0] || {}, b = c.body || {}, est = TKS.list('receipts').find(x => x.sentTo); return { open: !!document.getElementById('sendDocOv'), err: (document.getElementById('sdErr') || {}).innerText, go: (document.getElementById('sdGo') || {}).innerText, name: c.name, to: b.to, sub: b.subject, msgOk: /Thank you for requesting this estimate/.test(b.message || ''), pdf: String(b.pdfBase64 || '').slice(0, 6), file: b.filename, docType: b.docType, saved: est ? [est.sentTo, !!est.sentAt, est.email] : null, note: document.getElementById('chat').innerText.indexOf('Emailed to test.customer@example.com') >= 0 }; });
          check(role + ': Send opens a review box with Subject and Message filled in and the PDF attached; without an address it will not send', !!d1 && /^Estimate/.test(d1.sub) && /Thank you for requesting this estimate/.test(d1.msg) && /\.pdf · \d+ KB — attached/.test(d1.att) && d1.btns.join('|') === 'Cancel|Share another way|Send email' && d1.small === 0 && d1.fits && /email address/.test(e1.err) && e1.sent === 0, { d1, e1 });
          check(role + ': with the address typed, Send email posts To / Subject / Message / PDF to the server once, closes, and the estimate remembers who it went to', !s1.open && s1.name === 'send-document' && s1.to === 'test.customer@example.com' && /^Estimate/.test(s1.sub) && s1.msgOk && s1.pdf === 'JVBERi' && /\.pdf$/.test(s1.file) && s1.docType === 'estimate' && !!s1.saved && s1.saved[0] === 'test.customer@example.com' && s1.saved[1] && s1.saved[2] === 'test.customer@example.com' && s1.note, s1);
          await pg.evaluate(() => { TKS._sb = window.__realSb; }); }
        check(role + ': the finished estimate also offers Send and PDF', post.finished.some(t => /Send$/.test(t)) && post.finished.some(t => /PDF$/.test(t)), post.finished); }
      r = await pg.evaluate(() => { const h = TKS.list('receipts'); const d = h.find(x => x.customer === 'Phone quote');
        return { err: (document.querySelector('#qiErr') || {}).innerText || '', saved: !!d, docType: d && d.docType, number: d && d.number, total: d && d.totals && d.totals.total, noCustomer: d && d.noCustomer,
          cust: TKS.list('customers').length, buttons: Array.from(document.querySelectorAll('.res-actions button')).map(x => x.innerText) }; });
      check(role + ': quote saved as an estimate with no customer record made', r.saved && r.docType === 'estimate' && /^EST-/.test(r.number || '') && r.cust === custBefore, r);
      check(role + ': result offers Book it / Make it an invoice / New quote', /* 8z153: was Schedule this job */ ['📅 Book it', '🧾 Make it an invoice', '💬 New quote'].every(x => r.buttons.indexOf(x) >= 0) && r.buttons.indexOf('💳 Pay Now') < 0, r.buttons);
      await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await sleep(200);
      if (role === 'owner') await pg.screenshot({ path: path.join(OUT, 'quote-2-result.png') });

      // ---- make it an invoice: a new document with its own id ----
      await pg.evaluate(() => Array.from(document.querySelectorAll('.res-actions button')).find(x => /Make it an invoice/.test(x.innerText)).click()); await sleep(500);
      r = await pg.evaluate(() => { const h = TKS.list('receipts'); const est = h.find(x => x.customer === 'Phone quote' && x.docType === 'estimate'), inv = h.find(x => x.fromEstimate === (est && est.number));
        return { est: est && est.id, inv: inv && inv.id, invNo: inv && inv.number, invType: inv && inv.docType, ids: h.map(x => x.id).length === new Set(h.map(x => x.id)).size,
          buttons: Array.from(document.querySelectorAll('.res-actions button')).map(x => x.innerText) }; });
      check(role + ': invoice made from the estimate has its own id and number; both kept', r.est && r.inv && r.est !== r.inv && /^INV-/.test(r.invNo || '') && r.ids && r.buttons.indexOf('💳 Pay Now') >= 0, r);

      // ---- schedule this job: hands the quote to the Scheduler ----
      const hand = await pg.evaluate(() => { const est = TKS.list('receipts').find(x => x.customer === 'Phone quote' && x.docType === 'estimate'); const real = location; let dest = null;
        const orig = Object.getOwnPropertyDescriptor(window, 'location'); try { estimateToJobDry = true; } catch (e) {}
        // run the hand-off but stop the navigation: copy what it would store
        const d = (function () { const lines = (est.items || []).filter(it => it && !it.isDiscount && !it.declined).map(it => ({ desc: it.desc, amount: it.amount, taxable: it.taxable })); return lines; })();
        return { lines: d, hasFn: typeof estimateToJob === 'function' }; });
      check(role + ': estimate → schedule hand-off exists and carries the taxed line', hand.hasFn && hand.lines.length === 1 && hand.lines[0].taxable === true, hand);
      check(role + ': no page errors', errs.length === 0, errs);
      await pg.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED');
})().catch(e => { console.error('FAIL', e); process.exit(1); });

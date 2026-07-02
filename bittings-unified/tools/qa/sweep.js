// Full visual/console/contrast sweep as OWNER, both themes, all 14 screens.
// Outputs: audit/<theme>/<screen>.<w>.png  + audit/report.json
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const BASE = 'http://127.0.0.1:8088';
const OUT = path.join(__dirname, 'audit');
fs.mkdirSync(OUT, { recursive: true });

const SCREENS = [
  ['Register(POS)','payments'], ['Start-a-Job','startjob'], ['Customers','customers'],
  ['Receipts','receipts'], ['Scheduler','schedule'], ['Inventory','inventory'],
  ['Fleet','fleet'], ['Lishi','lishi'], ['Programmers','programmers'],
  ['Dashboard','dashboard'], ['Closeout','history'], ['Reports','reports'],
  ['Settings','settings'], ['Commission','commission'],
];

// In-page contrast + overflow scan. Returns worst contrast offenders + overflow hits + scaffolding hits.
const SCAN = function () {
  function lum(r,g,b){ const a=[r,g,b].map(v=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; }
  function ratio(f,b){ const L1=lum(...f),L2=lum(...b); const hi=Math.max(L1,L2),lo=Math.min(L1,L2); return (hi+0.05)/(lo+0.05); }
  function parse(c){ const m=c&&c.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p=m[1].split(',').map(s=>parseFloat(s)); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; }
  function bgOf(el){ let n=el; while(n&&n!==document.documentElement){ const c=parse(getComputedStyle(n).backgroundColor); if(c&&c.a>0.1) return c; n=n.parentElement; } const bc=parse(getComputedStyle(document.body).backgroundColor); return bc&&bc.a>0.1?bc:{r:255,g:255,b:255,a:1}; }
  const active = document.querySelector('.view.active') || document.body;
  const offenders=[], seen=new Set();
  active.querySelectorAll('*').forEach(el=>{
    if(el.offsetParent===null) return;
    const r=el.getBoundingClientRect(); if(r.width<2||r.height<2) return;
    // direct text only
    let txt=''; el.childNodes.forEach(n=>{ if(n.nodeType===3) txt+=n.textContent; });
    txt=txt.trim(); if(txt.length<2) return;
    const cs=getComputedStyle(el); const fg=parse(cs.color); if(!fg||fg.a<0.1) return;
    const bg=bgOf(el);
    const rr=ratio([fg.r,fg.g,fg.b],[bg.r,bg.g,bg.b]);
    const fs=parseFloat(cs.fontSize)||14, bold=(parseInt(cs.fontWeight)||400)>=700;
    const large = fs>=24 || (fs>=18.66 && bold);
    const min = large?3.0:4.5;
    if(rr < min){
      const key=txt.slice(0,24)+'|'+Math.round(rr*10);
      if(seen.has(key)) return; seen.add(key);
      offenders.push({ text:txt.slice(0,40), ratio:+rr.toFixed(2), need:min, fontPx:+fs.toFixed(1), bold,
        fg:`${fg.r},${fg.g},${fg.b}`, bg:`${bg.r},${bg.g},${bg.b}`, tag:el.tagName.toLowerCase(), cls:(el.className||'').slice(0,40) });
    }
  });
  offenders.sort((a,b)=>a.ratio-b.ratio);
  // horizontal overflow within active view
  const overflow=[];
  active.querySelectorAll('*').forEach(el=>{
    if(el.offsetParent===null) return;
    if(el.scrollWidth - el.clientWidth > 4 && el.clientWidth>40){
      const r=el.getBoundingClientRect(); if(r.width<40) return;
      overflow.push({ tag:el.tagName.toLowerCase(), cls:(el.className||'').slice(0,40), over:el.scrollWidth-el.clientWidth });
    }
  });
  // page beyond viewport
  const docOverflow = document.documentElement.scrollWidth > window.innerWidth + 2 ? (document.documentElement.scrollWidth - window.innerWidth) : 0;
  // scaffolding text
  const bodyTxt = active.innerText || '';
  const scaff = (bodyTxt.match(/\b(TODO|FIXME|placeholder|lorem ipsum|debug|XXX|console\.log|undefined|NaN|\[object Object\]|test mode|TEST MODE|coming soon|not implemented|stub)\b/gi)||[]);
  return { offenders: offenders.slice(0,12), overflow: overflow.slice(0,8), docOverflow, scaffold:[...new Set(scaff)].slice(0,12), activeView: active.id||null };
};

async function setTheme(page, theme){
  await page.evaluate((t)=>{
    try{ localStorage.setItem('bt_theme', t); }catch(e){}
    // click the matching theme toggle button
    const btns=[...document.querySelectorAll('button')].filter(b=>/^(☀ Light|🌙 Dark)$/.test((b.textContent||'').trim()));
    const want = t==='dark' ? '🌙' : '☀';
    const b = btns.find(x=>(x.textContent||'').includes(want)); if(b) b.click();
  }, theme);
  await new Promise(r=>setTimeout(r,250));
}

async function go(page, view){
  await page.evaluate((v)=>{
    const b=document.querySelector('[data-go="'+v+'"]:not([hidden])') || document.querySelector('[data-go="'+v+'"]');
    if(b) b.click(); else if(window._goView) window._goView(v); else if(window.show) window.show(v);
  }, view);
  await new Promise(r=>setTimeout(r,650));
}

(async () => {
  const browser = await puppeteer.launch({ headless:'new' });
  const page = await browser.newPage();
  await page.setViewport({ width:1280, height:900 });

  // per-screen console capture
  let bucket=[];
  page.on('console', m=>{ if(['error','warning'].includes(m.type())) bucket.push(`[${m.type()}] ${m.text()}`.slice(0,200)); });
  page.on('pageerror', e=>bucket.push(`[pageerror] ${e.message}`.slice(0,200)));
  const failed=[];
  page.on('requestfailed', r=>failed.push(r.url()));
  page.on('response', r=>{ if(r.status()>=400) failed.push(r.status()+' '+r.url()); });

  // seed demo
  await page.goto(BASE+'/START-DEMO.html', { waitUntil:'load' });
  await page.waitForFunction(()=>location.pathname.endsWith('index.html'), {timeout:15000}).catch(()=>{});
  await new Promise(r=>setTimeout(r,1500));

  const report = { generatedAs:'owner', screens:{} };
  for(const theme of ['dark','light']){
    await setTheme(page, theme);
    fs.mkdirSync(path.join(OUT,theme), {recursive:true});
    for(const [label,view] of SCREENS){
      bucket=[];
      await go(page, view);
      // desktop screenshot
      await page.setViewport({ width:1280, height:900 });
      await new Promise(r=>setTimeout(r,200));
      const scan = await page.evaluate(SCAN);
      await page.screenshot({ path: path.join(OUT,theme, view+'.1280.png') });
      // mobile screenshot
      await page.setViewport({ width:390, height:844 });
      await new Promise(r=>setTimeout(r,300));
      const scanM = await page.evaluate(SCAN);
      await page.screenshot({ path: path.join(OUT,theme, view+'.390.png') });
      await page.setViewport({ width:1280, height:900 });
      const key = label+' / '+theme;
      report.screens[key] = { view, activeView:scan.activeView, console:[...new Set(bucket)],
        desktop:{offenders:scan.offenders, overflow:scan.overflow, docOverflow:scan.docOverflow},
        mobile:{offenders:scanM.offenders, overflow:scanM.overflow, docOverflow:scanM.docOverflow},
        scaffold:[...new Set([...(scan.scaffold||[]),...(scanM.scaffold||[])])] };
      process.stdout.write(`✓ ${key} (cons:${report.screens[key].console.length} contrastD:${scan.offenders.length} ovfM:${scanM.docOverflow})\n`);
    }
  }
  report.failedRequests = [...new Set(failed)].slice(0,20);
  fs.writeFileSync(path.join(OUT,'report.json'), JSON.stringify(report,null,2));
  console.log('\nFAILED REQUESTS:', report.failedRequests);
  await browser.close();
})().catch(e=>{ console.error('SWEEP FAILED:', e.stack); process.exit(1); });

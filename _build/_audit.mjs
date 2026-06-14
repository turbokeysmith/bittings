import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')), '..', 'site');
const pages = [];
function walk(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p = path.join(dir,e.name);
    if(e.isDirectory()){
      if(e.name==='es' || e.name==='assets' || e.name==='app') continue; // drafts + non-pages
      walk(p);
    } else if(e.name==='index.html'){
      pages.push(p);
    }
  }
}
walk(ROOT);

const SERVICES = {automotive:'Automotive', residential:'Residential', commercial:'Commercial', emergency:'Emergency'};
const INFO = {faq:'FAQ', blog:'Blog', certifications:'Certifications', 'pay-now':'Pay Now', 'service-areas':'Service Areas hub', contact:'Contact'};
const titleCase = s => s.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
function target(rel){
  const segs = rel.split('/').filter(Boolean);
  if(segs.length===0) return 'Homepage';
  if(segs.length===1){
    if(SERVICES[segs[0]]) return 'Metro service — '+SERVICES[segs[0]];
    if(INFO[segs[0]]) return INFO[segs[0]];
    return 'City — '+titleCase(segs[0]);
  }
  if(segs.length===2 && SERVICES[segs[1]]) return 'City — '+titleCase(segs[0])+' / '+SERVICES[segs[1]];
  return rel;
}
const decode = s => s
  .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#x27;/g,"'").replace(/&nbsp;/g,' ');
const ex = (html,re) => { const m = html.match(re); return m ? decode(m[1].replace(/\s+/g,' ').trim()) : ''; };
const stripTags = s => decode(s.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim());

const rows = pages.map(f=>{
  const html = fs.readFileSync(f,'utf8');
  const rel = path.relative(ROOT,f).split(path.sep).join('/').replace(/index\.html$/,'');
  const title = ex(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const desc = ex(html, /<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/?>/i)
            || ex(html, /<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["']\s*\/?>/i);
  const h1 = stripTags(ex(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i));
  return { url:'/'+rel, target:target(rel), title, desc, h1 };
});

const order = r => {
  const segs = r.url.split('/').filter(Boolean);
  if(segs.length===0) return '0';
  if(segs.length===1 && (SERVICES[segs[0]]||INFO[segs[0]])) return '1_'+segs[0];
  return '2_'+r.url;
};
rows.sort((a,b)=> order(a).localeCompare(order(b)));

let md = '# Public website — page audit (Title / Meta Description / H1)\n\n';
md += '_Live English pages in `site/`. Spanish `/es/` drafts excluded (unpublished, noindex). Read-only snapshot — nothing changed._\n\n';
md += 'Total: **'+rows.length+'** pages.\n\n';
for(const r of rows){
  console.log('URL:    '+r.url);
  console.log('TARGET: '+r.target);
  console.log('TITLE:  '+r.title);
  console.log('META:   '+r.desc);
  console.log('H1:     '+r.h1);
  console.log('------------------------------------------------------------');
  md += '### '+r.url+'\n';
  md += '- **Targets:** '+r.target+'\n';
  md += '- **Title:** '+(r.title||'_(none)_')+'\n';
  md += '- **Meta:** '+(r.desc||'_(none)_')+'\n';
  md += '- **H1:** '+(r.h1||'_(none)_')+'\n\n';
}
fs.writeFileSync(path.join(ROOT,'..','SITE_PAGES_AUDIT.md'), md);
console.log('\nTOTAL PAGES: '+rows.length+'  (written to SITE_PAGES_AUDIT.md)');

// minimal dBase/FoxPro .dbf reader (no memo files)
const fs=require('fs');
function read(file,{limit=Infinity,keepDeleted=false}={}){
  const b=fs.readFileSync(file); const n=b.readUInt32LE(4), hl=b.readUInt16LE(8), rl=b.readUInt16LE(10);
  const fields=[]; for(let o=32;o<hl-1&&b[o]!==0x0D;o+=32){ fields.push({name:b.toString('latin1',o,o+11).replace(/\0.*$/,'').trim(),type:String.fromCharCode(b[o+11]),off:b.readUInt32LE(o+12),len:b[o+16],dec:b[o+17]}); }
  // offsets: recompute sequentially (FoxPro stores displacement; dBase III doesn't)
  let pos=1; fields.forEach(f=>{ f.pos=pos; pos+=f.len; });
  const rows=[]; for(let i=0;i<n&&rows.length<limit;i++){ const s=hl+i*rl; if(s+rl>b.length) break; const del=b[s]===0x2A; if(del&&!keepDeleted) continue;
    const r={}; for(const f of fields){ const raw=b.subarray(s+f.pos,s+f.pos+f.len); let v;
      switch(f.type){ case 'N': case 'F': { const t=raw.toString('latin1').trim(); v=t===''?null:Number(t); break; }
        case 'D': { const t=raw.toString('latin1').trim(); v=t?t.slice(0,4)+'-'+t.slice(4,6)+'-'+t.slice(6,8):null; break; }
        case 'L': v=/[TtYy]/.test(raw.toString('latin1')); break;
        case 'I': v=raw.readInt32LE(0); break;
        case 'Y': v=Number(raw.readBigInt64LE(0))/10000; break;
        case 'B': v=raw.readDoubleLE(0); break;
        case 'T': { const jd=raw.readInt32LE(0), ms=raw.readInt32LE(4); v=jd?new Date((jd-2440588)*864e5+ms).toISOString():null; break; }
        case 'M': case 'G': case 'P': v=null; break;
        default: v=raw.toString('latin1').replace(/\0/g,'').trim(); }
      r[f.name]=v; } if(del) r._deleted=true; rows.push(r); }
  return {count:n,fields,rows};
}
module.exports={read};
if(require.main===module){ const f=process.argv[2]; const d=read(f,{limit:+process.argv[3]||3}); console.log(f,'records',d.count); console.log(d.fields.map(x=>x.name+':'+x.type+x.len).join(' ')); console.log(JSON.stringify(d.rows,null,0).slice(0,1500)); }

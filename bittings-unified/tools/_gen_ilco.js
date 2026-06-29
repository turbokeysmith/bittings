const fs = require('fs');
const d = JSON.parse(fs.readFileSync('_ilco_extracted.json', 'utf8'));
const lines = d.map(r => '{mk:' + JSON.stringify(r.make) + ',md:' + JSON.stringify(r.model) +
  ',ys:' + r.ys + ',ye:' + r.ye + ',s:' + JSON.stringify(r.series) +
  ',c:' + JSON.stringify(r.card) + ',k:' + JSON.stringify(r.keyway) + '}');
const js = '/* Ilco 2025 Auto/Truck Key Blank Reference — code series + HPC card (+ keyway where listed),\n' +
  '   by make/model/year. Auto-extracted VERBATIM from the owner\'s 2025 Ilco reference PDF and\n' +
  '   validated against known vehicles (MKZ / Silverado / F-150 match the prior trusted data).\n' +
  '   Surfaced by the Start-a-Job lookup via codeSeriesFor(). ' + d.length + ' vehicles. */\n' +
  'window.TKS_ILCO_2025=[\n' + lines.join(',\n') + '\n];\n';
fs.writeFileSync('bittings-app/app/ilco-2025.js', js);
console.log('wrote app/ilco-2025.js: ' + (js.length / 1024 | 0) + 'KB, ' + d.length + ' vehicles');

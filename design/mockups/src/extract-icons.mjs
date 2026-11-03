// Extract lucide icon nodes (lucide-react 1.63.0) used by the mockups into icons.json
import fs from 'fs';
const dir = process.argv[2] || '/workspace/eui-fe/node_modules/lucide-react/dist/esm/icons';
const names = ['user','eye','layout-dashboard','folder-git-2','square-code','monitor-cog','git-branch','workflow','rocket','activity','bell','shield','chevron-right','chevron-down','chevron-left','search','circle-question-mark','menu','refresh-cw','plus','ellipsis','circle-check','triangle-alert','circle-x','info','folder-plus','x','loader-circle','file','box','server','folder','git-commit-horizontal','log-out','settings','users','panel-left-close','play','external-link','sliders-horizontal','list','layout-grid','trending-up','trending-down','check','file-code','braces','git-merge','key-round','user-cog','monitor','lock','circle-alert','arrow-up-down','code-xml','share-2','trash','heart-pulse','rotate-ccw-clock','undo-2','clock'];
const out = {};
for (const n of names) {
  const p = `${dir}/${n}.mjs`;
  if (!fs.existsSync(p)) { console.error('missing', n); continue; }
  const mod = await import(p);
  const node = (mod.__iconData || {}).node;
  if (!node) { console.error('nodata', n); continue; }
  out[n] = node.map(([t, a]) => `<${t} ${Object.entries(a).filter(([k])=>k!=='key').map(([k,v])=>`${k}="${v}"`).join(' ')}/>`).join('');
}
fs.writeFileSync('icons.json', JSON.stringify(out, null, 1));
console.log(Object.keys(out).length);

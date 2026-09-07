import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||'.';
const base='https://apps.laxmannepal.com.np/Nepali-Patro';
const urls=new Set(['/']);
// Only crawl deployable public pages. Data, build artifacts, demos and internal
// tooling must never become sitemap URLs.
const skip=new Set([
  'node_modules','.git','.github','scripts','_site','data','data-health','demo',
  'backend','cloudflare','docs','schemas','tests','vendor','whatsapp-bot'
]);
const aliases=new Set(['panchang','festivals','saait']);

function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(skip.has(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);
    else if(entry.name==='index.html'){
      const rel=path.relative(root,path.dirname(full)).replaceAll(path.sep,'/');
      const route=rel?`/${rel}/`:'/';
      if(!aliases.has(rel))urls.add(route);
    }
  }
}
walk(root);

const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].sort().map(u=>`  <url><loc>${base}${u}</loc></url>`).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(root,'sitemap.xml'),xml,'utf8');
console.log(`Generated sitemap with ${urls.size} public canonical URLs`);

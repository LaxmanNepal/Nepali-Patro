import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || '.';
const base = 'https://apps.laxmannepal.com.np/Nepali-Patro';
const urls = new Set(['/']);
const skip = new Set(['node_modules','.git','.github','scripts','_site']);

function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(skip.has(entry.name)) continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(full);
    else if(entry.name==='index.html'){
      let rel=path.relative(root,path.dirname(full)).replaceAll(path.sep,'/');
      urls.add(rel ? `/${rel}/` : '/');
    }
  }
}
walk(root);
const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].sort().map(u=>`  <url><loc>${base}${u}</loc></url>`).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(root,'sitemap.xml'),xml);
console.log(`Generated sitemap with ${urls.size} URLs`);

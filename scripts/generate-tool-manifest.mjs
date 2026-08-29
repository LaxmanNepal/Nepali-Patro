import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'data', 'tool-manifest.json');
const excluded = new Set(['assets','backend','blog','data','docs','js','css','scripts','partials','.github','Nepse']);
const meta = {
  'calendar/':['📅','पात्रो'], 'panchanga/':['☀️','पञ्चाङ्ग'], 'parba/':['🎉','पर्व'], 'saith/':['✨','साइत'],
  'rashifal/':['♈','राशिफल'], 'jyotish/':['🔱','ज्योतिष'], 'news/':['📰','समाचार'], 'live-tv/':['📺','लाइभ टिभी'],
  'forex/':['💱','विदेशी मुद्रा'], 'converter/':['⇄','मिति रूपान्तरण'], 'itihas-aaja/':['📜','आजको इतिहास'],
  'gold-price/':['🪙','सुनको मूल्य'], 'vegetables/':['🥦','तरकारी मूल्य'], 'interest-rate/':['📈','ब्याजदर'],
  'patro/':['🗓️','पात्रो'], 'Nepse/':['💹','NEPSE']
};
const dirs = fs.readdirSync(root, { withFileTypes:true }).filter(e=>e.isDirectory() && !excluded.has(e.name) && !e.name.startsWith('.'));
const tools = [];
for (const d of dirs) {
  const index = path.join(root,d.name,'index.html');
  if (!fs.existsSync(index)) continue;
  const key = `${d.name}/`;
  const m = meta[key] || ['🧰', d.name.replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase())];
  const html = fs.readFileSync(index,'utf8');
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || m[1]).replace(/\s+/g,' ').trim();
  tools.push({ id:d.name.toLowerCase(), path:key, icon:m[0], name:m[1], title, url:`${key}` });
}
tools.sort((a,b)=>a.name.localeCompare(b.name,'ne'));
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output, JSON.stringify({version:1,generatedAt:new Date().toISOString(),count:tools.length,tools},null,2)+'\n');
console.log(`Generated ${tools.length} tools -> ${output}`);

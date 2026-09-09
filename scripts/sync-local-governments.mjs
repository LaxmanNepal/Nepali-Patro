import fs from 'node:fs/promises';

const OUT='nepal-goverment/data/local-governments.js';
const BASE='https://www.mofaga.gov.np/index.php/local-contact?page=';
const pages=Array.from({length:51},(_,i)=>i+1);
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const esc=s=>String(s??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r?\n/g,' ');
const abs=u=>{try{return new URL(u,'https://www.mofaga.gov.np/').href}catch{return ''}};
function rows(html){
  const out=[];
  for(const tr of html.matchAll(/<tr[\\s\\S]*?<\\/tr>/gi)){
    const cells=[...tr[0].matchAll(/<(?:td|th)[^>]*>([\\s\\S]*?)<\\/(?:td|th)>/gi)].map(m=>clean(m[1].replace(/<[^>]+>/g,' ')));
    const hrefs=[...tr[0].matchAll(/href=["']([^"']+)["']/gi)].map(m=>abs(m[1])).filter(Boolean);
    if(cells.length<4) continue;
    const serial=(cells[0].match(/\\d+/)||[])[0];
    const website=hrefs.find(u=>/^https?:\\/\\//i.test(u)&&!u.includes('mofaga.gov.np'))||'';
    const email=(cells.join(' ').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/i)||[])[0]||'';
    const phone=(cells.join(' ').match(/(?:\\+?977[-\\s]?)?(?:0?9\\d{8}|0?1[-\\s]?\\d{6,8}|\\d{7,10})/)||[])[0]||'';
    if(!serial||!website) continue;
    const body=cells.slice(1).filter(x=>x&&!/^website$/i.test(x));
    const province=body[0]||'';
    const name=body[1]||'';
    const district=body[2]||'';
    const type=/महानगर|उप-महानगर|नगरपालिका|गाउँपालिका/.exec(name)?.[0]||'';
    out.push({serial:+serial,n:name,e:'',u:website,c:'स्थानीय सरकार',l:'local',p:'',district,type,k:`${name} ${district} ${province}`.trim(),email,phone});
  }
  return out;
}
const all=[];
for(const page of pages){
  const res=await fetch(BASE+page,{headers:{'user-agent':'Nepali-Patro-Government-Directory/1.0'}});
  if(!res.ok) throw new Error(`MoFAGA page ${page}: HTTP ${res.status}`);
  const html=await res.text();
  all.push(...rows(html));
  console.log(`page ${page}: ${rows(html).length}`);
}
const unique=[...new Map(all.map(x=>[x.u,x])).values()];
if(unique.length<700) throw new Error(`Safety stop: only ${unique.length} local websites parsed; refusing to overwrite dataset.`);
const payload={sourceUrl:'https://www.mofaga.gov.np/local-contact/',total:753,recordCount:unique.length,generatedAt:new Date().toISOString()};
const js=`// Generated from official MoFAGA local-government contact directory.\nwindow.GOVERNMENT_LOCAL_META=${JSON.stringify(payload)};\nwindow.GOVERNMENT_LOCAL_GOVERNMENTS=[\n${unique.map(x=>`{n:'${esc(x.n)}',e:'',u:'${esc(x.u)}',c:'स्थानीय सरकार',l:'local',p:'',district:'${esc(x.district)}',type:'${esc(x.type)}',k:'${esc(x.k)}',email:'${esc(x.email)}',phone:'${esc(x.phone)}'}`).join(',\n')}\n];\n`;
await fs.writeFile(OUT,js);
console.log(`Wrote ${unique.length} local governments to ${OUT}`);

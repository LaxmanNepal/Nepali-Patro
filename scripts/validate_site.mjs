import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('.');
const fail=[];
const need=p=>{if(!fs.existsSync(path.join(root,p)))fail.push(`Missing: ${p}`)};
const readJSON=p=>{try{return JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))}catch(e){fail.push(`Invalid JSON: ${p} (${e.message})`);return null}};

for(const p of ['index.html','css/main.css','js/app.js','js/news.js','js/title-routes.js','manifest.json','sw.js','package.json','package-lock.json'])need(p);
const routes=['patro','calendar','panchanga','panchang','parba','festivals','saith','saait','rashifal','news','converter'];
for(const r of routes)need(`${r}/index.html`);

const pkg=readJSON('package.json');
const lock=readJSON('package-lock.json');
if(pkg?.dependencies?.['nepali-calendar-panchang']!=='1.0.2')fail.push('Unexpected Panchang dependency version');
if(lock?.packages?.['']?.dependencies?.['nepali-calendar-panchang']!=='1.0.2')fail.push('Lockfile dependency mismatch');

const years=readJSON('data/years.json');
const conversion=readJSON('data/conversion-index.json');
if(!years)fail.push('data/years.json unavailable; run npm run generate first');
if(years){
  if(years.minYear!==2040||years.maxYear!==2100||years.years.length!==61)fail.push('Expected exactly BS 2040-2100');
  let total=0;
  for(const meta of years.years){
    const p=`data/calendar/${meta.year}.json`;
    const data=readJSON(p); if(!data)continue;
    if(data.year!==meta.year)fail.push(`Year payload mismatch: ${meta.year}`);
    if(data.days.length!==meta.days)fail.push(`Day count mismatch: ${meta.year}`);
    if(data.calendar?.monthLengths?.length!==12)fail.push(`Month metadata mismatch: ${meta.year}`);
    const bs=new Set(),ad=new Set();
    for(const d of data.days){
      const bk=`${d.bs?.year}-${d.bs?.month}-${d.bs?.day}`;
      if(bs.has(bk))fail.push(`Duplicate BS date: ${bk}`); bs.add(bk);
      if(ad.has(d.ad?.date))fail.push(`Duplicate AD date: ${d.ad?.date}`); ad.add(d.ad?.date);
      if(!d.bs?.year||!d.bs?.month||!d.bs?.day||!d.ad?.date||!d.weekday?.nepali)fail.push(`Incomplete day record: ${meta.year}`);
    }
    total+=data.days.length;
  }
  if(conversion && conversion.items?.length!==total)fail.push(`Conversion index count ${conversion.items?.length} != ${total}`);
  if(conversion){
    const bs=new Set(conversion.items.map(x=>x.bs)),ad=new Set(conversion.items.map(x=>x.ad));
    if(bs.size!==conversion.items.length)fail.push('Duplicate BS conversion index');
    if(ad.size!==conversion.items.length)fail.push('Duplicate AD conversion index');
  }
}

// Basic syntax checks are performed by the workflow with node --check; this
// script focuses on static structure and generated data integrity.
if(fail.length){
  console.error(fail.join('\n'));
  process.exit(1);
}
console.log('Nepali Patro static validation passed.');

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { bsToAd, adToBs } from 'nepali-calendar-panchang';

const root=path.resolve('.');
const fail=[];
const need=p=>{if(!fs.existsSync(path.join(root,p)))fail.push(`Missing: ${p}`)};
const readJSON=p=>{try{return JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))}catch(e){fail.push(`Invalid JSON: ${p} (${e.message})`);return null}};
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

for(const p of ['index.html','css/main.css','js/app.js','js/news.js','js/title-routes.js','js/route-compat.js','manifest.json','sw.js','package.json','package-lock.json'])need(p);
const routes=['patro','calendar','panchanga','parba','saith','rashifal','news','converter','itihas-aaja','gold-price'];
for(const r of routes)need(`${r}/index.html`);

const pkg=readJSON('package.json'),lock=readJSON('package-lock.json');
if(pkg?.dependencies?.['nepali-calendar-panchang']!=='1.0.2')fail.push('Unexpected Panchang dependency version');
if(lock?.packages?.['']?.dependencies?.['nepali-calendar-panchang']!=='1.0.2')fail.push('Lockfile dependency mismatch');

const years=readJSON('data/years.json'),conversion=readJSON('data/conversion-index.json');
if(!years)fail.push('data/years.json unavailable; run npm run generate first');

let allDays=[];
if(years){
  if(years.minYear!==2040||years.maxYear!==2100||years.years.length!==61)fail.push('Expected exactly BS 2040-2100');
  for(const meta of years.years){
    const p=`data/calendar/${meta.year}.json`,data=readJSON(p);if(!data)continue;
    if(data.year!==meta.year)fail.push(`Year payload mismatch: ${meta.year}`);
    if(data.days.length!==meta.days)fail.push(`Day count mismatch: ${meta.year}`);
    if(data.calendar?.monthLengths?.length!==12)fail.push(`Month metadata mismatch: ${meta.year}`);
    const bs=new Set(),ad=new Set();
    for(const d of data.days){
      const bk=`${d.bs?.year}-${d.bs?.month}-${d.bs?.day}`;
      if(bs.has(bk))fail.push(`Duplicate BS date: ${bk}`);bs.add(bk);
      if(ad.has(d.ad?.date))fail.push(`Duplicate AD date: ${d.ad?.date}`);ad.add(d.ad?.date);
      if(!d.bs?.year||!d.bs?.month||!d.bs?.day||!d.ad?.date||!d.weekday?.nepali)fail.push(`Incomplete day record: ${meta.year}`);
      allDays.push(d);
    }
  }
}

if(conversion){
  if(conversion.items?.length!==allDays.length)fail.push(`Conversion index count ${conversion.items?.length} != ${allDays.length}`);
  const bs=new Set(conversion.items.map(x=>x.bs)),ad=new Set(conversion.items.map(x=>x.ad));
  if(bs.size!==conversion.items.length)fail.push('Duplicate BS conversion index');
  if(ad.size!==conversion.items.length)fail.push('Duplicate AD conversion index');
}

// Round-trip converter tests across boundaries, leap-sensitive dates and random samples.
const samples=[[2040,1,1],[2050,12,30],[2060,5,15],[2070,10,10],[2083,5,10],[2099,12,30],[2100,12,30]];
for(const [y,m,d] of samples){
  try{
    const ad=bsToAd(y,m,d),back=adToBs(ad);
    const by=back?.year??back?.bsYear,bm=back?.month??back?.bsMonth,bd=back?.day??back?.bsDay;
    if(Number(by)!==y||Number(bm)!==m||Number(bd)!==d)fail.push(`BS round-trip failed: ${y}-${m}-${d}`);
  }catch(e){fail.push(`Converter test failed ${y}-${m}-${d}: ${e.message}`)}
}

// Standalone pages must not boot the homepage renderer. Every local CSS/JS/data URL must be absolute.
const expectedMarkers={
  patro:['पात्रो','section-pages.js'],calendar:['पूर्ण नेपाली पात्रो','section-pages.js'],panchanga:['विस्तृत पञ्चाङ्ग','section-pages.js'],
  parba:['पर्व तथा बिदा','section-pages.js'],saith:['साइत तथा शुभ दिन','section-pages.js'],rashifal:['राशिफल','rashifal-only.js'],news:['समाचार','news'],converter:['मिति रूपान्तरण','converter'],itihas-aaja:['इतिहास','history'], 'gold-price':['सुन','gold']
};
for(const r of routes){
  const p=`${r}/index.html`;if(!fs.existsSync(path.join(root,p)))continue;
  const html=read(p);
  if(/(?:src|href)=["'](?:\.\.?\/)?(?:css|js|data)\//i.test(html))fail.push(`Relative asset URL in ${p}`);
  if(/(?:src|href)=["'][^"']*js\/app\.js/i.test(html))fail.push(`Homepage app.js loaded by ${p}`);
  if(/(?:src|href)=["'][^"']*homepage-ui\.js/i.test(html))fail.push(`Homepage UI loaded by ${p}`);
  for(const marker of expectedMarkers[r]||[])if(!html.toLowerCase().includes(marker.toLowerCase()))fail.push(`Expected ${marker} missing in ${p}`);
}

// Compatibility aliases must redirect instead of cloning homepage content.
for(const [alias,target] of Object.entries({panchang:'panchanga',festivals:'parba',saait:'saith'})){
  const p=`${alias}/index.html`;if(fs.existsSync(path.join(root,p))){const h=read(p);if(!h.includes(`../${target}/`))fail.push(`Broken compatibility alias: ${alias}`);if(h.includes('js/app.js'))fail.push(`Alias ${alias} contains homepage app`);}}

if(fs.existsSync(path.join(root,'rashifal/index.html'))){const h=read('rashifal/index.html');if(!h.includes('js/rashifal-only.js'))fail.push('Rashifal dedicated engine missing');if(!h.includes('weekly'))fail.push('Rashifal weekly UI missing');}

// Syntax-check repository JavaScript files before deployment.
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git'].includes(ent.name))continue;const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else if(ent.isFile()&&p.endsWith('.js')){try{execFileSync(process.execPath,['--check',p],{stdio:'pipe'})}catch(e){fail.push(`JavaScript syntax error: ${path.relative(root,p)}`)}}}}
walk(root);

if(fail.length){console.error(fail.join('\n'));process.exit(1)}
console.log(`Nepali Patro validation passed: ${allDays.length} dates, 2040-2100 data, converter round-trips, isolated routes, aliases and JavaScript syntax.`);

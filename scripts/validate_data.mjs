import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('.');
const fail=[]; const warn=[];
const readJSON=p=>{try{return JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))}catch(e){fail.push(`Invalid JSON: ${p} (${e.message})`);return null}};
const years=readJSON('data/years.json');
if(!years){console.error(fail.join('\n'));process.exit(1)}
if(years.minYear!==2040||years.maxYear!==2100||years.years?.length!==61)fail.push('Calendar range must be exactly BS 2040-2100');
const required=['bs','ad','weekday','tithi','nakshatra','yoga','karana','sun','moon'];
for(const meta of years.years||[]){const p=`data/calendar/${meta.year}.json`;const data=readJSON(p);if(!data)continue;if(!Array.isArray(data.days)||data.days.length!==meta.days)fail.push(`BS ${meta.year}: invalid day count`);const seen=new Set();for(const d of data.days||[]){const key=`${d.bs?.year}-${d.bs?.month}-${d.bs?.day}`;if(seen.has(key))fail.push(`BS ${meta.year}: duplicate ${key}`);seen.add(key);for(const k of required)if(d[k]===undefined||d[k]===null)fail.push(`BS ${meta.year}: missing ${k} on ${key}`);if(!d.bs?.monthNepali||!d.weekday?.nepali)fail.push(`BS ${meta.year}: incomplete localized date ${key}`);if(!d.tithi?.name||!d.nakshatra?.name||!d.yoga?.name||!d.karana?.name)fail.push(`BS ${meta.year}: incomplete core panchanga ${key}`);
const optional={sunset:d.sun?.sunset,moonrise:d.moon?.rise,moonset:d.moon?.set,rahuKaal:d.rahuKaal};
for(const [name,value] of Object.entries(optional))if(value===null||value===undefined||String(value).trim()==='')warn.push(`BS ${meta.year}: optional astronomical field missing: ${name} on ${key}`);if(!d.ad?.date)fail.push(`BS ${meta.year}: missing AD date ${key}`)}}
const conversion=readJSON('data/conversion-index.json');if(conversion?.items){const bs=new Set(conversion.items.map(x=>x.bs));const ad=new Set(conversion.items.map(x=>x.ad));if(bs.size!==conversion.items.length||ad.size!==conversion.items.length)fail.push('Conversion index contains duplicates');}
const converter=readJSON('data/converter-index.json');if(!converter||converter.minBS>1970||converter.maxBS<2100||!Array.isArray(converter.items)||converter.items.length<40000)fail.push('Converter index does not cover 1970-2100');
const news=readJSON('feeds/news.json');if(!news||!Array.isArray(news.items)||!news.items.length)fail.push('feeds/news.json has no articles');else for(const [i,n] of news.items.entries())for(const k of ['title','description','imageUrl','sourceLogo','sourceName','publishedTime','articleUrl'])if(n[k]===undefined)fail.push(`feeds/news.json item ${i}: missing ${k}`);
const forex=readJSON('feeds/forex.json');if(!forex||forex.base!=='NPR'||!Array.isArray(forex.rates)||forex.rates.length<5)fail.push('feeds/forex.json is missing a valid NRB rate table');else {for(const [i,r] of forex.rates.entries()){for(const k of ['currency','name','unit','buy','sell'])if(r[k]===undefined)fail.push(`feeds/forex.json rate ${i}: missing ${k}`);if(!(Number(r.unit)>0))fail.push(`feeds/forex.json rate ${i}: invalid unit`);if(!Number.isFinite(Number(r.buy))||!Number.isFinite(Number(r.sell)))fail.push(`feeds/forex.json rate ${i}: invalid numeric rate`)}if(!forex.updatedAt)fail.push('feeds/forex.json: updatedAt missing');}
const gold=readJSON('feeds/gold_silver.json');if(!gold||!gold.gold||!gold.silver)fail.push('feeds/gold_silver.json is missing gold/silver');else {for(const k of ['gold','silver']){if(!gold[k].price||!gold[k].unit)fail.push(`feeds/gold_silver.json: ${k} price/unit missing`);if(!['up','down','flat'].includes(gold[k].trend))fail.push(`feeds/gold_silver.json: ${k} trend invalid`)}if(!gold.updatedAt)fail.push('feeds/gold_silver.json: updatedAt missing');}
const petroleum=readJSON('feeds/petroleum_prices.json');if(!petroleum)fail.push('feeds/petroleum_prices.json is missing');else {const latest=petroleum.latest||petroleum;for(const k of ['petrol','diesel']){const v=latest?.[k]?.price??latest?.[k];if(!Number.isFinite(Number(v)))fail.push(`feeds/petroleum_prices.json: ${k} price missing/non-numeric`)}if(!petroleum.updatedAt)fail.push('feeds/petroleum_prices.json: updatedAt missing');if(petroleum.history!==undefined&&!Array.isArray(petroleum.history))fail.push('feeds/petroleum_prices.json: history must be an array');}
const rashifalDir=path.join(root,'data/rashifal');
if(fs.existsSync(rashifalDir)){
  for(const p of fs.readdirSync(rashifalDir).filter(x=>/^\d{4}-\d{2}-\d{2}\.json$/.test(x))){
    const d=readJSON(`data/rashifal/${p}`); const signs=d?.signs;
    if(!d?.date||d.date!==p.slice(0,-5)) fail.push(`Rashifal ${p}: date mismatch`);
    if(!Array.isArray(signs)||signs.length!==12) fail.push(`Rashifal ${p}: expected 12 signs`);
    else {const ids=signs.map(x=>x.id);if(new Set(ids).size!==12)fail.push(`Rashifal ${p}: duplicate sign ids`);if(signs.some(x=>typeof x.prediction!=='string'||x.prediction.trim().length<40))fail.push(`Rashifal ${p}: invalid prediction text`);}
  }
}
const staleHours=iso=>{const t=Date.parse(iso||'');return Number.isFinite(t)?(Date.now()-t)/36e5:Infinity};
const monitored=[['forex',forex,72],['gold',gold,48],['petroleum',petroleum,72]];
for(const [name,data,max] of monitored){if(!data?.updatedAt){warn.push(`${name}: updatedAt is missing`);continue}const age=staleHours(data.updatedAt);if(age>max)warn.push(`${name}: data is stale (${Math.round(age)}h old)`);}
if(news?.updatedAt&&staleHours(news.updatedAt)>48)warn.push('feeds/news.json is older than 48 hours');
if(fail.length){console.error(fail.join('\n'));process.exit(1)}
const uniqueWarn=[...new Set(warn)];if(uniqueWarn.length)console.warn(uniqueWarn.join('\n'));
console.log(`Deep data validation passed: core calendar/Panchanga integrity, converter, news, gold/silver, petroleum, NRB forex and Rashifal archives verified. Optional astronomical fields are reported as warnings.`);
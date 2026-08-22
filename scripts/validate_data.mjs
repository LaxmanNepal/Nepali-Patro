import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('.');
const fail=[];
const readJSON=(p)=>{try{return JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))}catch(e){fail.push(`Invalid JSON: ${p} (${e.message})`);return null}};
const years=readJSON('data/years.json');
if(!years){console.error(fail.join('\n'));process.exit(1)}
if(years.minYear!==2040||years.maxYear!==2100||years.years?.length!==61)fail.push('Calendar range must be exactly BS 2040-2100');
const required=['bs','ad','weekday','tithi','nakshatra','yoga','karana','sun','moon'];
for(const meta of years.years||[]){const p=`data/calendar/${meta.year}.json`;const data=readJSON(p);if(!data)continue;if(!Array.isArray(data.days)||data.days.length!==meta.days)fail.push(`BS ${meta.year}: invalid day count`);const seen=new Set();for(const d of data.days||[]){const key=`${d.bs?.year}-${d.bs?.month}-${d.bs?.day}`;if(seen.has(key))fail.push(`BS ${meta.year}: duplicate ${key}`);seen.add(key);for(const k of required)if(d[k]===undefined||d[k]===null)fail.push(`BS ${meta.year}: missing ${k} on ${key}`);if(!d.bs?.monthNepali||!d.weekday?.nepali)fail.push(`BS ${meta.year}: incomplete localized date ${key}`);if(!d.tithi?.name||!d.nakshatra?.name||!d.yoga?.name||!d.karana?.name)fail.push(`BS ${meta.year}: incomplete panchanga ${key}`);if(!d.ad?.date)fail.push(`BS ${meta.year}: missing AD date ${key}`)} }
const conversion=readJSON('data/conversion-index.json');if(conversion?.items){const bs=new Set(conversion.items.map(x=>x.bs));const ad=new Set(conversion.items.map(x=>x.ad));if(bs.size!==conversion.items.length||ad.size!==conversion.items.length)fail.push('Conversion index contains duplicates');}
const converter=readJSON('data/converter-index.json');if(!converter||converter.minBS>1970||converter.maxBS<2100||!Array.isArray(converter.items)||converter.items.length<40000)fail.push('Converter index does not cover 1970-2100');
if(fail.length){console.error(fail.join('\n'));process.exit(1)}
console.log(`Deep data validation passed: ${years.years.length} years, BS 2040-2100, Panchanga fields present, converter coverage verified.`);
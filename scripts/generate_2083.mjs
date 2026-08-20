import fs from 'node:fs';
import path from 'node:path';
import { panchangAtSunrise } from '@grahan/vedic';

const YEAR = 2083;
const MONTHS = ['बैशाख','जेठ','असार','साउन','भदौ','असोज','कात्तिक','मंसिर','पुष','माघ','फागुन','चैत'];
const ROMAN = ['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
const LENGTHS = [31,31,32,31,31,30,31,29,30,29,30,30];
const SOURCE = 'https://raw.githubusercontent.com/S4NKALP/nepali-calendar-api/main/data/2083';
const OUT = path.resolve('data/calendar/2083.json');
const LAT = 27.7172, LON = 85.3240, TZ = 'Asia/Kathmandu';
const DEV = ['०','१','२','३','४','५','६','७','८','९'];
const np = n => String(n).replace(/\d/g, d => DEV[d]);
const pad = n => String(n).padStart(2,'0');
const iso = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
const dateAt = offset => { const d = new Date(Date.UTC(2026,3,14)); d.setUTCDate(d.getUTCDate()+offset); return d; };
const fmtTime = (d) => d ? new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(d)) : null;
const clean = v => String(v ?? '').replace(/\s+/g,' ').trim();

function localDateFromIso(s){ const [y,m,d]=s.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)); }
function parseAdMonth(meta){
  const match = String(meta.en||'').match(/([A-Z][a-z]{2})\/?([A-Z][a-z]{2})? (\d{4})/);
  if(!match) return null;
  const first = new Date(Date.parse(`${match[1]} 1, ${match[3]} UTC`));
  return first;
}

async function getJson(month){
  const r = await fetch(`${SOURCE}/${month}.json`);
  if(!r.ok) throw new Error(`source ${month}: HTTP ${r.status}`);
  return r.json();
}

function spanLabel(arr){
  if(!arr?.length) return null;
  const x=arr[0];
  return x.endsAt ? `${clean(x.name)}${x.endsAt ? `, ${fmtTime(x.endsAt)} सम्म` : ''}` : clean(x.name);
}

const all = [];
let offset = 0;
for(let m=1;m<=12;m++){
  const source = await getJson(m);
  const startOffset = offset;
  const sourceByAd = new Map();
  for(const item of (source.days||[])){
    if(!item.e) continue;
    const e = Number(item.e);
    const md = parseAdMonth(source.metadata||{});
    if(!md) continue;
    // Determine the actual Gregorian month from this BS month by looking at the generated month span.
    const first = dateAt(startOffset);
    let ad = new Date(first);
    for(let guard=0;guard<40;guard++){
      if(ad.getUTCDate()===e) break;
      ad.setUTCDate(ad.getUTCDate()+1);
    }
    if(ad.getUTCDate()===e) sourceByAd.set(iso(ad),item);
  }
  for(let d=1;d<=LENGTHS[m-1];d++){
    const ad = dateAt(startOffset+d-1);
    const key = iso(ad);
    let p;
    try {
      p = panchangAtSunrise({year:ad.getUTCFullYear(),month:ad.getUTCMonth()+1,day:ad.getUTCDate(),latitude:LAT,longitude:LON,timezone:TZ});
    } catch(err) {
      console.error(`Panchang failed ${key}:`,err.message);
      p = null;
    }
    const src = sourceByAd.get(key)||{};
    const first = arr => arr?.[0] || null;
    const t=first(p?.tithi), n=first(p?.nakshatra), y=first(p?.yoga), k=first(p?.karana);
    const item={
      bs:{year:YEAR,month:m,day:d,monthNepali:MONTHS[m-1],monthRoman:ROMAN[m-1],display:`${MONTHS[m-1]} ${np(d)}, ${np(YEAR)}`},
      ad:{date:key,year:ad.getUTCFullYear(),month:ad.getUTCMonth()+1,day:ad.getUTCDate()},
      weekday:{index:ad.getUTCDay(),nepali:['आइतबार','सोमबार','मंगलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'][ad.getUTCDay()]},
      tithi:{name:clean(t?.name)||clean(src.t),paksha:t?.paksha||null,end:fmtTime(t?.endsAt)},
      nakshatra:{name:clean(n?.name),pada:n?.pada??null,end:fmtTime(n?.endsAt)},
      yoga:{name:clean(y?.name),end:fmtTime(y?.endsAt)},
      karana:{name:clean(k?.name),end:fmtTime(k?.endsAt)},
      sun:{sunrise:fmtTime(p?.sunrise),sunset:fmtTime(p?.sunset)},
      rahuKaal:p?.rahuKaal?{start:fmtTime(p.rahuKaal.start),end:fmtTime(p.rahuKaal.end)}:null,
      moonPhase:p?.moonPhase?{name:p.moonPhase.phaseName,illuminated:p.moonPhase.illuminatedFraction}:null,
      festival:clean(src.f||''),
      holiday:Boolean(src.h),
      source:{calendar:'S4NKALP/nepali-calendar-api',panchang:'@grahan/vedic',location:'Kathmandu, Nepal'}
    };
    all.push(item);
  }
  offset += LENGTHS[m-1];
}

const payload={
  schemaVersion:2,year:YEAR,calendar:{start:'2026-04-14',end:'2027-04-13',days:365,monthLengths:LENGTHS},
  panchang:{latitude:LAT,longitude:LON,timezone:TZ,engine:'@grahan/vedic'},
  generatedAt:new Date().toISOString(),days:all
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2));
console.log(`Generated ${all.length} complete days -> ${OUT}`);

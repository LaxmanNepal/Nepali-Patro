import fs from 'node:fs';
import path from 'node:path';
import { getYear, bsToAd, daysInYear, MIN_BS_YEAR, MAX_BS_YEAR } from 'nepali-calendar-panchang';

const START=2040, END=2100;
const MONTHS=['बैशाख','जेठ','असार','साउन','भदौ','असोज','कात्तिक','मंसिर','पुष','माघ','फागुन','चैत'];
const ROMAN=['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
const WEEK=['आइतबार','सोमबार','मंगलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'];
const DEV=['०','१','२','३','४','५','६','७','८','९'];
const np=n=>String(n).replace(/\d/g,d=>DEV[d]);
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const toTime=v=>v==null||v===''?null:clean(v);

// The upstream package stores many astronomical values as strings such as
// "प्रतिपदा upto 21:45:50, उपरान्त: द्वितीया". Keep the human-readable value,
// but also expose the ending time and the next value for a structured UI.
function splitTimedValue(value){
  const s=clean(value);
  if(!s)return {name:'',end:null,after:null};
  const m=s.match(/^(.*?)\s+upto\s+([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)(?:,\s*उपरान्त:\s*(.*))?$/i);
  if(!m)return {name:s,end:null,after:null};
  return {name:clean(m[1]),end:m[2],after:clean(m[3])||null};
}

const root=path.resolve('data');
fs.mkdirSync(path.join(root,'calendar'),{recursive:true});
const index={schemaVersion:5,minYear:START,maxYear:END,years:[],adStart:null,adEnd:null,generatedAt:new Date().toISOString()};
const conversions=[];

for(let year=START;year<=END;year++){
  if(year<MIN_BS_YEAR||year>MAX_BS_YEAR) throw new Error(`Year ${year} outside engine range ${MIN_BS_YEAR}-${MAX_BS_YEAR}`);
  const source=getYear(year);
  const months=Array.isArray(source?.months)?source.months:Array.isArray(source)?source:[];
  if(months.length!==12) throw new Error(`BS ${year}: engine returned ${months.length} months`);
  const days=[];

  for(let mi=0;mi<12;mi++){
    const month=months[mi];
    if(!month) throw new Error(`BS ${year}: missing month ${mi+1}`);
    const rows=Array.isArray(month.days)?month.days:month;
    if(!Array.isArray(rows)||!rows.length) throw new Error(`BS ${year}: empty month ${mi+1}`);

    for(const raw of rows){
      const d=Number(raw.day??raw.d??raw.date);
      if(!Number.isInteger(d)||d<1||d>32) continue;
      const ad=bsToAd(year,mi+1,d);
      const adDate=iso(ad);
      const tithi=splitTimedValue(raw.tithi);
      const nakshatra=splitTimedValue(raw.nakshatra);
      const yoga=splitTimedValue(raw.yoga);
      const karana=splitTimedValue(raw.karana);
      const events=Array.isArray(raw.events)?raw.events.map(clean).filter(Boolean):[clean(raw.events||raw.event||raw.festival)].filter(Boolean);
      const item={
        bs:{year,month:mi+1,day:d,monthNepali:MONTHS[mi],monthRoman:ROMAN[mi],display:`${MONTHS[mi]} ${np(d)}, ${np(year)}`},
        ad:{date:adDate,year:ad.getUTCFullYear(),month:ad.getUTCMonth()+1,day:ad.getUTCDate()},
        weekday:{index:ad.getUTCDay(),nepali:clean(raw.weekday)||WEEK[ad.getUTCDay()]},
        nepalSambat:clean(raw.nepal_sambat||raw.nepalSambat),
        tithi:{name:tithi.name,paksha:clean(raw.paksha),end:tithi.end,after:tithi.after},
        nakshatra:{name:nakshatra.name,pada:raw.nakshatra_pada??raw.nakshatraPada??null,end:nakshatra.end,after:nakshatra.after},
        yoga:{name:yoga.name,end:yoga.end,after:yoga.after},
        karana:{name:karana.name,end:karana.end,after:karana.after},
        rashi:clean(raw.rashi),
        sun:{sunrise:toTime(raw.sunrise_npt||raw.sunrise),sunset:toTime(raw.sunset_npt||raw.sunset)},
        moon:{rise:toTime(raw.moonrise_npt||raw.moonrise),set:toTime(raw.moonset_npt||raw.moonset),phase:clean(raw.moon_phase||raw.moonPhase)},
        rahuKaal:raw.rahu_kaal||raw.rahuKaal||null,
        festival:events.join(' / '),events,
        holiday:Boolean(raw.holiday||raw.is_holiday||raw.h),
        source:{provider:'nepali-calendar-panchang',license:'MIT',method:'precomputed astronomical dataset'}
      };
      days.push(item);
      conversions.push({bs:`${year}-${pad(mi+1)}-${pad(d)}`,year,month:mi+1,day:d,ad:adDate});
    }
  }

  const unique=[...new Map(days.map(x=>[x.ad.date,x])).values()].sort((a,b)=>a.ad.date.localeCompare(b.ad.date));
  const expected=daysInYear(year);
  if(unique.length!==expected) throw new Error(`BS ${year}: expected ${expected} days, generated ${unique.length}`);
  const bsKeys=new Set(unique.map(x=>`${x.bs.year}-${x.bs.month}-${x.bs.day}`));
  if(bsKeys.size!==unique.length) throw new Error(`BS ${year}: duplicate BS date`);
  const monthLengths=Array.from({length:12},(_,i)=>unique.filter(x=>x.bs.month===i+1).length);
  if(monthLengths.some(v=>v<28||v>32)) throw new Error(`BS ${year}: invalid month length ${monthLengths}`);
  const payload={schemaVersion:5,year,calendar:{start:unique[0].ad.date,end:unique.at(-1).ad.date,days:unique.length,monthLengths},panchang:{provider:'nepali-calendar-panchang',license:'MIT',location:'Nepal'},generatedAt:new Date().toISOString(),days:unique};
  fs.writeFileSync(path.join(root,'calendar',`${year}.json`),JSON.stringify(payload));
  index.years.push({year,days:unique.length,start:payload.calendar.start,end:payload.calendar.end,monthLengths});
  if(!index.adStart||payload.calendar.start<index.adStart)index.adStart=payload.calendar.start;
  if(!index.adEnd||payload.calendar.end>index.adEnd)index.adEnd=payload.calendar.end;
}

conversions.sort((a,b)=>a.ad.localeCompare(b.ad));
if(new Set(conversions.map(x=>x.bs)).size!==conversions.length) throw new Error('Duplicate BS conversion keys');
if(new Set(conversions.map(x=>x.ad)).size!==conversions.length) throw new Error('Duplicate AD conversion keys');
fs.writeFileSync(path.join(root,'years.json'),JSON.stringify(index,null,2));
fs.writeFileSync(path.join(root,'conversion-index.json'),JSON.stringify({schemaVersion:2,minBS:START,maxBS:END,adStart:index.adStart,adEnd:index.adEnd,items:conversions},null,2));
console.log(`Generated BS ${START}-${END}: ${index.years.length} years, ${conversions.length} dates (${index.adStart} -> ${index.adEnd}).`);

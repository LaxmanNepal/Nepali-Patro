import fs from 'node:fs';
import path from 'node:path';
import { getYear, bsToAd } from 'nepali-calendar-panchang';

const YEAR=2083;
const MONTHS=['बैशाख','जेठ','असार','साउन','भदौ','असोज','कात्तिक','मंसिर','पुष','माघ','फागुन','चैत'];
const ROMAN=['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
const OUT=path.resolve('data/calendar/2083.json');
const DEV=['०','१','२','३','४','५','६','७','८','९'];
const np=n=>String(n).replace(/\d/g,d=>DEV[d]);
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const time=v=>v?clean(v):null;
const source=getYear(YEAR);
const months=Array.isArray(source?.months)?source.months:Array.isArray(source)?source:[];
const days=[];
for(let mi=0;mi<months.length;mi++){
  const month=months[mi]; const rows=month.days||month;
  for(const raw of rows){
    const d=Number(raw.day ?? raw.d ?? raw.date); if(!d||d<1||d>32)continue;
    const ad=bsToAd(YEAR,mi+1,d); const date=iso(ad);
    days.push({
      bs:{year:YEAR,month:mi+1,day:d,monthNepali:MONTHS[mi],monthRoman:ROMAN[mi],display:`${MONTHS[mi]} ${np(d)}, ${np(YEAR)}`},
      ad:{date,year:ad.getUTCFullYear(),month:ad.getUTCMonth()+1,day:ad.getUTCDate()},
      weekday:{index:ad.getUTCDay(),nepali:raw.weekday||['आइतबार','सोमबार','मंगलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'][ad.getUTCDay()]},
      nepalSambat:clean(raw.nepal_sambat||raw.nepalSambat),
      tithi:{name:clean(raw.tithi),paksha:clean(raw.paksha),end:null},
      nakshatra:{name:clean(raw.nakshatra),pada:null,end:null},
      yoga:{name:clean(raw.yoga),end:null},
      karana:{name:clean(raw.karana),end:null},
      rashi:clean(raw.rashi),
      sun:{sunrise:time(raw.sunrise),sunset:time(raw.sunset)},
      moon:{rise:time(raw.moonrise),set:time(raw.moonset),phase:clean(raw.moon_phase||raw.moonPhase)},
      rahuKaal:raw.rahu_kaal||raw.rahuKaal||null,
      festival:Array.isArray(raw.events)?raw.events.map(clean).filter(Boolean).join(' / '):clean(raw.events||raw.event||raw.festival),
      holiday:Boolean(raw.holiday||raw.is_holiday||raw.h),
      source:{provider:'nepali-calendar-panchang',license:'MIT',method:'precomputed astronomical dataset'}
    });
  }
}
const unique=[...new Map(days.map(x=>[x.ad.date,x])).values()].sort((a,b)=>a.ad.date.localeCompare(b.ad.date));
if(unique.length!==365)throw new Error(`Expected 365 unique days for BS 2083, got ${unique.length}`);
const lengths=[];for(let m=1;m<=12;m++)lengths.push(unique.filter(x=>x.bs.month===m).length);
const payload={schemaVersion:3,year:YEAR,calendar:{start:unique[0].ad.date,end:unique.at(-1).ad.date,days:unique.length,monthLengths:lengths},panchang:{provider:'nepali-calendar-panchang',license:'MIT',location:'Nepal dataset'},generatedAt:new Date().toISOString(),days:unique};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2));console.log(`Generated ${unique.length} complete 2083 days`);

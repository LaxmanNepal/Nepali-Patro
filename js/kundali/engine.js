/* Nepali Patro Kundali engine — clean-room browser implementation.
 * Uses Astronomy Engine for astronomical positions and derives Vedic sidereal
 * values with Lahiri-style ayanamsa, whole-sign houses, Navamsa and Vimshottari.
 * No source code is copied from nepdate-web.
 */
(function(){'use strict';
  const A=window.Astronomy;
  if(!A) throw new Error('Astronomy Engine not loaded');
  const SIGNS=['मेष','वृषभ','मिथुन','कर्कट','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];
  const SIGN_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const NAK=['अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा','पुनर्वसु','पुष्य','आश्लेषा','मघा','पूर्वाफाल्गुनी','उत्तराफाल्गुनी','हस्त','चित्रा','स्वाती','विशाखा','अनुराधा','ज्येष्ठा','मूल','पूर्वाषाढा','उत्तराषाढा','श्रवण','धनिष्ठा','शतभिषा','पूर्वभाद्रपदा','उत्तरभाद्रपदा','रेवती'];
  const NAK_LORD=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
  const DASHA_YEARS={Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17};
  const ORDER=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
  const PLANETS=[['Sun','सूर्य','SUN'],['Moon','चन्द्र','MOON'],['Mars','मंगल','MARS'],['Mercury','बुध','MERCURY'],['Jupiter','गुरु','JUPITER'],['Venus','शुक्र','VENUS'],['Saturn','शनि','SATURN'],['Rahu','राहु',null],['Ketu','केतु',null]];
  const DAYS=['आइतबार','सोमबार','मंगलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'];
  const pad=(n,l=2)=>String(n).padStart(l,'0');
  const norm=x=>((x%360)+360)%360;
  const d2d=x=>x*Math.PI/180;
  const dms=x=>{x=norm(x);const d=Math.floor(x),m=Math.floor((x-d)*60),s=Math.round((((x-d)*60)-m)*60);return `${d}° ${pad(m)}′ ${pad(s)}″`};
  const np=x=>String(x).replace(/\d/g,d=>'०१२३४५६७८९'[d]);
  const nakInfo=lon=>{const n=norm(lon)/13.333333333333334;const i=Math.floor(n);const pada=Math.floor((n-i)*4)+1;return {index:i,name:NAK[i],pada,degree:norm(lon)%13.333333333333334};};
  const ayanamsa=year=>23.85305556+0.013968*(year-2000); // Lahiri-style approximation.
  function tropLon(body,date){if(body==='MOON')return A.EclipticGeoMoon(date).lon;return A.EclipticLongitude(body,date);}
  function sidLon(body,date,ayan){return norm(tropLon(body,date)-ayan);}
  function nodeLon(date,ayan){const jd=A.MakeTime(date).date; const T=(jd-2451545.0)/36525; const om=125.04452-1934.136261*T+0.0020708*T*T+T*T*T/450000;return norm(om-ayan);}
  function speed(body,date,ayan){const t=new Date(date.getTime()+86400000);return norm(sidLon(body,t,ayan)-sidLon(body,date,ayan));}
  function retro(body,date,ayan){const t1=new Date(date.getTime()-43200000),t2=new Date(date.getTime()+43200000);let d=norm(sidLon(body,t2,ayan)-sidLon(body,t1,ayan));if(d>180)d-=360;return d<0}
  function siderealTime(date,lon){return A.SiderealTime(date)+lon/15;}
  function ascendant(date,lat,lon,ayan){const eps=23.439291;const th=d2d(norm(siderealTime(date,lon,0)*15));const ph=d2d(lat),ep=d2d(eps);const lam=Math.atan2(-Math.cos(th),Math.sin(th)*Math.cos(ep)+Math.tan(ph)*Math.sin(ep))*180/Math.PI;return norm(lam-ayan);}
  function houseFor(lon,asc){return Math.floor(norm(lon-asc)/30)+1}
  function navamsa(lon){const sign=Math.floor(norm(lon)/30),part=Math.floor((norm(lon)%30)/(10/3));const start=sign%3===0?sign:sign%3===1?norm(sign+8)%12:norm(sign+4)%12;return norm((start+part)*30+((norm(lon)%30)%(10/3))/(10/3)*30);}
  function toAdFromBS(bsYear,bsMonth,bsDay){return fetch(`/Nepali-Patro/data/calendar/${bsYear}.json`).then(r=>{if(!r.ok)throw new Error('BS year data unavailable');return r.json()}).then(d=>{const x=d.days.find(v=>v.bs.month===bsMonth&&v.bs.day===bsDay);if(!x)throw new Error('BS date unavailable');return x.ad.date;});}
  function toBSFromAD(date){const y=new Date(date).getUTCFullYear();return fetch(`/Nepali-Patro/data/calendar/${y-56}.json`).then(r=>r.ok?r.json():null).then(async d=>{const candidates=[d,y-55,y-56,y-57];for(const c of candidates){const data=typeof c==='object'?c:await fetch(`/Nepali-Patro/data/calendar/${c}.json`).then(r=>r.ok?r.json():null).catch(()=>null);const x=data?.days?.find(v=>v.ad.date===date);if(x)return x.bs;}throw new Error('AD date outside local BS dataset');});}
  function planetRows(date,lat,lon,ayan){const rows=PLANETS.map(([id,name,body])=>{let longitude,retrograde=false;if(id==='Rahu')longitude=nodeLon(date,ayan);else if(id==='Ketu')longitude=norm(nodeLon(date,ayan)+180);else{longitude=sidLon(body,date,ayan);retrograde=!['Sun','Moon'].includes(id)&&retro(body,date,ayan);}const sign=Math.floor(longitude/30);const n=nakInfo(longitude);return {id,name,body,longitude,degree:longitude%30,sign,signName:SIGNS[sign],nakshatra:n.name,nakIndex:n.index,pada:n.pada,house:houseFor(longitude,0),retrograde,navamsa:Math.floor(navamsa(longitude)/30),speed:body?speed(body,date,ayan):0};});return rows;}
  function dashas(birth,moonLon){const n=nakInfo(moonLon),lord=NAK_LORD[n.index%9],remaining=(13.333333333333334-n.degree)/13.333333333333334;let idx=ORDER.indexOf(lord),start=new Date(birth),out=[];for(let cycle=0;cycle<3;cycle++){for(let k=0;k<9;k++){const l=ORDER[(idx+k)%9],years=DASHA_YEARS[l]*(cycle===0&&k===0?remaining:1),end=new Date(start.getTime()+years*365.2425*86400000);out.push({lord:l,start:new Date(start),end,years});start=end;}idx=0;}return out;}
  function antardashas(md){const out=[];let start=md.start,idx=ORDER.indexOf(md.lord);for(let k=0;k<9;k++){const l=ORDER[(idx+k)%9],days=md.years*DASHA_YEARS[l]/120*365.2425;const end=new Date(start.getTime()+days*86400000);out.push({lord:l,start:new Date(start),end});start=end;}return out;}
  function panchang(date,lat,lon,ayan,moonLon,sunLon){const elong=norm(moonLon-sunLon);const tithi=Math.floor(elong/12)+1;const paksha=tithi<=15?'शुक्ल पक्ष':'कृष्ण पक्ष';const n=nakInfo(moonLon);const yoga=Math.floor(norm(moonLon+sunLon)/13.333333333333334)+1;const karana=Math.floor(elong/6)+1;return {vara:DAYS[date.getUTCDay()],tithi,paksha,nakshatra:n.name,pada:n.pada,yoga,karana,sunSign:SIGNS[Math.floor(sunLon/30)],moonSign:SIGNS[Math.floor(moonLon/30)]};}
  async function calculate(input){const date=new Date(input.iso);if(Number.isNaN(date.getTime()))throw new Error('Invalid birth date/time');const year=date.getUTCFullYear(),ayan=ayanamsa(year);const sun=sidLon('SUN',date,ayan),moon=sidLon('MOON',date,ayan);const asc=ascendant(date,input.lat,input.lon,ayan);const planets=planetRows(date,input.lat,input.lon,ayan);planets.forEach(p=>p.house=houseFor(p.longitude,asc));const ascNak=nakInfo(asc);const houses=Array.from({length:12},(_,i)=>({house:i+1,sign:(Math.floor(asc/30)+i)%12,signName:SIGNS[(Math.floor(asc/30)+i)%12],lord:['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'][(Math.floor(asc/30)+i)%12],planets:planets.filter(p=>p.house===i+1).map(p=>p.id)}));const moonP=planets.find(p=>p.id==='Moon');const dasha=dashas(date,moon);dasha.forEach(x=>x.antardasha=antardashas(x));const now=new Date();const active=dasha.find(x=>now>=x.start&&now<x.end)||dasha[0];const bs=await toBSFromAD(date.toISOString().slice(0,10)).catch(()=>null);return {input,date,ayanamsa:ayan,ascendant:{longitude:asc,degree:asc%30,sign:Math.floor(asc/30),signName:SIGNS[Math.floor(asc/30)],nakshatra:ascNak.name,pada:ascNak.pada},planets,houses,navamsa:planets.map(p=>({...p,navamsaSign:Math.floor(navamsa(p.longitude)/30),navamsaDegree:navamsa(p.longitude)%30})),panchang:panchang(date,input.lat,input.lon,ayan,moon,sun),dasha,activeDasha:active,bs};}
  window.NPKundali={calculate,toAdFromBS,toBSFromAD,SIGNS,SIGN_EN,NAK,DASHA_YEARS,ORDER,np,dms};
})();

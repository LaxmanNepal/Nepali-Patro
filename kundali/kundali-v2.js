import { SwissEphemeris, Planet, SiderealMode, CalculationFlag, LunarPoint, HouseSystem } from 'https://cdn.jsdelivr.net/npm/@swisseph/browser@1.3.1/+esm';

const $ = id => document.getElementById(id);
const SIGNS = ['मेष','वृष','मिथुन','कर्कट','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];
const NAKS = ['अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा','पुनर्वसु','पुष्य','आश्लेषा','मघा','पूर्वाफाल्गुनी','उत्तराफाल्गुनी','हस्त','चित्रा','स्वाती','विशाखा','अनुराधा','ज्येष्ठा','मूल','पूर्वाषाढा','उत्तराषाढा','श्रवण','धनिष्ठा','शतभिषा','पूर्वाभाद्रपदा','उत्तराभाद्रपदा','रेवती'];
const LORDS = ['केतु','शुक्र','सूर्य','चन्द्र','मंगल','राहु','गुरु','शनि','बुध'];
const GRAHAS = [['sun','सूर्य','☉',Planet.Sun],['moon','चन्द्र','☽',Planet.Moon],['mars','मंगल','♂',Planet.Mars],['mercury','बुध','☿',Planet.Mercury],['jupiter','गुरु','♃',Planet.Jupiter],['venus','शुक्र','♀',Planet.Venus],['saturn','शनि','♄',Planet.Saturn]];
const DIGITS = ['०','१','२','३','४','५','६','७','८','९'];
const nep = x => String(x).replace(/\d/g, d => DIGITS[d]);
const norm = x => ((x % 360) + 360) % 360;
const sign = x => Math.floor(norm(x) / 30);
const degree = x => norm(x) % 30;
const dms = x => { let d=degree(x), a=Math.floor(d), m=Math.floor((d-a)*60), s=Math.round(((((d-a)*60)-m)*60)); if(s===60){s=0;m++;} if(m===60){m=0;a++;} return `${nep(a)}° ${nep(m)}′ ${nep(s)}″`; };
const nak = x => { const q=360/27, i=Math.min(26,Math.floor(norm(x)/q)), p=Math.min(4,Math.floor((norm(x)%q)/(q/4))+1); return {name:NAKS[i],pada:p,lord:LORDS[i%9]}; };
const d9 = x => (sign(x)*9 + Math.min(8,Math.floor(degree(x)/(10/3)))) % 12;
let swe = null;
let ready = null;
let usingSwissFiles = false;
let last = null;

async function initEngine() {
  if (ready) return ready;
  ready = (async () => {
    const instance = new SwissEphemeris();
    await instance.init();
    swe = instance;

    // Moshier is built into the browser WASM and needs no network ephemeris
    // files. This keeps the Kundali usable even when CDN ephemeris downloads
    // are blocked, slow, or unavailable. Standard Swiss files are optional.
    $('engineState').textContent = '✓ गणना इन्जिन तयार';
    $('engineMeta').textContent = 'Swiss Ephemeris WASM · Moshier';

    // Try the higher-precision ephemeris in the background. Failure here must
    // never make the calculator unusable.
    try {
      await instance.loadStandardEphemeris();
      usingSwissFiles = true;
      $('engineMeta').textContent = 'Swiss Ephemeris · Standard ephemeris loaded';
    } catch (_) {
      usingSwissFiles = false;
    }
    return instance;
  })().catch(err => {
    ready = null;
    swe = null;
    $('engineState').textContent = '✕ इन्जिन लोड भएन';
    $('engineMeta').textContent = err?.message || String(err);
    throw err;
  });
  return ready;
}

const flags = () => {
  let f = CalculationFlag.Speed | CalculationFlag.Sidereal;
  if (usingSwissFiles) f |= CalculationFlag.SwissEphemeris;
  return f;
};
function siderealMode(){ const v=$('ayan').value; return v==='raman'?SiderealMode.Raman:v==='krishnamurti'?SiderealMode.Krishnamurti:SiderealMode.Lahiri; }
async function loadYear(y){ const r=await fetch(`../data/calendar/${y}.json`,{cache:'force-cache'}); if(!r.ok) throw Error(`BS ${y} calendar data भेटिएन।`); return (await r.json()).days || []; }
async function bsToAd(y,m,d){ const row=(await loadYear(y)).find(x=>x.bs?.year===y&&x.bs?.month===m&&x.bs?.day===d); if(!row) throw Error('दिइएको BS मिति calendar data मा भेटिएन।'); return row.ad.date; }
function input(){ const y=+$('year').value,m=+$('month').value,d=+$('day').value,[hh,mm]=($('time').value||'12:00').split(':').map(Number); const x={name:$('name').value.trim()||'जन्मकुण्डली',cal:$('calendar').value,y,m,d,hh,mm,place:$('place').value.trim(),lat:+$('lat').value,lon:+$('lon').value,tz:+$('tz').value}; if(!y||!m||!d||!Number.isFinite(x.lat)||!Number.isFinite(x.lon)||!Number.isFinite(x.tz)) throw Error('मिति, समय, latitude, longitude र UTC offset जाँच गर्नुहोस्।'); if(x.lat<-90||x.lat>90||x.lon<-180||x.lon>180||x.tz<-14||x.tz>14) throw Error('स्थान वा UTC offset को मान अमान्य छ।'); return x; }
async function birthDate(x){ let {y,m,d}=x; if(x.cal==='bs'){ const ad=await bsToAd(y,m,d); [y,m,d]=ad.split('-').map(Number); } return {date:new Date(Date.UTC(y,m-1,d,x.hh,x.mm)-x.tz*3600000),ad:`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}; }
function planet(jd,body){ const p=swe.calculatePosition(jd,body,flags()); return {longitude:norm(p.longitude),latitude:p.latitude,speed:p.longitudeSpeed,retrograde:p.longitudeSpeed<0}; }
function calculate(x,jd){ swe.setSiderealMode(siderealMode()); const planets={}; for(const [id,name,symbol,body] of GRAHAS) planets[id]={id,name,symbol,body,...planet(jd,body)}; const node=swe.calculatePosition(jd,$('nodes').value==='true'?LunarPoint.TrueNode:LunarPoint.MeanNode,flags()); const rahu=norm(node.longitude),ketu=norm(rahu+180); planets.rahu={id:'rahu',name:'राहु',symbol:'☊',longitude:rahu,latitude:node.latitude,speed:node.longitudeSpeed,retrograde:node.longitudeSpeed<0}; planets.ketu={id:'ketu',name:'केतु',symbol:'☋',longitude:ketu,latitude:-node.latitude,speed:-node.longitudeSpeed,retrograde:node.longitudeSpeed>0}; const hs=swe.calculateHouses(jd,x.lat,x.lon,HouseSystem.WholeSign),asc=norm(hs.ascendant),ascSign=sign(asc); Object.values(planets).forEach(p=>{p.sign=sign(p.longitude);p.degree=degree(p.longitude);p.house=((p.sign-ascSign+12)%12)+1;p.nak=nak(p.longitude);p.d9=d9(p.longitude);}); return {planets,asc,ascSign,jd,date:x,ayan:swe.getAyanamsa(jd)}; }
function chart(c){ const hp=Array.from({length:12},()=>[]); Object.values(c.planets).forEach(p=>hp[p.house-1].push(p.symbol)); const pos=[[250,105],[395,170],[395,330],[250,395],[105,330],[105,170],[250,180],[320,250],[250,320],[180,250],[110,110],[390,110]]; let s='<svg viewBox="0 0 500 500" role="img" aria-label="D1 जन्म कुण्डली"><rect x="25" y="25" width="450" height="450" fill="none" stroke="currentColor" stroke-width="2"/><path d="M25 25L475 475M475 25L25 475M25 250H475M250 25V475M25 250L250 25L475 250L250 475Z" fill="none" stroke="currentColor" stroke-width="1.7"/>'; for(let h=1;h<=12;h++){const [x,y]=pos[h-1],sg=(c.ascSign+h-1)%12;s+=`<text x="${x}" y="${y-16}" text-anchor="middle" font-size="12">${h} · ${SIGNS[sg]}</text><text x="${x}" y="${y+10}" text-anchor="middle" font-size="20" font-weight="700">${hp[h-1].join(' ')||'·'}</text>`;} return s+'</svg>'; }
function planetTable(c){ return `<div class="table-wrap"><table class="data-table"><thead><tr><th>ग्रह</th><th>राशि</th><th>अंश</th><th>नक्षत्र</th><th>भाव</th><th>D9</th><th>गति</th></tr></thead><tbody>${Object.values(c.planets).map(p=>`<tr><td>${p.symbol} ${p.name}</td><td>${SIGNS[p.sign]}</td><td>${dms(p.longitude)}</td><td>${p.nak.name} · पाद ${nep(p.nak.pada)}</td><td>${nep(p.house)}</td><td>${SIGNS[p.d9]}</td><td>${p.retrograde?'वक्री':'मार्गी'}</td></tr>`).join('')}</tbody></table></div>`; }
function render(c,ad){ const moon=c.planets.moon; $('results').hidden=false; $('personTitle').textContent=c.date.name; $('birthSummary').textContent=`${ad} · ${String(c.date.hh).padStart(2,'0')}:${String(c.date.mm).padStart(2,'0')} · ${c.date.place}`; $('method').innerHTML=[`Sidereal`,`अयनांश: ${$('ayan').selectedOptions[0].text}`,`भाव: Whole Sign`,`Node: ${$('nodes').selectedOptions[0].text}`,usingSwissFiles?'Swiss files':'Moshier fallback',`JD: ${c.jd.toFixed(5)}`].map(v=>`<span>${v}</span>`).join(''); $('chart').innerHTML=chart(c); $('facts').innerHTML=[['लग्न',`${SIGNS[c.ascSign]} · ${dms(c.asc)}`],['चन्द्र राशि',SIGNS[moon.sign]],['जन्म नक्षत्र',`${moon.nak.name} · पाद ${nep(moon.nak.pada)}`],['नक्षत्र स्वामी',moon.nak.lord],['सूर्य राशि',SIGNS[c.planets.sun.sign]],['राहु',`${SIGNS[c.planets.rahu.sign]} · ${dms(c.planets.rahu.longitude)}`],['केतु',`${SIGNS[c.planets.ketu.sign]} · ${dms(c.planets.ketu.longitude)}`]].map(([a,b])=>`<div class="fact"><small>${a}</small><b>${b}</b></div>`).join(''); $('tabContent').innerHTML=planetTable(c); last={core:c,ad}; }
function tab(name){ if(!last)return; const c=last.core; if(name==='planets') $('tabContent').innerHTML=planetTable(c); else if(name==='houses') $('tabContent').innerHTML=`<div class="houses-grid">${Array.from({length:12},(_,i)=>`<article><b>भाव ${nep(i+1)}</b><strong>${SIGNS[(c.ascSign+i)%12]}</strong><p>${Object.values(c.planets).filter(p=>p.house===i+1).map(p=>p.symbol+' '+p.name).join(' · ')||'—'}</p></article>`).join('')}</div>`; else if(name==='nakshatra') $('tabContent').innerHTML=`<div class="table-wrap"><table class="data-table"><thead><tr><th>ग्रह</th><th>नक्षत्र</th><th>पाद</th><th>स्वामी</th></tr></thead><tbody>${Object.values(c.planets).map(p=>`<tr><td>${p.symbol} ${p.name}</td><td>${p.nak.name}</td><td>${nep(p.nak.pada)}</td><td>${p.nak.lord}</td></tr>`).join('')}</tbody></table></div>`; else if(name==='navamsa') $('tabContent').innerHTML=`<div class="houses-grid">${Array.from({length:12},(_,i)=>`<article><b>${SIGNS[i]}</b><strong>D9</strong><p>${Object.values(c.planets).filter(p=>p.d9===i).map(p=>p.symbol+' '+p.name).join(' · ')||'—'}</p></article>`).join('')}</div>`; else if(name==='points') $('tabContent').innerHTML=`<div class="point-grid"><div><b>लग्न</b><strong>${SIGNS[c.ascSign]} ${dms(c.asc)}</strong></div><div><b>राहु</b><strong>${SIGNS[c.planets.rahu.sign]} ${dms(c.planets.rahu.longitude)}</strong></div><div><b>केतु</b><strong>${SIGNS[c.planets.ketu.sign]} ${dms(c.planets.ketu.longitude)}</strong></div></div>`; else if(name==='panchanga') $('tabContent').innerHTML=`<div class="point-grid"><div><b>AD मिति</b><strong>${last.ad}</strong></div><div><b>समय</b><strong>${String(c.date.hh).padStart(2,'0')}:${String(c.date.mm).padStart(2,'0')}</strong></div><div><b>स्थान</b><strong>${c.date.place}</strong></div></div>`; else if(name==='dasha'){const moonLon=c.planets.moon.longitude,span=360/27,idx=Math.floor(moonLon/span),fraction=(moonLon%span)/span,order=['केतु','शुक्र','सूर्य','चन्द्र','मंगल','राहु','गुरु','शनि','बुध'],years={केतु:7,शुक्र:20,सूर्य:6,चन्द्र:10,मंगल:7,राहु:18,गुरु:16,शनि:19,बुध:17};const first=order[idx%9],remaining=years[first]*(1-fraction);$('tabContent').innerHTML=`<div class="point-grid"><div><b>पहिलो महादशा</b><strong>${first}</strong></div><div><b>जन्ममा बाँकी अवधि</b><strong>${remaining.toFixed(2)} वर्ष</strong></div><div><b>नक्षत्र</b><strong>${c.planets.moon.nak.name}</strong></div></div>`;} else $('tabContent').innerHTML='<div class="notice">Swiss Ephemeris sidereal calculation. महत्वपूर्ण निर्णयका लागि विशेषज्ञसँग cross-check गर्नुहोस्।'; }
async function generate(){ const b=$('generate');b.disabled=true;$('error').hidden=true;try{await initEngine();const x=input(),bd=await birthDate(x),jd=swe.dateToJulianDay(bd.date);render(calculate(x,jd),bd.ad);}catch(e){$('error').hidden=false;$('error').textContent=e?.message||String(e);}finally{b.disabled=false;} }
$('generate').addEventListener('click',generate);
$('sample').addEventListener('click',()=>{$('name').value='लक्ष्मण नेपाल';$('calendar').value='ad';$('year').value='2002';$('month').value='3';$('day').value='18';$('time').value='12:00';$('place').value='Kathmandu, Nepal';$('lat').value='27.7172';$('lon').value='85.3240';$('tz').value='5.75';});
$('print').onclick=()=>window.print();
$('save').onclick=()=>{if(last)localStorage.setItem('nepali-patro-kundali',JSON.stringify({input:input(),ad:last.ad,savedAt:new Date().toISOString()}));};
$('downloadChart').onclick=()=>{if(!last)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([chart(last.core)],{type:'image/svg+xml'}));a.download='kundali-d1.svg';a.click();};
$('tabs').onclick=e=>{const b=e.target.closest('.tab');if(!b)return;document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');tab(b.dataset.tab);};
$('theme').onclick=()=>document.body.classList.toggle('dark');
initEngine().catch(()=>{});

import { SwissEphemeris, Planet, HouseSystem, SiderealMode, CalculationFlag, LunarPoint } from 'https://esm.unpkg.com/@swisseph/browser@1.3.1';

const $=id=>document.getElementById(id);
const SIGNS=['मेष','वृष','मिथुन','कर्कट','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];
const SIGN_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const GRAHAS=[
 ['sun','सूर्य','☉',Planet.Sun],['moon','चन्द्र','☽',Planet.Moon],['mars','मंगल','♂',Planet.Mars],['mercury','बुध','☿',Planet.Mercury],['jupiter','गुरु','♃',Planet.Jupiter],['venus','शुक्र','♀',Planet.Venus],['saturn','शनि','♄',Planet.Saturn]
];
const NUM=['०','१','२','३','४','५','६','७','८','९'];
const nep=n=>String(n).replace(/\d/g,d=>NUM[d]);
const norm=x=>((x%360)+360)%360;
const signOf=x=>Math.floor(norm(x)/30);
const degInSign=x=>norm(x)%30;
const dms=x=>{x=norm(x);const d=Math.floor(x),m=Math.floor((x-d)*60),s=Math.round((((x-d)*60)-m)*60);return `${nep(d)}° ${nep(m)}′ ${nep(Math.max(0,s))}″`};
const nakNames=['अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा','पुनर्वसु','पुष्य','आश्लेषा','मघा','पूर्वाफाल्गुनी','उत्तराफाल्गुनी','हस्त','चित्रा','स्वाती','विशाखा','अनुराधा','ज्येष्ठा','मूल','पूर्वाषाढा','उत्तराषाढा','श्रवण','धनिष्ठा','शतभिषा','पूर्वाभाद्रपदा','उत्तराभाद्रपदा','रेवती'];
const nakLords=['केतु','शुक्र','सूर्य','चन्द्र','मंगल','राहु','गुरु','शनि','बुध'];
const nakshatra=lon=>{const p=norm(lon)/(360/27);const i=Math.floor(p);const pada=Math.floor((p-i)*4)+1;return {name:nakNames[i],index:i,pada,lord:nakLords[i%9]}};
const planetLabel={sun:'सूर्य',moon:'चन्द्र',mars:'मंगल',mercury:'बुध',jupiter:'गुरु',venus:'शुक्र',saturn:'शनि',rahu:'राहु',ketu:'केतु'};
let swe=null,last=null;

async function init(){
 try{ swe=new SwissEphemeris(); await swe.init(); $('engineState').textContent='गणना इन्जिन तयार'; $('engineMeta').textContent='Swiss Ephemeris WASM · Sidereal Lahiri'; }
 catch(e){$('engineState').textContent='इन्जिन लोड भएन';$('engineMeta').textContent=e.message;}
}

async function loadBS(){
 const base='../data/';
 const urls=[`${base}converter-index.json`,`../data/conversion-index.json`];
 for(const u of urls){try{const r=await fetch(u,{cache:'force-cache'});if(r.ok){const j=await r.json();return j.items||[]}}catch{}}
 throw Error('BS conversion data unavailable');
}
async function bsToAd(y,m,d){
 const rows=await loadBS();const key=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;const x=rows.find(r=>r[0]===key);if(!x)throw Error('यो BS मिति उपलब्ध conversion range मा छैन।');return x[1];
}

function readInput(){
 const name=$('name').value.trim()||'जन्मकुण्डली';const cal=$('calendar').value;const y=Number($('year').value),m=Number($('month').value),d=Number($('day').value);const [hh,mm]=($('time').value||'12:00').split(':').map(Number);const lat=Number($('lat').value),lon=Number($('lon').value),tz=Number($('tz').value);
 if(!y||!m||!d||!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(tz))throw Error('मिति, समय, अक्षांश, देशान्तर र UTC offset जाँच गर्नुहोस्।');return {name,cal,y,m,d,hh,mm,lat,lon,tz,place:$('place').value.trim()};
}
async function makeDate(x){
 let y=x.y,m=x.m,d=x.d;if(x.cal==='bs'){const ad=await bsToAd(y,m,d);[y,m,d]=ad.split('-').map(Number)}
 return {y,m,d,h:x.hh+x.mm/60-x.tz};
}
function jdFrom(x){return swe.julianDay(x.y,x.m,x.d,x.h);}

function siderealFlag(){return CalculationFlag.SwissEphemeris|CalculationFlag.Speed|CalculationFlag.Sidereal;}
function calcPlanet(jd,body){const p=swe.calculatePosition(jd,body,siderealFlag());return {longitude:norm(p.longitude),latitude:p.latitude,speed:p.longitudeSpeed,retrograde:p.longitudeSpeed<0};}

function calcCore(x,jd){
 swe.setSiderealMode(SiderealMode.Lahiri);
 const planets={};for(const [id,np,sym,body] of GRAHAS)planets[id]={id,name:np,symbol:sym,body,...calcPlanet(jd,body)};
 let node;
 try{node=swe.calculatePosition(jd,LunarPoint.MeanNode,siderealFlag());}catch{node=null}
 const rahuLon=node?norm(node.longitude):null;if(rahuLon!==null){planets.rahu={id:'rahu',name:'राहु',symbol:'☊',longitude:rahuLon,latitude:node.latitude,speed:node.longitudeSpeed,retrograde:node.longitudeSpeed<0};planets.ketu={id:'ketu',name:'केतु',symbol:'☋',longitude:norm(rahuLon+180),latitude:-node.latitude,speed:-node.longitudeSpeed,retrograde:node.longitudeSpeed>0};}
 const hs=swe.calculateHouses(jd,x.lat,x.lon,HouseSystem.WholeSign);const asc=norm(hs.ascendant);const ascSign=signOf(asc);
 Object.values(planets).forEach(p=>{p.sign=signOf(p.longitude);p.degree=degInSign(p.longitude);p.house=((p.sign-ascSign+12)%12)+1;p.nak=nakshatra(p.longitude);p.navamsa=Math.floor((p.degree/30)*9)%9;});
 return {planets,asc,ascSign,hs,jd,ayan:swe.getAyanamsa(jd)};
}

function renderChart(core){
 const housePlanets=Array.from({length:12},()=>[]);Object.values(core.planets).forEach(p=>housePlanets[p.house-1].push(p.symbol));
 const size=500,c=size/2;const pts=[[250,20],[480,250],[250,480],[20,250]];let svg=`<svg viewBox="0 0 500 500" role="img" aria-label="North Indian D1 chart"><rect x="25" y="25" width="450" height="450" fill="none" stroke="currentColor" stroke-width="2"/><path d="M25 25L475 475M475 25L25 475M250 25V475M25 250H475" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M25 250L250 25L475 250L250 475Z" fill="none" stroke="currentColor" stroke-width="2"/>`;
 const positions=[[250,105],[395,170],[395,330],[250,395],[105,330],[105,170],[250,180],[320,250],[250,320],[180,250],[110,110],[390,110]];
 for(let h=1;h<=12;h++){const sign=(core.ascSign+h-1)%12;const [x,y]=positions[h-1];svg+=`<text x="${x}" y="${y-16}" text-anchor="middle" font-size="13" fill="currentColor">${h} · ${SIGNS[sign]}</text><text x="${x}" y="${y+7}" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor">${housePlanets[h-1].join(' ')||'·'}</text>`}
 svg+=`<text x="250" y="252" text-anchor="middle" font-size="11" fill="currentColor">लाहिरी · Whole Sign</text></svg>`;$('chart').innerHTML=svg;
}
function renderFacts(core){const moon=core.planets.moon,sun=core.planets.sun,asc=core.asc;const facts=[['लग्न',SIGNS[core.ascSign]],['लग्न अंश',dms(asc)],['चन्द्र राशि',SIGNS[moon.sign]],['जन्म नक्षत्र',`${moon.nak.name} · पाद ${moon.nak.pada}`],['नक्षत्र स्वामी',moon.nak.lord],['सूर्य राशि',SIGNS[sun.sign]],['अयनांश',dms(core.ayan)],['जन्म चन्द्र अंश',dms(moon.degree)]];$('keyfacts').innerHTML=facts.map(x=>`<div class="fact"><small>${x[0]}</small><b>${x[1]}</b></div>`).join('');}
function planetTable(core){const rows=Object.values(core.planets).map(p=>`<tr><td><b>${p.symbol} ${p.name}</b></td><td>${SIGNS[p.sign]}</td><td>${dms(p.degree)}</td><td>${p.nak.name} · ${p.nak.pada}</td><td>${nep(p.house)}</td><td>${p.retrograde?'वक्री':'मार्गी'}</td></tr>`).join('');return `<table class="data-table"><thead><tr><th>ग्रह</th><th>राशि</th><th>अंश</th><th>नक्षत्र</th><th>भाव</th><th>गति</th></tr></thead><tbody>${rows}</tbody></table>`;}
function bhavaTable(core){return `<table class="data-table"><thead><tr><th>भाव</th><th>राशि</th><th>ग्रह</th><th>भाव क्रम</th></tr></thead><tbody>${Array.from({length:12},(_,i)=>{const s=(core.ascSign+i)%12;const ps=Object.values(core.planets).filter(p=>p.house===i+1).map(p=>p.symbol).join(' ')||'—';return `<tr><td>${nep(i+1)}</td><td>${SIGNS[s]}</td><td>${ps}</td><td>${i===0?'लग्न':`लग्नबाट ${nep(i+1)}`}</td></tr>`}).join('')}</tbody></table>`;}
function nakTable(core){const rows=Object.values(core.planets).map(p=>`<tr><td>${p.symbol} ${p.name}</td><td>${p.nak.name}</td><td>${nep(p.nak.pada)}</td><td>${p.nak.lord}</td><td>${SIGN_EN[p.sign]}</td></tr>`).join('');return `<table class="data-table"><thead><tr><th>ग्रह</th><th>नक्षत्र</th><th>पाद</th><th>नक्षत्र स्वामी</th><th>राशि</th></tr></thead><tbody>${rows}</tbody></table>`;}

function vimshottari(core){const moon=core.planets.moon;const seq=['केतु','शुक्र','सूर्य','चन्द्र','मंगल','राहु','गुरु','शनि','बुध'];const years={केतु:7,शुक्र:20,सूर्य:6,चन्द्र:10,मंगल:7,राहु:18,गुरु:16,शनि:19,बुध:17};const startIndex=seq.indexOf(moon.nak.lord);const frac=(norm(moon.longitude)%(360/27))/(360/27);const rows=[];for(let i=0;i<9;i++){const lord=seq[(startIndex+i)%9];const duration=years[lord]*(i===0?(1-frac):1);rows.push(`<tr><td>${lord}</td><td>${duration.toFixed(3)} वर्ष</td><td>${i===0?'जन्म नक्षत्रको बाँकी दशा':'पूर्ण महादशा'}</td></tr>`)}return `<div class="notice">विंशोत्तरी दशा Moon को जन्म नक्षत्र र पादबाट सुरु हुन्छ। तलको पहिलो दशा जन्मसमयमा बाँकी रहेको भाग हो। पूर्ण मिति timeline थप्दा स्थानीय calendar/date engine सँग cross-check गरिनेछ।</div><table class="data-table"><thead><tr><th>महादशा</th><th>अवधि</th><th>स्थिति</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;}
function upagraha(core){const sun=core.planets.sun.longitude;const points=[['धूम',norm(sun+133+20/60)],['व्यतीपात',norm(360-(sun+133+20/60))],['परिवेष',norm(180+(360-(sun+133+20/60)))],['इन्द्रचाप',norm(360-(180+(360-(sun+133+20/60))))],['उपकेतु',norm((360-(180+(360-(sun+133+20/60))))+16+40/60)]];return `<p class="notice">धूम आदि सूर्य-आधारित अप्रकाश उपग्रहहरू निश्चित angular formula बाट निकालिएका छन्। गुलिक/माण्डीको सही longitude दिन/रातको स्थानीय सूर्योदय-सूर्यास्त र परम्परागत weekday segment नियममा निर्भर भएकाले त्यसको sunrise engine बिना अनुमान गरेर देखाइएको छैन।</p><table class="data-table"><thead><tr><th>उपग्रह</th><th>सूर्यबाट सूत्र</th><th>राशि</th><th>अंश</th></tr></thead><tbody>${points.map(p=>`<tr><td>${p[0]}</td><td>Sun + classical offset</td><td>${SIGNS[signOf(p[1])]}</td><td>${dms(degInSign(p[1]))}</td></tr>`).join('')}</tbody></table>`;}
function varga(core){return `<div class="notice">D1–D60 सबै वर्ग चार्टलाई एकै engine मा नियमअनुसार generate गरिनेछ। D9 Navamsha को आधारभूत placement तल छ; उत्पादन संस्करणमा प्रत्येक Vargas को परम्परागत segmentation र test vectors छुट्टै validate गरिनेछ।</div><table class="data-table"><thead><tr><th>ग्रह</th><th>D1 राशि</th><th>D9 नवांश</th></tr></thead><tbody>${Object.values(core.planets).map(p=>`<tr><td>${p.symbol} ${p.name}</td><td>${SIGNS[p.sign]}</td><td>${SIGNS[(p.sign*9+p.navamsa)%12]}</td></tr>`).join('')}</tbody></table>`;}
function generic(title,items){return `<h3>${title}</h3><div class="blueprint-grid">${items.map(x=>`<article><b>${x[0]}</b><p>${x[1]}</p></article>`).join('')}</div>`;}
function content(tab,core){switch(tab){case'graha':return `<h3>नवग्रह स्थिति</h3>${planetTable(core)}`;case'bhava':return `<h3>१२ भाव</h3>${bhavaTable(core)}`;case'nakshatra':return `<h3>नक्षत्र र पाद</h3>${nakTable(core)}`;case'varga':return varga(core);case'dasha':return `<h3>विंशोत्तरी दशा</h3>${vimshottari(core)}`;case'upagraha':return `<h3>उपग्रह</h3>${upagraha(core)}`;case'lagna':return generic('विशेष लग्न',[['भाव लग्न','स्थानीय समय र सूर्य/लग्नको गतिबाट गणना।'],['होरा लग्न','दिनको गतिशील planetary-hour based special lagna।'],['घटि लग्न','घटिका आधारित special lagna।'],['सूर्य/चन्द्र लग्न','सूर्य वा चन्द्रलाई १औँ भाव मानेर chart view।'],['अरू special points','Arudha, Upapada, Darapada आदि नियमसहित।']]);case'strength':return generic('षड्बल',[['स्थान बल','उच्च, मूलत्रिकोण, स्वक्षेत्र, सप्तवर्ग, ओज/युग्म र केन्द्रादि components।'],['दिक् बल','दिशागत बल।'],['काल बल','दिवा/रात्रि, पक्ष, वर्ष/मास/वार आदि।'],['चेष्टा बल','ग्रहको गतिसँग सम्बन्धित बल।'],['नैसर्गिक बल','ग्रहको natural strength।'],['दृष्टि बल','शुभ/अशुभ ग्रह दृष्टिबाट बल।']]);case'ashtaka':return generic('अष्टकवर्ग',[['BAV','प्रत्येक ग्रहको १२ राशिमा bindu distribution।'],['SAV','सम्पूर्ण ग्रहबाट १२ राशिको सर्वाष्टकवर्ग।'],['शोधन','त्रिकोण/एकाधिपत्य शोधन सहित परम्परागत calculation।'],['कक्ष्या','८ भागमा सूक्ष्म strength view।']]);case'yoga':return generic('योग तथा दोष',[['राजयोग','केन्द्र–त्रिकोण स्वामी सम्बन्ध र strength सहित।'],['पञ्चमहापुरुष','रुचक, भद्र, हंस, मालव्य, शश।'],['धनयोग','धन भाव/स्वामी/कारक सम्बन्ध।'],['नीचभंग','नीचत्व र cancellation conditions।'],['मंगलीक','लग्न, चन्द्र, शुक्र आदिबाट स्पष्ट नियम र exceptions।'],['कालसर्प','नोड-अक्षभित्र ग्रहहरूको स्थिति; definition configurable।'],['गण्डमूल/गण्डान्त','नक्षत्र/राशि boundary based checks।']]);case'hora':return generic('होरा',[['जन्म होरा','स्थानीय सूर्योदय–सूर्यास्तको आधारमा planetary hour।'],['D2 Hora','द्वितीयांश divisional chart।'],['दिन/रात','Sunrise/sunset र timezone सही भएपछि मात्र।'],['होरा स्वामी','परम्परागत Chaldean sequence अनुसार।']]);case'transit':return generic('गोचर',[['हालका ग्रह','आजको sidereal Lahiri positions।'],['राशि प्रवेश','ग्रहले राशि परिवर्तन गर्ने समय।'],['साढेसाती','चन्द्र राशिबाट शनि गोचरका तीन चरण।'],['अष्टम शनि','चन्द्रबाट आठौँ राशिमा शनि।'],['गोचर दृष्टि','Vedic graha drishti overlay।']]);case'panchanga':return generic('जन्म पञ्चाङ्ग',[['तिथि','Sun–Moon angular separation।'],['वार','स्थानीय जन्म दिन।'],['नक्षत्र','Moon longitude बाट।'],['योग','Sun + Moon longitude आधारित।'],['करण','तिथि आधामा आधारित।'],['अयन/ऋतु','सौर/सिडेरियल calendar context।']]);default:return ''}}

async function generate(){
 if(!swe)return alert('गणना इन्जिन अझै लोड हुँदैछ।');
 try{
  const x=readInput();$('generate').disabled=true;$('generate').textContent='गणना हुँदैछ…';const dt=await makeDate(x);const jd=jdFrom(dt);const core=calcCore(x,jd);last={x,dt,core};$('results').classList.remove('hidden');$('personTitle').textContent=x.name;$('birthSummary').textContent=`${x.place} · ${dt.y}-${String(dt.m).padStart(2,'0')}-${String(dt.d).padStart(2,'0')} · ${String(x.hh).padStart(2,'0')}:${String(x.mm).padStart(2,'0')} (UTC ${x.tz>=0?'+':''}${x.tz})`;$('methodAyan').textContent='Lahiri / Chitrapaksha';$('methodHouse').textContent='Whole Sign';$('jd').textContent=`JD: ${jd.toFixed(6)}`;$('ephemeris').textContent='Ephemeris: Swiss/Moshier WASM';renderChart(core);renderFacts(core);$('tabContent').innerHTML=content('graha',core);window.scrollTo({top:$('results').offsetTop-70,behavior:'smooth'});
 }catch(e){alert(e.message||'गणना असफल भयो।')}finally{$('generate').disabled=false;$('generate').innerHTML='कुण्डली गणना गर्नुहोस् <span>→</span>'}
}

$('generate').onclick=generate;$('sample').onclick=()=>{Object.assign($('name'),{value:'नमुना जन्मकुण्डली'});$('calendar').value='bs';$('year').value=2058;$('month').value=12;$('day').value=4;$('time').value='12:00';$('place').value='Kathmandu, Nepal';$('lat').value=27.7172;$('lon').value=85.3240;$('tz').value=5.75};$('print').onclick=()=>window.print();$('save').onclick=()=>{if(!last)return;const old=JSON.parse(localStorage.getItem('nepaliPatroJyotishProfiles')||'[]');old.unshift({name:last.x.name,place:last.x.place,date:`${last.dt.y}-${last.dt.m}-${last.dt.d}`,savedAt:new Date().toISOString(),input:last.x});localStorage.setItem('nepaliPatroJyotishProfiles',JSON.stringify(old.slice(0,20)));alert('कुण्डली ब्राउजरमा सेभ भयो।')};
$('tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b||!last)return;document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('tabContent').innerHTML=content(b.dataset.tab,last.core)});$('theme').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('jyotishTheme',document.body.classList.contains('dark')?'dark':'light')};if(localStorage.getItem('jyotishTheme')==='dark')document.body.classList.add('dark');
init();
(()=>{'use strict';
const BASE='https://apps.laxmannepal.com.np/Nepali-Patro/';
const NP='०१२३४५६७८९';
const en=v=>String(v).replace(/[०-९]/g,d=>String(NP.indexOf(d)));
const np=v=>String(v).replace(/\d/g,d=>NP[d]);
const pad=n=>String(n).padStart(2,'0');
const key=(y,m,d)=>`${y}-${pad(m)}-${pad(d)}`;
let mode='bs', cache=new Map();
const host=()=>document.querySelector('.np-converter');
const yearData=async y=>{if(cache.has(y))return cache.get(y);const p=fetch(`${BASE}data/calendar/${y}.json?v=20260907-01`,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP');return r.json()}).then(raw=>{let x=raw;if(raw&&typeof raw.content==='string')try{x=JSON.parse(raw.content)}catch{};if(!Array.isArray(x?.days))throw Error('DATA');return x.days});cache.set(y,p);return p};
const findBs=async(ad)=>{const y=+ad.slice(0,4);for(const by of [y+56,y+57]){try{const x=(await yearData(by)).find(d=>String(d?.ad?.date)===ad);if(x?.bs)return x}catch{}}return null};
const findAd=async(y,m,d)=>{try{return (await yearData(y)).find(x=>+x?.bs?.year===y&&+x?.bs?.month===m&&+x?.bs?.day===d)}catch{return null}};
function render(){const el=host();if(!el)return;el.innerHTML=`<div class="hp-conv-card"><div class="hp-conv-tabs" role="tablist"><button type="button" class="${mode==='bs'?'active':''}" data-mode="bs" role="tab" aria-selected="${mode==='bs'}">BS → AD</button><button type="button" class="${mode==='ad'?'active':''}" data-mode="ad" role="tab" aria-selected="${mode==='ad'}">AD → BS</button></div><div class="hp-conv-form">${mode==='bs'?'<label>वि.सं. मिति<input id="hpConvDate" inputmode="numeric" autocomplete="off" placeholder="२०८३-०५-१०" aria-label="वि.सं. मिति"></label>':'<label>ईस्वी मिति<input id="hpConvDate" type="date" aria-label="ईस्वी मिति"></label>'}<div class="hp-conv-actions"><button class="hp-conv-primary" id="hpConvGo" type="button">${mode==='bs'?'AD मा बदल्नुहोस्':'BS मा बदल्नुहोस्'}</button><button class="hp-conv-today" id="hpConvToday" type="button">आज</button></div></div><div id="hpConvResult" class="hp-conv-result" hidden aria-live="polite"></div><div id="hpConvError" class="hp-conv-error" hidden role="alert"></div><div class="hp-conv-foot"><span>छिटो रूपान्तरण</span><a href="${BASE}converter/">पूर्ण converter →</a></div></div>`;
 el.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;render()});
 document.getElementById('hpConvGo').onclick=convert;
 document.getElementById('hpConvToday').onclick=async()=>{const ad=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());if(mode==='ad'){document.getElementById('hpConvDate').value=ad}else{const x=await findBs(ad);if(x?.bs)document.getElementById('hpConvDate').value=key(x.bs.year,x.bs.month,x.bs.day).replace(/\d/g,d=>NP[d]);}convert()};
 document.getElementById('hpConvDate').addEventListener('keydown',e=>{if(e.key==='Enter')convert()});
}
async function convert(){const input=document.getElementById('hpConvDate')?.value.trim(),res=document.getElementById('hpConvResult'),err=document.getElementById('hpConvError');if(!res||!err)return;err.hidden=true;res.hidden=true;try{if(mode==='bs'){const p=en(input).replace(/[/.\s]+/g,'-').split('-').filter(Boolean).map(Number);if(p.length!==3||p.some(n=>!Number.isInteger(n)))throw Error('format');const[y,m,d]=p;if(y<1970||y>2100||m<1||m>12||d<1||d>32)throw Error('range');const x=await findAd(y,m,d);if(!x?.ad?.date)throw Error('notfound');res.innerHTML=`<span class="hp-conv-big">${x.ad.date}</span><span>वि.सं. ${np(key(y,m,d))}</span>`}else{if(!/^\d{4}-\d{2}-\d{2}$/.test(input))throw Error('format');const x=await findBs(input);if(!x?.bs)throw Error('notfound');res.innerHTML=`<span class="hp-conv-big">${np(key(x.bs.year,x.bs.month,x.bs.day))}</span><span>ईस्वी ${input}</span>`}res.hidden=false}catch(e){err.textContent=e.message==='format'?'मिति सही ढाँचामा राख्नुहोस्।':e.message==='range'?'BS मिति मान्य दायराभित्र राख्नुहोस्।':'यो मिति उपलब्ध रूपान्तरण डेटामा भेटिएन।';err.hidden=false}}
function boot(){const el=host();if(!el)return;render()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

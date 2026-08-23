(()=>{'use strict';
const BASE='https://apps.laxmannepal.com.np/Nepali-Patro/';
const NUMS='०१२३४५६७८९';
let mode='bs';
let days=[];
const $=id=>document.getElementById(id);
const toEn=v=>String(v).replace(/[०-९]/g,d=>String(NUMS.indexOf(d)));
const toNp=v=>String(v).replace(/\d/g,d=>NUMS[d]);
const pad=n=>String(n).padStart(2,'0');
const fail=m=>{$('error').textContent=m;$('error').hidden=false;$('result').hidden=true};
const clearError=()=>{$('error').hidden=true};
const ok=(title,sub,meta='')=>{$('result').innerHTML=`<span class="big">${title}</span><span class="sub">${sub}</span>${meta}`;$('result').hidden=false;clearError()};
function parseParts(v){
  const p=toEn(v.trim()).replace(/[/.\s]+/g,'-').split('-').filter(Boolean).map(Number);
  return p.length===3&&p.every(Number.isInteger)?p:null;
}
function key(y,m,d){return `${y}-${pad(m)}-${pad(d)}`}
function validateBs(y,m,d){return y>=1970&&y<=2100&&m>=1&&m<=12&&d>=1&&d<=32}
function draw(){
  const f=$('form');
  f.innerHTML=mode==='bs'
    ? `<div class="field"><label for="date">वि.सं. मिति</label><input id="date" inputmode="numeric" autocomplete="off" placeholder="२०८३-०५-१०" aria-label="वि.सं. मिति"></div><div class="actions"><button class="convert" id="go" type="button">AD मा रूपान्तरण गर्नुहोस्</button><button class="swap" id="today" type="button">आज</button></div>`
    : `<div class="field"><label for="date">ईस्वी मिति</label><input id="date" type="date" aria-label="ईस्वी मिति"></div><div class="actions"><button class="convert" id="go" type="button">BS मा रूपान्तरण गर्नुहोस्</button><button class="swap" id="today" type="button">आज</button></div>`;
  $('go').onclick=convert;
  $('today').onclick=fillToday;
  $('date').addEventListener('keydown',e=>{if(e.key==='Enter')convert()});
}
async function loadYear(year){
  const res=await fetch(`${BASE}data/calendar/${year}.json?v=20260824-05`,{cache:'no-store'});
  if(!res.ok)throw new Error(`HTTP ${res.status}`);
  const raw=await res.json();
  let payload=raw;
  if(raw&&typeof raw.content==='string'){
    try{payload=JSON.parse(raw.content)}catch{}
  }
  if(!payload||!Array.isArray(payload.days))throw new Error(`Invalid calendar data for ${year}`);
  return payload.days;
}
async function loadForBsYear(year){
  days=await loadYear(year);
  return days;
}
async function findAdForBs(y,m,d){
  const list=await loadForBsYear(y);
  return list.find(x=>Number(x?.bs?.year)===y&&Number(x?.bs?.month)===m&&Number(x?.bs?.day)===d)||null;
}
async function findBsForAd(ad){
  const y=Number(ad.slice(0,4));
  const candidates=[y+56,y+57];
  for(const bsYear of candidates){
    try{
      const list=await loadYear(bsYear);
      const found=list.find(x=>String(x?.ad?.date)===ad);
      if(found?.bs)return found;
    }catch(e){console.warn(`Calendar ${bsYear} unavailable`,e)}
  }
  return null;
}
async function fillToday(){
  const now=new Date();
  const ad=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  try{
    const found=await findBsForAd(ad);
    if(!found?.bs)return fail('आजको BS मिति उपलब्ध डेटामा भेटिएन।');
    if(mode==='ad'){
      $('date').value=ad;await convert();
    }else{
      const {year,month,day}=found.bs;
      $('date').value=`${toNp(year)}-${toNp(pad(month))}-${toNp(pad(day))}`;
      await convert();
    }
  }catch(e){console.error(e);fail('आजको मिति डेटा लोड हुन सकेन।')}
}
async function convert(){
  clearError();
  $('result').hidden=true;
  try{
    if(mode==='bs'){
      const p=parseParts($('date').value);
      if(!p)return fail('सही ढाँचा प्रयोग गर्नुहोस्: २०८३-०५-१०');
      const [y,m,d]=p;
      if(!validateBs(y,m,d))return fail('BS वर्ष १९७०–२१००, महिना १–१२ र दिन १–३२ भित्र हुनुपर्छ।');
      const x=await findAdForBs(y,m,d);
      if(!x?.ad?.date)return fail('यो BS मिति रूपान्तरण डेटामा भेटिएन।');
      const ad=String(x.ad.date);
      const js=new Date(`${ad}T00:00:00`);
      ok(ad,`वि.सं. ${toNp(y)}-${toNp(pad(m))}-${toNp(pad(d))}`,`<div class="meta"><div><b>वार</b><span>${js.toLocaleDateString('ne-NP',{weekday:'long'})}</span></div><div><b>AD</b><span>${ad}</span></div><div><b>BS</b><span>${toNp(key(y,m,d))}</span></div></div>`);
    }else{
      const ad=$('date').value;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(ad))return fail('ईस्वी मिति छान्नुहोस्।');
      const x=await findBsForAd(ad);
      if(!x?.bs)return fail('यो AD मिति रूपान्तरण डेटामा भेटिएन।');
      const {year,month,day}=x.bs;
      const bs=key(year,month,day);
      const js=new Date(`${ad}T00:00:00`);
      ok(toNp(bs),`ईस्वी ${ad}`,`<div class="meta"><div><b>वार</b><span>${js.toLocaleDateString('ne-NP',{weekday:'long'})}</span></div><div><b>AD</b><span>${ad}</span></div><div><b>BS</b><span>${toNp(bs)}</span></div></div>`);
    }
  }catch(e){
    console.error(e);
    fail(e?.message?.startsWith('HTTP')?'मिति डेटा लोड हुन सकेन। GitHub Pages/CDN data path जाँच गर्नुहोस्।':'मिति रूपान्तरण हुन सकेन।');
  }
}
function setMode(next){mode=next;$('bsTab').classList.toggle('active',mode==='bs');$('adTab').classList.toggle('active',mode==='ad');draw();$('result').hidden=true;clearError()}
async function loadData(){
  $('status').textContent='रूपान्तरण डेटा तयार हुँदैछ…';
  try{
    const probe=await loadYear(new Date().getFullYear()+57);
    if(!probe.length)throw new Error('empty dataset');
    days=probe;
    $('status').textContent='रूपान्तरण तयार';
    draw();
    $('bsTab').onclick=()=>setMode('bs');
    $('adTab').onclick=()=>setMode('ad');
  }catch(e){
    $('status').textContent='रूपान्तरण डेटा लोड भएन';
    fail('रूपान्तरण डेटा लोड हुन सकेन। data/calendar/{year}.json path जाँच गर्नुहोस्।');
    console.error(e);
  }
}
document.addEventListener('DOMContentLoaded',loadData);
})();
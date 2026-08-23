(()=>{'use strict';
const BASE='https://apps.laxmannepal.com.np/Nepali-Patro/';
const NUMS='०१२३४५६७८९';
let mode='bs';
let rows=[];
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
function fillToday(){
  const now=new Date();
  const ad=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  if(mode==='ad'){$('date').value=ad;convert();return}
  const row=rows.find(r=>String(r[1])===ad);
  if(!row)return fail('आजको BS मिति उपलब्ध डेटामा भेटिएन।');
  const [y,m,d]=String(row[0]).split('-').map(Number);
  $('date').value=`${toNp(y)}-${toNp(pad(m))}-${toNp(pad(d))}`;
  convert();
}
function convert(){
  clearError();
  $('result').hidden=true;
  if(!rows.length)return fail('रूपान्तरण डेटा तयार भएको छैन। पेज refresh गरेर पुनः प्रयास गर्नुहोस्।');
  try{
    if(mode==='bs'){
      const p=parseParts($('date').value);
      if(!p)return fail('सही ढाँचा प्रयोग गर्नुहोस्: २०८३-०५-१०');
      const [y,m,d]=p;
      if(!validateBs(y,m,d))return fail('BS वर्ष १९७०–२१००, महिना १–१२ र दिन १–३२ भित्र हुनुपर्छ।');
      const x=rows.find(r=>String(r[0])===key(y,m,d));
      if(!x)return fail('यो BS मिति रूपान्तरण डेटामा भेटिएन।');
      const ad=String(x[1]);
      const js=new Date(`${ad}T00:00:00`);
      ok(ad,`वि.सं. ${toNp(y)}-${toNp(pad(m))}-${toNp(pad(d))}`,`<div class="meta"><div><b>वार</b><span>${js.toLocaleDateString('ne-NP',{weekday:'long'})}</span></div><div><b>AD</b><span>${ad}</span></div><div><b>BS</b><span>${toNp(key(y,m,d))}</span></div></div>`);
    }else{
      const ad=$('date').value;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(ad))return fail('ईस्वी मिति छान्नुहोस्।');
      const x=rows.find(r=>String(r[1])===ad);
      if(!x)return fail('यो AD मिति रूपान्तरण डेटामा भेटिएन।');
      const bs=String(x[0]);
      const js=new Date(`${ad}T00:00:00`);
      ok(toNp(bs),`ईस्वी ${ad}`,`<div class="meta"><div><b>वार</b><span>${js.toLocaleDateString('ne-NP',{weekday:'long'})}</span></div><div><b>AD</b><span>${ad}</span></div><div><b>BS</b><span>${toNp(bs)}</span></div></div>`);
    }
  }catch(e){fail('मिति रूपान्तरण हुन सकेन।');console.error(e)}
}
function setMode(next){mode=next;$('bsTab').classList.toggle('active',mode==='bs');$('adTab').classList.toggle('active',mode==='ad');draw();$('result').hidden=true;clearError()}
async function loadData(){
  $('status').textContent='रूपान्तरण डेटा लोड हुँदैछ…';
  const urls=[`${BASE}data/converter-index.json`,`${BASE}data/conversion-index.json`];
  let lastError=null;
  for(const url of urls){
    try{
      const res=await fetch(`${url}?v=20260824-04`,{cache:'no-store'});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const j=await res.json();
      const items=Array.isArray(j)?j:(j&&Array.isArray(j.items)?j.items:[]);
      if(!items.length)throw new Error('empty dataset');
      rows=items;
      $('status').textContent=`रूपान्तरण तयार • ${rows.length.toLocaleString()} मिति उपलब्ध`;
      draw();
      $('bsTab').onclick=()=>setMode('bs');
      $('adTab').onclick=()=>setMode('ad');
      return;
    }catch(e){lastError=e}
  }
  $('status').textContent='रूपान्तरण डेटा लोड भएन';
  fail('रूपान्तरण डेटा लोड हुन सकेन। GitHub Pages/CDN data path जाँच गर्नुहोस्।');
  console.error(lastError);
}
document.addEventListener('DOMContentLoaded',loadData);
})();
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
const AGE_MONTHS=['बैशाख','जेठ','असार','साउन','भदौ','असोज','कात्तिक','मंसिर','पुष','माघ','फागुन','चैत'];
let ageMode='bs';
const ageYears=Array.from({length:61},(_,i)=>2040+i);
async function ageFindBs(ad){const y=+ad.slice(0,4);for(const by of [y+56,y+57]){if(by<2040||by>2100)continue;try{const list=await loadYear(by),x=list.find(d=>d.ad?.date===ad);if(x)return x}catch{}}return null}
async function ageFindAd(y,m,d){const list=await loadYear(y);return list.find(x=>+x.bs?.year===y&&+x.bs?.month===m&&+x.bs?.day===d)||null}
async function ageLens(){const j=await fetch(BASE+'data/years.json?v=20260824-06',{cache:'no-store'}).then(r=>r.json());return Object.fromEntries((j.years||[]).map(x=>[x.year,x.monthLengths]))}
function ageAD(a,b){let y=b.getUTCFullYear()-a.getUTCFullYear(),m=b.getUTCMonth()-a.getUTCMonth(),d=b.getUTCDate()-a.getUTCDate();if(d<0){m--;d+=new Date(Date.UTC(b.getUTCFullYear(),b.getUTCMonth(),0)).getUTCDate()}if(m<0){y--;m+=12}return{y,m,d}}
function ageBS(a,b,l){let y=b.y-a.y,m=b.m-a.m,d=b.d-a.d;if(d<0){m--;const py=m<0?b.y-1:b.y,pm=m<0?12:m;d+=(l[py]&&l[py][pm-1]||30)}if(m<0){y--;m+=12}return{y,m,d}}
function ageSelect(id,vals){return '<select id="'+id+'">'+vals.map(v=>'<option value="'+v+'">'+toNp(v)+'</option>').join('')+'</select>'}
async function ageDays(yid,mid,did){try{const list=await loadYear(+$(yid).value),m=+$(mid).value,max=Math.max.apply(null,list.filter(x=>+x.bs?.month===m).map(x=>+x.bs?.day));$(did).innerHTML=Array.from({length:max},(_,i)=>'<option value="'+(i+1)+'">'+toNp(i+1)+'</option>').join('')}catch{}}
async function ageDraw(){if(ageMode==='bs'){let years=ageYears.map(y=>'<option value="'+y+'">'+toNp(y)+'</option>').join('');$('ageForm').innerHTML='<div class="field"><label>जन्ममिति — वि.सं.</label><div class="age-grid"><label>वर्ष<select id="ageBirthY">'+years+'</select></label><label>महिना'+ageSelect('ageBirthM',[1,2,3,4,5,6,7,8,9,10,11,12])+'</label><label>दिन<select id="ageBirthD"></select></label></div></div><div class="field"><label>उमेर गणना गर्ने मिति — वि.सं.</label><div class="age-grid"><label>वर्ष<select id="ageAsY">'+years+'</select></label><label>महिना'+ageSelect('ageAsM',[1,2,3,4,5,6,7,8,9,10,11,12])+'</label><label>दिन<select id="ageAsD"></select></label></div></div>';for(const z of ['ageBirthY','ageBirthM','ageAsY','ageAsM'])$(z).onchange=()=>ageDays(z.startsWith('ageBirth')?'ageBirthY':'ageAsY',z.startsWith('ageBirth')?'ageBirthM':'ageAsM',z.startsWith('ageBirth')?'ageBirthD':'ageAsD');await ageDays('ageBirthY','ageBirthM','ageBirthD');await ageDays('ageAsY','ageAsM','ageAsD');const x=await ageFindBs(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));if(x){$('ageAsY').value=x.bs.year;$('ageAsM').value=x.bs.month;await ageDays('ageAsY','ageAsM','ageAsD');$('ageAsD').value=x.bs.day}}else{$('ageForm').innerHTML='<div class="field"><label for="ageBirthAd">जन्ममिति — ई.सं.</label><input id="ageBirthAd" type="date" min="1983-04-14" max="2044-04-12"></div><div class="field"><label for="ageAsAd">उमेर गणना गर्ने मिति — ई.सं.</label><input id="ageAsAd" type="date"></div>'}}
async function ageCalculate(){const err=$('ageError'),res=$('ageResult');err.hidden=true;res.hidden=true;try{let bad,btd,bbs,bts;if(ageMode==='bs'){bbs={y:+$('ageBirthY').value,m:+$('ageBirthM').value,d:+$('ageBirthD').value};bts={y:+$('ageAsY').value,m:+$('ageAsM').value,d:+$('ageAsD').value};const x=await ageFindAd(bbs.y,bbs.m,bbs.d),z=await ageFindAd(bts.y,bts.m,bts.d);if(!x||!z)throw Error('data');bad=x.ad.date;btd=z.ad.date}else{bad=$('ageBirthAd').value;btd=$('ageAsAd').value;if(!bad||!btd||bad>btd)throw Error('future');bbs=await ageFindBs(bad);bts=await ageFindBs(btd);if(!bbs||!bts)throw Error('data');bbs={y:+bbs.bs.year,m:+bbs.bs.month,d:+bbs.bs.day};bts={y:+bts.bs.year,m:+bts.bs.month,d:+bts.bs.day}}if(bad>btd)throw Error('future');const ap=ageAD(new Date(bad+'T00:00:00Z'),new Date(btd+'T00:00:00Z')),bp=ageBS(bbs,bts,await ageLens()),total=Math.round((Date.parse(btd+'T00:00:00Z')-Date.parse(bad+'T00:00:00Z'))/86400000),born=await ageFindBs(bad),asof=await ageFindBs(btd);res.innerHTML='<div class="age-main">'+toNp(ap.y)+' वर्ष '+toNp(ap.m)+' महिना '+toNp(ap.d)+' दिन</div><div class="age-secondary">वि.सं. अनुसार: <b>'+toNp(bp.y)+' वर्ष '+toNp(bp.m)+' महिना '+toNp(bp.d)+' दिन</b></div><div class="age-secondary">जन्ममिति: '+toNp(born.bs.year)+' '+AGE_MONTHS[born.bs.month-1]+' '+toNp(born.bs.day)+' BS · '+bad+' AD</div><div class="age-secondary">गणना मिति: '+toNp(asof.bs.year)+' '+AGE_MONTHS[asof.bs.month-1]+' '+toNp(asof.bs.day)+' BS · '+btd+' AD</div><div class="age-stats"><div class="age-stat"><b>'+toNp(total)+'</b><span>कुल दिन</span></div><div class="age-stat"><b>'+toNp(Math.floor(total/7))+'</b><span>पूरा हप्ता</span></div><div class="age-stat"><b>'+toNp(ap.y*12+ap.m)+'</b><span>पूरा महिना</span></div><div class="age-stat"><b>'+toNp(total*24)+'</b><span>घण्टा</span></div></div>';res.hidden=false}catch(e){err.textContent=e.message==='future'?'जन्ममिति गणना मितिभन्दा पछिको हुन सक्दैन।':'मिति उपलब्ध छैन। BS डेटा दायरा २०४०–२१०० हो।';err.hidden=false}}
function initAge(){if(!$('ageForm'))return;ageDraw();$('ageCalculate').onclick=ageCalculate;$('ageBsTab').onclick=()=>{ageMode='bs';$('ageBsTab').classList.add('active');$('ageAdTab').classList.remove('active');ageDraw()};$('ageAdTab').onclick=()=>{ageMode='ad';$('ageAdTab').classList.add('active');$('ageBsTab').classList.remove('active');ageDraw();$('ageAsAd').value=new Date().toISOString().slice(0,10)}}

document.addEventListener('DOMContentLoaded',()=>{loadData();initAge();});
})();
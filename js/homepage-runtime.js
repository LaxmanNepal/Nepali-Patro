(()=>{'use strict';
const ROOT=new URL('./',window.location.href).href;
const npParts=()=>new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kathmandu',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).reduce((o,p)=>(o[p.type]=p.value,o),{});
const todayAD=()=>{const p=npParts();return p.year+'-'+p.month+'-'+p.day};
const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
const cacheKey=path=>'np-home:'+path;
function readCache(path){try{const raw=localStorage.getItem(cacheKey(path));if(!raw)return null;const x=JSON.parse(raw);return x&&x.data?x:null}catch(_){return null}}
function writeCache(path,data){try{localStorage.setItem(cacheKey(path),JSON.stringify({savedAt:new Date().toISOString(),data}))}catch(_){}
}
function performancePolish(){
 if(document.getElementById('npHomePerf'))return;
 const style=document.createElement('style');style.id='npHomePerf';style.textContent='.home-redesign main>.np-section{content-visibility:auto;contain-intrinsic-size:1px 420px}.home-redesign main>.np-section:first-of-type{content-visibility:visible;contain-intrinsic-size:auto}.home-redesign .np-news img,.home-redesign img[loading="lazy"]{content-visibility:auto}.home-redesign{scroll-behavior:smooth}@media(prefers-reduced-motion:reduce){.home-redesign{scroll-behavior:auto}}';document.head.appendChild(style);
 document.querySelectorAll('.home-redesign img').forEach(img=>{if(!img.loading)img.loading='lazy';if(!img.decoding)img.decoding='async'});
}
async function json(path){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);try{const r=await fetch(new URL(path,ROOT),{cache:'default',signal:controller.signal});if(!r.ok)throw Error(path+' '+r.status);const data=await r.json();writeCache(path,data);return {data,stale:false};}catch(e){const cached=readCache(path);if(cached?.data)return {data:cached.data,stale:true};throw e}finally{clearTimeout(timer)}}
function publish(values){window.NepaliPatroHome?.merge(values)}
function source(status,updatedAt=null,error=null){window.NepaliPatroHome?.source('calendar',{status,updatedAt,error})}
function render(x){
 set('todayBs',x.bs?.display||'आजको नेपाली मिति उपलब्ध छैन');
 set('todayAd',new Intl.DateTimeFormat('en-US',{timeZone:'UTC',year:'numeric',month:'long',day:'numeric'}).format(new Date(x.ad.date+'T00:00:00Z')));
 set('todayWeekday',x.weekday?.nepali||'');
 const p=document.getElementById('panchangaPreview');
 if(p){const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));const rows=[['☀️','तिथि',x.tithi?.name],['🌙','पक्ष',x.tithi?.paksha],['⭐','नक्षत्र',x.nakshatra?.name],['🕉️','योग',x.yoga?.name]];p.innerHTML=rows.map(([icon,a,b])=>'<div class="np-stat"><i class="np-panchang-icon">'+icon+'</i><span><small>'+esc(a)+'</small><b>'+esc(b||'—')+'</b></span></div>').join('')}
}
function fail(e){console.error('[Nepali Patro homepage]',e);source('error',null,e);publish({status:'error',error:e});set('todayBs','आजको मिति उपलब्ध छैन');set('todayAd','डेटा लोड गर्न सकिएन');const p=document.getElementById('panchangaPreview');if(p)p.innerHTML='<div class="np-runtime-error">पात्रो डेटा लोड हुन सकेन। <button id="npRetry">पुनः प्रयास</button></div>';document.getElementById('npRetry')?.addEventListener('click',()=>{boot().catch(()=>{})},{once:true})}
let runId=0;
async function boot(){const id=++runId;try{performancePolish();publish({status:'loading',error:null});source('loading');const yearsResult=await json('data/years.json');if(id!==runId)return;const ad=todayAD();const meta=(yearsResult.data.years||[]).find(y=>ad>=y.start&&ad<=y.end);if(!meta)throw Error('आजको BS वर्ष उपलब्ध छैन');const dataResult=await json('data/calendar/'+meta.year+'.json');if(id!==runId)return;const data=dataResult.data;const x=(data.days||[]).find(d=>d?.ad?.date===ad);if(!x)throw Error('आजको मिति dataset मा भेटिएन: '+ad);publish({todayAd:ad,todayBs:x.bs,calendar:{year:meta.year,data,x}});render(x);const stale=yearsResult.stale||dataResult.stale;source(stale?'stale':'ready',null,null);publish({status:'ready'});return window.NepaliPatroHome?.state}catch(e){if(id!==runId)return;fail(e);throw e}}
const start=()=>{const p=boot();window.NepaliPatroHome?.setReady(p)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

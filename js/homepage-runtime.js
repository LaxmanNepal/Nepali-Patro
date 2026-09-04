(()=>{'use strict';
const ROOT=new URL('./',window.location.href).href;
const MONTHS=['बैशाख','जेठ','असार','साउन','भदौ','असोज','कात्तिक','मंसिर','पुष','माघ','फागुन','चैत'];
const WEEK=['आइत','सोम','मंगल','बुध','बिही','शुक्र','शनि'];
const Z=[['♈','मेष'],['♉','वृष'],['♊','मिथुन'],['♋','कर्कट'],['♌','सिंह'],['♍','कन्या'],['♎','तुला'],['♏','वृश्चिक'],['♐','धनु'],['♑','मकर'],['♒','कुम्भ'],['♓','मीन']];
const nep=n=>String(n??'').replace(/\d/g,d=>'०१२३४५६७८९'[d]);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const npParts=()=>new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kathmandu',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).reduce((o,p)=>(o[p.type]=p.value,o),{});
const todayAD=()=>{const p=npParts();return p.year+'-'+p.month+'-'+p.day};
const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
async function json(path){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);try{const r=await fetch(new URL(path,ROOT),{cache:'no-cache',signal:controller.signal});if(!r.ok)throw Error(path+' '+r.status);return r.json()}finally{clearTimeout(timer)}}
function publish(values){window.NepaliPatroHome?.merge(values)}
function source(status,updatedAt=null,error=null){window.NepaliPatroHome?.source('calendar',{status,updatedAt,error})}
function render(data,x){
 set('todayBs',x.bs?.display||'आजको नेपाली मिति उपलब्ध छैन');
 set('todayAd',new Intl.DateTimeFormat('en-US',{timeZone:'UTC',year:'numeric',month:'long',day:'numeric'}).format(new Date(x.ad.date+'T00:00:00Z')));
 const p=document.getElementById('panchangaPreview');
 if(p){const rows=[['वार',x.weekday?.nepali],['तिथि',x.tithi?.name],['पक्ष',x.tithi?.paksha],['नक्षत्र',x.nakshatra?.name],['योग',x.yoga?.name],['करण',x.karana?.name],['सूर्योदय',x.sun?.sunrise],['सूर्यास्त',x.sun?.sunset]];p.innerHTML=rows.map(([a,b])=>'<div class="np-stat"><small>'+esc(a)+'</small><b>'+esc(b||'—')+'</b></div>').join('')}
 const cal=document.getElementById('calendarPreview');
 if(cal){const ds=(data.days||[]).filter(d=>Number(d?.bs?.month)===Number(x.bs.month)).sort((a,b)=>Number(a.bs.day)-Number(b.bs.day));const first=ds.find(d=>Number(d.bs.day)===1)||ds[0];let h='<div class="np-home-cal-head"><strong>'+esc(MONTHS[Number(x.bs.month)-1]||x.bs.monthNepali||'पात्रो')+' '+nep(x.bs.year)+'</strong><small>आज: '+nep(x.bs.day)+'</small></div><div class="np-home-cal-grid">'+WEEK.map(w=>'<div class="np-home-cal-week">'+w+'</div>').join('');if(!ds.length){cal.innerHTML='<div class="np-runtime-error">आजको पात्रो उपलब्ध छैन। <button id="npRetryCalendar">पुनः प्रयास</button></div>';document.getElementById('npRetryCalendar')?.addEventListener('click',boot,{once:true})}else{for(let i=0;i<Number(first?.weekday?.index||0);i++)h+='<div></div>';for(const d of ds){const isToday=d.ad?.date===x.ad?.date;h+='<a class="np-home-cal-cell '+(isToday?'is-today':'')+'" '+(isToday?'aria-current="date"':'')+' href="'+new URL('calendar/?date='+encodeURIComponent(d.ad.date),ROOT).href+'"><b>'+nep(d.bs.day)+'</b><small>'+esc(d.ad?.day||'')+'</small>'+(d.festival?'<span>'+esc(d.festival)+'</span>':'')+'</a>'}cal.innerHTML=h+'</div>'}}
 const rash=document.getElementById('rashifalPreview');if(rash)rash.innerHTML=Z.map(([s,n])=>'<a href="'+new URL('rashifal/',ROOT).href+'"><i>'+s+'</i><b>'+n+'</b><span>दैनिक राशिफल</span></a>').join('');
}
function fail(e){console.error('[Nepali Patro homepage]',e);source('error',null,e);publish({status:'error',error:e});set('todayBs','आजको मिति उपलब्ध छैन');set('todayAd','डेटा लोड गर्न सकिएन');const p=document.getElementById('panchangaPreview');if(p)p.innerHTML='<div class="np-runtime-error">पात्रो डेटा लोड हुन सकेन। <button id="npRetry">पुनः प्रयास</button></div>';document.getElementById('npRetry')?.addEventListener('click',boot,{once:true})}
async function boot(){try{publish({status:'loading',error:null});source('loading');const years=await json('data/years.json');const ad=todayAD();const meta=(years.years||[]).find(y=>ad>=y.start&&ad<=y.end);if(!meta)throw Error('आजको BS वर्ष उपलब्ध छैन');const data=await json('data/calendar/'+meta.year+'.json');const x=(data.days||[]).find(d=>d?.ad?.date===ad);if(!x)throw Error('आजको मिति dataset मा भेटिएन: '+ad);publish({todayAd:ad,todayBs:x.bs,calendar:{year:meta.year,data,x}});render(data,x);source('ready',new Date().toISOString());publish({status:'ready'});return window.NepaliPatroHome?.state}catch(e){fail(e);throw e}}
const start=()=>{const p=boot();window.NepaliPatroHome?.setReady(p)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

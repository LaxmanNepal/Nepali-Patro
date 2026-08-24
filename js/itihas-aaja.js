(()=>{
const MONTH_NE={1:"बैशाख",2:"जेठ",3:"असार",4:"साउन",5:"भदौ",6:"असोज",7:"कात्तिक",8:"मंसिर",9:"पुष",10:"माघ",11:"फागुन",12:"चैत"};
const MONTHS={1:"baishakh",2:"jestha",3:"ashar",4:"shrawan",5:"bhadra",6:"ashoj",7:"kartik",8:"mangsir",9:"poush",10:"magh",11:"fagun",12:"chaitra"};
const ROOT="../";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const today=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));return{year:+p.year,month:+p.month,day:+p.day,iso:`${p.year}-${p.month}-${p.day}`}};
async function fetchJSON(url,timeout=9000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,cache:"default"});if(!r.ok)throw Error(`${r.status} ${r.statusText}`);return await r.json()}finally{clearTimeout(t)}}
async function findDay(iso,adYear){
  const bsYear=adYear-(iso.slice(5,10)>="04-14"? -57 : -56);
  const candidates=[adYear+57,adYear+56].filter((y,i,a)=>y>=2040&&y<=2100&&a.indexOf(y)===i);
  for(const y of candidates){try{const j=await fetchJSON(`${ROOT}data/calendar/${y}.json`);const d=Array.isArray(j.days)&&j.days.find(x=>x.ad?.date===iso);if(d)return d}catch(e){console.warn("calendar fetch failed",y,e)}}
  return null;
}
function typeIcon(e){return e.type==="death"?"🕯️":e.type==="birth"?"🎂":e.type==="disaster-history"?"🌏":e.type==="heritage"?"🏛️":e.type==="nepal-history"?"🇳🇵":"📜"}
function importance(n){const v=Math.max(1,Math.min(5,Number(n)||3));return "★".repeat(v)+"☆".repeat(5-v)}
function card(e){const sources=e.sources||[];return`<article class="history-card" data-category="${esc(e.category||"अन्य")}"><div class="history-icon">${typeIcon(e)}</div><div class="history-body"><div class="history-meta"><span class="history-cat">${esc(e.category||"इतिहास")}</span><span class="history-confidence ${esc(e.confidence||"medium")}">${e.confidence==="high"?"✓ प्रमाणित":e.confidence==="medium"?"◐ समीक्षा गरिएको":"? थप प्रमाणीकरण"}</span></div><h2>${esc(e.title||"ऐतिहासिक घटना")}</h2><div class="history-stars">${importance(e.importance)}</div><p>${esc(e.summary||"")}</p>${e.why_important?`<div class="why-important"><b>किन महत्वपूर्ण?</b><span>${esc(e.why_important)}</span></div>`:""}<div class="history-footer"><span>${e.year_bs?"वि.सं. "+esc(e.year_bs):e.year?"वर्ष "+esc(e.year):""}</span><span>${sources.length||e.source?"स्रोत "+(sources.length||1):""}</span></div>${e.url?`<a class="source-link" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">मुख्य स्रोत →</a>`:""}</div></article>`}
function renderHistory(es){const el=document.getElementById("historyList");if(!el)return;el.innerHTML=es.length?es.map(card).join(""):'<div class="history-empty"><b>यस दिनका लागि प्रमाणित घटना अभिलेखमा छैन।</b><p>दैनिक अनुसन्धान स्रोतहरू पुनः जाँचिन्छन्।</p></div>'}
function renderCulture(day){const el=document.getElementById("cultureList");if(!el)return;const a=[];if(typeof day.festival==="string"&&day.festival)a.push(`<article class="culture-card"><span>🎉</span><div><b>आजको पर्व/अवलोकन</b><h3>${esc(day.festival)}</h3><a href="../panchanga/?date=${encodeURIComponent(day.ad?.date||"")}">विस्तृत पञ्चाङ्ग →</a></div></article>`);if(day.tithi?.name)a.push(`<article class="culture-card"><span>🌙</span><div><b>आजको तिथि</b><h3>${esc(day.tithi.name)}</h3><p>पक्ष: ${esc(day.tithi.paksha||"—")} · नक्षत्र: ${esc(day.nakshatra?.name||"—")}</p></div></article>`);el.innerHTML=a.join("")||'<div class="history-empty">आजका लागि छुट्टै पर्व अभिलेख छैन।</div>'}
function renderStats(d){const s=document.getElementById("researchStats");if(!s)return;s.innerHTML=`<span>🔎 स्रोत ${Number(d.research?.sources_checked||d.sources?.length||0)}</span><span>📜 घटना ${(d.events||[]).length}</span><span>✓ प्रमाणित ${(d.events||[]).filter(x=>x.confidence==="high").length}</span><span>🕐 ${d.last_researched?new Date(d.last_researched).toLocaleDateString("ne-NP"):"अझै अनुसन्धान भएको छैन"}</span>`}
function search(all,q){q=q.trim().toLowerCase();renderHistory((q?all.filter(e=>[e.title,e.summary,e.category,e.tags,e.year,e.year_bs].flat().join(" ").toLowerCase().includes(q)):all).slice(0,50))}
function wire(all){const input=document.getElementById("historySearch");input?.addEventListener("input",e=>search(all,e.target.value));document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");const v=b.dataset.filter;renderHistory(v==="all"?all:all.filter(e=>(e.category||"अन्य")===v))}))}
async function load(){
 const t=today();
 document.getElementById("historySub").textContent=`इ.सं. ${t.iso} · दैनिक अनुसन्धान अभिलेख`;
 let bs=null,hist=null;
 try{bs=await findDay(t.iso,t.year)}catch(e){console.error("BS lookup failed",e)}
 if(bs){
   const slug=MONTHS[+bs.bs.month];
   if(slug){try{hist=await fetchJSON(`${ROOT}data/itihas/${slug}/${+bs.bs.day}.json`)}catch(e){console.error("History JSON failed",e)}}
   document.getElementById("historyDate").textContent=(bs.bs.display||`${MONTH_NE[+bs.bs.month]} ${bs.bs.day}`)+" · आजको इतिहास";
   renderCulture(bs);
 }
 if(hist){renderStats(hist);renderHistory(hist.events||[]);wire(hist.events||[]);return}
 if(!bs){
   document.getElementById("historyList").innerHTML='<div class="history-empty"><b>आजको इतिहास अस्थायी रूपमा उपलब्ध भएन।</b><p>पात्रो डेटा पुनः प्रयास गर्दैछ।</p></div>';
   return;
 }
 document.getElementById("historyList").innerHTML='<div class="history-empty"><b>आजको इतिहास अभिलेख उपलब्ध छैन।</b><p>यो मितिको अनुसन्धान फाइल अझै प्रकाशित भएको छैन।</p></div>';
}
load().catch(e=>{console.error("itihas-aaja fatal",e);document.getElementById("historyList").innerHTML='<div class="history-empty"><b>आजको इतिहास अस्थायी रूपमा उपलब्ध भएन।</b><p>केही समयपछि पुनः प्रयास गर्नुहोस्।</p></div>'});
})();
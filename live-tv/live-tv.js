(()=>{
const LIST='https://raw.githubusercontent.com/LaxmanNepal/LaxmanNepalApps/main/TV/list.json';
const HEALTH='https://apps.laxmannepal.com.np/Nepali-Patro/data/live-tv-health.json';
const SOURCE='https://apps.laxmannepal.com.np/Nepali-Patro/data/live-tv-sources.json';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials=s=>String(s||'TV').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let channels=[],health={},sources={};
async function json(url,name,ttl){if(window.NPDataCache){const r=await NPDataCache.fetchJSON(url,name,{ttl});return r.value}const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(r.status);return r.json()}
async function loadCatalog(){
 const [list,h,s]=await Promise.allSettled([json(LIST,'live-tv-catalog',300000),json(HEALTH,'live-tv-health',900000),json(SOURCE,'live-tv-sources',900000)]);
 const raw=list.status==='fulfilled'?list.value:[]; channels=Array.isArray(raw)?raw:(raw.channels||raw.data||[]); const hr=h.status==='fulfilled'?h.value:{}; const sr=s.status==='fulfilled'?s.value:{};
 (hr.results||[]).forEach(x=>health[x.id||x.name]=x); sources=sr.channels||sr||{}; return channels;
}
function channelSources(c){const id=c.id||c.slug||c.name;const extra=sources[id];let a=[];if(Array.isArray(c.sources))a.push(...c.sources);if(c.stream)a.push(c.stream);if(c.url)a.push(c.url);if(Array.isArray(extra))a.push(...extra);else if(extra?.sources)a.push(...extra.sources);else if(extra?.urls)a.push(...extra.urls);const h=health[id]||health[c.name];if(Array.isArray(h?.checks)){const good=h.checks.filter(x=>x.ok||x.status==='online').map(x=>x.url||x.stream).filter(Boolean);a=[...good,...a]}return [...new Set(a.filter(Boolean).map(x=>typeof x==='string'?x:x.url||x.stream))]}
function healthBadge(c){const h=health[c.id||c.slug||c.name]||health[c.name];if(!h)return '<span class="tv-health unknown">जाँच नभएको</span>';const ok=h.status==='online'||h.online===true||h.workingSource!==undefined;const t=h.checkedAt||h.updatedAt||h.checked_at;const age=t?Math.max(0,Math.round((Date.now()-Date.parse(t))/60000)):null;return `<span class="tv-health ${ok?'online':'offline'}">${ok?'🟢 LIVE':'🔴 Offline'}${age!==null?` · ${age<1?'अहिले':age+' मिनेट अघि'}`:''}</span>`}
let player=null,current=0,retryTimer=null;
async function playChannel(index,attempt=0){if(!channels.length)return;current=(index+channels.length)%channels.length;const c=channels[current],urls=channelSources(c);clearTimeout(retryTimer);if(!urls.length){showError(c,'यस channel को working stream भेटिएन।');return}const url=urls[Math.min(attempt,urls.length-1)];showLoading(c,attempt,urls.length);try{await window.playLiveStream?.(url,c);player?.play?.().catch(()=>{});}catch(e){if(attempt+1<Math.min(urls.length,3)){retryTimer=setTimeout(()=>playChannel(current,attempt+1),attempt===0?2000:attempt===1?5000:10000)}else showError(c,'Stream चल्न सकेन। Retry वा अर्को channel प्रयोग गर्नुहोस्।')}}
function showLoading(c,a,total){const el=document.querySelector('[data-tv-status]');if(el)el.innerHTML=`⏳ ${esc(c.name||c.title)} · source ${a+1}/${total}`}
function showError(c,msg){const el=document.querySelector('[data-tv-status]');if(el)el.innerHTML=`⚠️ ${esc(msg)} <button type="button" data-tv-retry>Retry</button>`;document.querySelector('[data-tv-retry]')?.addEventListener('click',()=>playChannel(current,0))}
function wireSwipe(el){let x=0,y=0;el.addEventListener('touchstart',e=>{x=e.touches[0].clientX;y=e.touches[0].clientY},{passive:true});el.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy))playChannel(current+(dx<0?1:-1))},{passive:true})}
window.NPLiveTV={loadCatalog,playChannel,channelSources,healthBadge,wireSwipe};
document.addEventListener('DOMContentLoaded',async()=>{try{await loadCatalog();document.dispatchEvent(new CustomEvent('np:live-tv-ready',{detail:{channels,health,sources}}))}catch(e){console.error('Live TV catalog:',e)}});
})();

/* Nepali Patro — All Tools V2 */
(function(){'use strict';if(window.__NP_ALL_TOOLS__)return;window.__NP_ALL_TOOLS__=true;
const BASE=new URL('../',location.href);const MANIFEST=new URL('../data/tool-manifest.json',location.href);
const $=s=>document.querySelector(s);
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function hrefOf(url){if(!url)return '#';if(/^https?:\/\//i.test(url))return url;if(url.startsWith('/'))return url;return new URL(url.replace(/^\.\//,''),BASE).href;}
function boot(){
 const grid=$('#allToolsContent'),search=$('#allToolsSearch'),cats=$('#allToolsCategories'),result=$('#allToolsResults'),toolCount=$('#allToolCount'),catCount=$('#allCategoryCount');
 if(!grid)return;
 fetch(MANIFEST,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('manifest');return r.json()}).then(data=>{
  const raw=Array.isArray(data.tools)?data.tools:[];const seen=new Set();const tools=raw.filter(t=>{const key=String(t.url||t.path||t.id||'').toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true}).map(t=>({...t,category:t.category||guessCategory(t)}));
  const categories=['सबै',...Array.from(new Set(tools.map(t=>t.category))).sort((a,b)=>a.localeCompare(b,'ne'))];let active='सबै';
  toolCount.textContent=tools.length;catCount.textContent=categories.length-1;
  cats.innerHTML=categories.map((c,i)=>`<button class="all-cat${i===0?' active':''}" type="button" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  cats.querySelectorAll('.all-cat').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.cat;cats.querySelectorAll('.all-cat').forEach(x=>x.classList.toggle('active',x===b));render();}));
  function render(){const q=(search.value||'').trim().toLocaleLowerCase('ne');const list=tools.filter(t=>{const text=[t.name,t.title,t.description,t.id,t.category].join(' ').toLocaleLowerCase('ne');return (active==='सबै'||t.category===active)&&(!q||text.includes(q));});result.textContent=`${list.length} वटा उपकरण तथा सेवा देखाइँदैछ`;
   if(!list.length){grid.innerHTML='<div class="all-empty">🔎 खोजीसँग मिल्ने उपकरण भेटिएन। अर्को शब्द प्रयोग गर्नुहोस्।</div>';return;}
   const groups=active==='सबै'?groupBy(list):new Map([[active,list]]);let n=0;grid.innerHTML=Array.from(groups.entries()).map(([cat,items])=>`<section class="all-category"><div class="all-category-head"><h2 class="all-category-title">${esc(cat)}</h2><span class="all-category-count">${items.length} उपकरण</span></div><div class="all-tools-grid">${items.map(t=>{const i=n++;const external=/^https?:\/\//i.test(String(t.url||''));return `<a class="all-tool-card" style="--i:${i}" href="${esc(hrefOf(t.url||t.path))}"${external?' target="_blank" rel="noopener"':''}><span class="all-tool-icon">${esc(t.icon||'🧰')}</span><span class="all-tool-name">${esc(t.name||t.title||t.id)}</span><span class="all-tool-desc">${esc(clean(t.description||t.title||''))}</span><span class="all-tool-arrow">खोल्नुहोस् →</span></a>`}).join('')}</div></section>`).join('');
  }}
  function groupBy(list){const m=new Map();list.forEach(t=>{if(!m.has(t.category))m.set(t.category,[]);m.get(t.category).push(t)});return m}
  search.addEventListener('input',render);render();
 }).catch(()=>{grid.innerHTML='<div class="all-empty">⚠️ उपकरण सूची लोड हुन सकेन। कृपया केही बेरपछि पुनः प्रयास गर्नुहोस्।</div>';});
}
function clean(s){return String(s).replace(/\s+/g,' ').replace(/\|.*$/,'').trim();}
function guessCategory(t){const id=String(t.id||'').toLowerCase();if(/calendar|patro|tithi|panchang|panchanga|saait|saith|vedic/.test(id))return'पात्रो तथा ज्योतिष';if(/gold|forex|interest|nepse|petroleum/.test(id))return'दर तथा बजार';if(/news|radio|live-tv/.test(id))return'समाचार तथा मनोरञ्जन';if(/game|meme/.test(id))return'मनोरञ्जन';if(/government|goverment|dharma|festival|parba/.test(id))return'नेपाल तथा संस्कृति';if(/converter|preeti/.test(id))return'रूपान्तरण';return'अन्य उपकरण';}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

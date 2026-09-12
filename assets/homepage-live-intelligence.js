/* Nepali Patro V4 Phase 4 — Live Intelligence Rail */
(function(){'use strict';
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=el=>(el?.textContent||'').replace(/\s+/g,' ').trim();
const clean=s=>String(s||'').replace(/^[:：\-–—\s]+/,'').trim();
function extractPanchang(){
 const root=document.querySelector('#panchangaPreview'); if(!root)return [];
 const out=[]; root.querySelectorAll('*').forEach(el=>{
  if(el.children.length>0)return; const t=clean(text(el)); if(!t)return;
  const p=el.parentElement; const pt=clean(text(p));
  if(!p||pt.length>120)return;
  if(/तिथि|सूर्योदय|सूर्यास्त|नक्षत्र|योग|करण/.test(pt))out.push(pt);
 });
 return [...new Set(out)].slice(0,4);
}
function extractFestival(){const el=document.querySelector('#parbaPreview');if(!el)return '';const t=text(el);if(!t||/लोड हुँदैछ/.test(t))return '';return t.split('→')[0].trim().slice(0,80)}
function extractNews(){const el=document.querySelector('#newsPreview');if(!el)return '';const a=el.querySelector('a');const t=text(a||el);if(!t||/लोड हुँदैछ/.test(t))return '';return t.slice(0,92)}
function getDate(){return clean(text(document.querySelector('#todayBs')))}
function build(){
 let rail=document.querySelector('.live-intelligence-rail'); if(!rail){
  const card=document.querySelector('.today-main-card'); if(!card)return;
  rail=document.createElement('section');rail.className='live-intelligence-rail';rail.setAttribute('aria-label','आजको लाइभ जानकारी');card.insertAdjacentElement('afterend',rail);
 }
 const p=extractPanchang(), festival=extractFestival(), news=extractNews(), date=getDate();
 const items=[];
 if(date&&date!=='लोड हुँदैछ…')items.push(['📅','आज',date,'']);
 if(p[0])items.push(['🌙','तिथि',p[0],'https://apps.laxmannepal.com.np/Nepali-Patro/panchanga/']);
 if(p.find(x=>/सूर्योदय/.test(x)))items.push(['☀️','सूर्योदय / सूर्यास्त',p.filter(x=>/सूर्योदय|सूर्यास्त/.test(x)).join(' · '),'https://apps.laxmannepal.com.np/Nepali-Patro/panchanga/']);
 if(festival)items.push(['🎉','आजको पर्व',festival,'https://apps.laxmannepal.com.np/Nepali-Patro/parba/']);
 if(news)items.push(['📰','समाचार',news,'https://apps.laxmannepal.com.np/Nepali-Patro/news/']);
 items.push(['📈','NEPSE','आजको बजार हेर्नुहोस्','https://apps.laxmannepal.com.np/Nepali-Patro/nepse/']);
 items.push(['🪙','सुन','आजको सुनको मूल्य हेर्नुहोस्','https://apps.laxmannepal.com.np/Nepali-Patro/gold-price/']);
 rail.innerHTML='<div class="intelligence-track">'+items.map(([icon,label,value,href])=>`<a class="intelligence-item" href="${esc(href||'#')}"${href?'':' tabindex="-1"'}><span class="intelligence-icon">${icon}</span><span class="intelligence-copy"><small>${esc(label)}</small><strong>${esc(clean(value))}</strong></span><span class="intelligence-arrow">→</span></a>`).join('')+'</div>';
}
function ready(){if(!document.body?.classList.contains('home-redesign'))return;build();const ids=['panchangaPreview','parbaPreview','newsPreview','todayBs'];const observer=new MutationObserver(()=>build());ids.forEach(id=>{const el=document.getElementById(id);if(el)observer.observe(el,{subtree:true,childList:true,characterData:true})});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();

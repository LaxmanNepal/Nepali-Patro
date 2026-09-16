/* Nepali Patro V4 Phase 3 — Upcoming festival & holiday countdown */
(function(){'use strict';
const ready=()=>{
 const body=document.body;if(!body||!body.classList.contains('home-redesign'))return;
 const section=document.querySelector('.daily-hub');if(!section)return;
 section.classList.add('smart-today','upcoming-festivals');
 const heading=section.querySelector('.np-heading');
 if(heading){
  const small=heading.querySelector('small');if(small)small.textContent='दैनिक जानकारी';
  const h2=heading.querySelector('h2');if(h2)h2.textContent='आउँदा पर्व';
 }
 const cards=[...section.querySelectorAll('.daily-hub-card')];
 const festivalCard=section.querySelector('.festivals-card');
 const zodiacCard=section.querySelector('.zodiac-card');
 if(zodiacCard)zodiacCard.style.display='none';
 if(festivalCard){
  festivalCard.classList.add('upcoming-festival-card');
  const title=festivalCard.querySelector('.daily-card-head h3');
  if(title)title.textContent='आउँदा पर्व तथा बिदा';
  const label=festivalCard.querySelector('.daily-card-head small');
  if(label)label.textContent='अब आउने';
  const link=festivalCard.querySelector('.daily-card-head a');
  if(link)link.textContent='सबै पर्व →';
 }
 const style=document.createElement('style');style.id='npUpcomingFestivalCss';style.textContent=`
 .daily-hub.upcoming-festivals .daily-hub-grid{grid-template-columns:1fr}
 .daily-hub.upcoming-festivals .upcoming-festival-card{width:100%}
 .np-upcoming-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
 .np-upcoming-item{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;padding:13px;border:1px solid rgba(127,127,127,.15);border-radius:15px;background:rgba(255,255,255,.45);text-decoration:none;color:inherit;min-width:0}
 .dark .np-upcoming-item,.shared-dark .np-upcoming-item{background:rgba(255,255,255,.035)}
 .np-upcoming-count{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:58px;height:58px;border-radius:14px;background:rgba(220,38,38,.10);color:#b91c1c;font-weight:900;line-height:1.05}
 .np-upcoming-count strong{font-size:20px}.np-upcoming-count small{font-size:9px;margin-top:3px}
 .np-upcoming-name{font-weight:850;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.np-upcoming-date{font-size:11px;opacity:.62;margin-top:3px}.np-upcoming-type{display:inline-flex;margin-top:5px;padding:2px 7px;border-radius:999px;background:rgba(127,127,127,.10);font-size:9px;font-weight:800}
 .np-upcoming-empty{padding:20px;text-align:center;opacity:.65;border:1px dashed rgba(127,127,127,.2);border-radius:15px}
 @media(max-width:800px){.np-upcoming-list{grid-template-columns:1fr 1fr}}
 @media(max-width:520px){.np-upcoming-list{grid-template-columns:1fr}.np-upcoming-item{padding:11px}}
 `;document.head.appendChild(style);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
 const nep=n=>String(n??'').replace(/\d/g,d=>'०१२३४५६७८९'[d]);
 const eventList=d=>{const events=Array.isArray(d?.events)?d.events.filter(Boolean):d?.events?[d.events]:[];return [d?.festival,...events].filter(Boolean).map(String).filter((v,i,a)=>a.indexOf(v)===i)};
 const isHoliday=d=>d?.holiday===true||String(d?.holiday??'').trim()!=='';
 const dateMs=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));return m?Date.UTC(+m[1],+m[2]-1,+m[3]):NaN};
 const paint=()=>{
  const host=document.getElementById('parbaPreview');const state=window.NepaliPatroHome?.state;const days=state?.calendar?.data?.days||[];const today=state?.todayAd;
  if(!host||!today||!days.length)return false;
  const todayTime=dateMs(today);if(!Number.isFinite(todayTime))return false;
  const upcoming=days.map(d=>({d,events:eventList(d)})).filter(x=>{const t=dateMs(x.d?.ad?.date);return Number.isFinite(t)&&t>=todayTime&&(x.events.length||isHoliday(x.d))}).sort((a,b)=>dateMs(a.d.ad.date)-dateMs(b.d.ad.date));
  const unique=[];const seen=new Set();
  for(const item of upcoming){const key=item.d.ad.date+'|'+item.events.join('|')+'|'+isHoliday(item.d);if(seen.has(key))continue;seen.add(key);unique.push(item);if(unique.length>=6)break}
  if(!unique.length){host.innerHTML='<div class="np-upcoming-empty">नजिकै कुनै पर्व वा बिदा भेटिएन।</div>';return true}
  host.innerHTML='<div class="np-upcoming-list">'+unique.map(({d,events})=>{const diff=Math.max(0,Math.round((dateMs(d.ad.date)-todayTime)/86400000));const name=events[0]||'सार्वजनिक बिदा';const type=isHoliday(d)?'🔴 बिदा':'🎉 पर्व';return `<div class="np-upcoming-item"><div class="np-upcoming-count"><strong>${diff===0?'आज':nep(diff)}</strong><small>${diff===0?'':'दिन बाँकी'}</small></div><div><div class="np-upcoming-name">${esc(name)}</div><div class="np-upcoming-date">${esc(d.bs?.display||'')} · ${esc(d.ad?.date||'')}</div><span class="np-upcoming-type">${type}</span></div></div>`}).join('')+'</div>';
  return true;
 };
 const tryPaint=()=>{if(!paint())setTimeout(tryPaint,250)};
 tryPaint();
 const unsubscribe=window.NepaliPatroHome?.subscribe?.(()=>paint());
 setTimeout(()=>{try{unsubscribe?.()}catch(_){}},15000);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();

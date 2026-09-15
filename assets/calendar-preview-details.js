/* Nepali Patro — richer homepage month calendar cells */
(function(){'use strict';
  const BASE='/Nepali-Patro/';
  const np=n=>String(n).replace(/\d/g,d=>'०१२३४५६७८९'[d]);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu'}).format(new Date());
  const months=['बैशाख','जेठ','असार','साउन','भदौ','असोज','कात्तिक','मंसिर','पुष','माघ','फागुन','चैत'];
  const weekdays=['आइत','सोम','मंगल','बुध','बिही','शुक्र','शनि'];
  const css=`
  .np-home-cal-day{position:relative;min-height:76px!important;padding:7px!important;gap:1px}
  .np-home-cal-day .np-cal-main{display:flex;align-items:baseline;justify-content:space-between;gap:4px}
  .np-home-cal-day .np-cal-main b{font-size:19px;line-height:1.1}
  .np-home-cal-day .np-cal-ad{font-size:10px;color:#6b7280}
  .np-home-cal-day .np-cal-tithi{font-size:10px;line-height:1.25;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}
  .np-home-cal-day .np-cal-meta{display:flex;align-items:center;gap:3px;margin-top:auto;min-height:14px}
  .np-home-cal-day .np-cal-holiday{font-size:9px;font-weight:800;color:#b91c1c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .np-home-cal-day .np-cal-festival{font-size:9px;color:#7c3aed;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .np-home-cal-day.today .np-cal-tithi{font-weight:700}
  @media(max-width:650px){
    .np-home-cal-day{min-height:66px!important;padding:5px!important}
    .np-home-cal-day .np-cal-main b{font-size:16px}
    .np-home-cal-day .np-cal-ad{font-size:9px}
    .np-home-cal-day .np-cal-tithi{font-size:8.5px}
    .np-home-cal-day .np-cal-holiday,.np-home-cal-day .np-cal-festival{font-size:7.5px}
  }`;
  function addCss(){if(document.getElementById('np-home-calendar-details-css'))return;const s=document.createElement('style');s.id='np-home-calendar-details-css';s.textContent=css;document.head.appendChild(s)}
  async function loadYear(year){if(!window.NPCalendarData)return null;const r=await window.NPCalendarData.year(year,{bust:false});return r.data}
  async function render(){
    const el=document.getElementById('calendarPreview'); if(!el)return;
    try{
      if(!window.NPCalendarData){
        await new Promise(resolve=>{const s=document.createElement('script');s.src='/Nepali-Patro/js/core/data-client.js';s.onload=resolve;s.onerror=resolve;document.head.appendChild(s)});
        await new Promise(resolve=>{const s=document.createElement('script');s.src='/Nepali-Patro/js/core/calendar-data.js';s.onload=resolve;s.onerror=resolve;document.head.appendChild(s)});
      }
      if(!window.NPCalendarData)return;
      const now=new Date();const gy=+new Intl.DateTimeFormat('en',{timeZone:'Asia/Kathmandu',year:'numeric'}).format(now);const gm=+new Intl.DateTimeFormat('en',{timeZone:'Asia/Kathmandu',month:'numeric'}).format(now);
      let data=await loadYear(gy+57);let current=data?.days?.find(x=>x.ad?.date?.slice(0,7)===gy+'-'+String(gm).padStart(2,'0'));
      const by=current?.bs?.year??gy+57,bm=current?.bs?.month??1;data=await loadYear(by);const all=(data?.days||[]).filter(x=>x.bs?.month===bm);
      if(!all.length)return;
      const first=all[0],start=new Date(first.ad.date+'T00:00:00Z').getUTCDay();
      const header=`<div class="np-home-cal-head"><div><small style="display:block;color:#6b7280;font-size:11px">महिना</small><strong>${months[bm-1]} ${np(by)}</strong></div><a href="${BASE}calendar/">पूर्ण पात्रो →</a></div>`;
      const heads=weekdays.map(d=>`<span class="np-home-cal-week">${d}</span>`).join('');
      const blanks=Array(start).fill('<span class="np-home-cal-empty"></span>').join('');
      const cells=all.map(x=>{
        const isToday=x.ad.date===today();const holiday=x.holiday===true||String(x.holiday??'').trim()!=='';const festival=String(x.festival||'').trim();
        const tithi=String(x.tithi?.name||'').trim();
        const label=festival|| (holiday?'बिदा':'');
        return `<a class="np-home-cal-day ${isToday?'today ':''}${holiday?'holiday':''}" href="${BASE}calendar/?date=${encodeURIComponent(x.ad.date)}" aria-label="${esc(x.bs.display)} — ${esc(tithi)} — ${esc(x.ad.date)}"><div class="np-cal-main"><b>${np(x.bs.day)}</b><span class="np-cal-ad">${x.ad.day}</span></div>${tithi?`<div class="np-cal-tithi">${esc(tithi)}</div>`:''}<div class="np-cal-meta">${label?`<span class="${holiday?'np-cal-holiday':'np-cal-festival'}">${holiday?'🇳🇵 ':''}${esc(label)}</span>`:''}</div></a>`;
      }).join('');
      addCss();el.innerHTML=header+`<div class="np-home-cal-grid">${heads}${blanks}${cells}</div>`;
    }catch(e){console.warn('calendar preview details:',e)}
  }
  function boot(){if(document.getElementById('calendarPreview'))render();else setTimeout(boot,100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

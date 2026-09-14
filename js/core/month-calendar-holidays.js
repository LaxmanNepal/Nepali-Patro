/* Month calendar presentation layer: only official holidays receive red highlighting. */
(()=>{
  'use strict';
  const boot=()=>{
    const grid=document.querySelector('#grid');
    const year=document.querySelector('#year');
    const month=document.querySelector('#month');
    if(!grid||!year||!month)return;
    const style=document.createElement('style');
    style.id='npHolidayOnlyCalendarCss';
    style.textContent='.cal-day.event{border-color:#e5e7eb;background:#fff;color:#111}.cal-day.event span{color:#666;font-weight:400}.cal-day:hover,.cal-day.selected{border-color:#e5e7eb;box-shadow:0 4px 16px #00000012}.cal-day.today{outline:2px solid #3b82f6;outline-offset:1px}.cal-day.holiday{border-color:#dc2626!important;background:#fff7f7!important;color:#b91c1c!important}.cal-day.holiday span{color:#dc2626!important;font-weight:800}.dark .cal-day.event,.shared-dark .cal-day.event{background:#17171c;color:#f8fafc}.dark .cal-day.holiday,.shared-dark .cal-day.holiday{background:rgba(220,38,38,.10)!important}';
    document.head.appendChild(style);
    let lastKey='';
    async function sync(){
      const y=Number(year.value),m=Number(month.value);
      if(!y||!m)return;
      const key=`${y}-${m}`;
      if(key===lastKey&&grid.querySelector('.cal-day'))return;
      lastKey=key;
      const result=window.NPCalendarData?.year?await window.NPCalendarData.year(y,{bust:false}):await window.NPData?.get('calendar',{year:y,bust:false});
      const days=result?.data?.days||[];
      const holidays=new Set(days.filter(d=>d?.holiday===true||String(d?.holiday??'').trim()!=='').map(d=>d.ad?.date).filter(Boolean));
      grid.querySelectorAll('.cal-day').forEach(el=>el.classList.toggle('holiday',holidays.has(el.dataset.date)));
    }
    const observer=new MutationObserver(()=>requestAnimationFrame(sync));
    observer.observe(grid,{childList:true,subtree:true});
    year.addEventListener('change',()=>{lastKey='';sync()});
    month.addEventListener('change',()=>{lastKey='';sync()});
    new MutationObserver(()=>requestAnimationFrame(sync)).observe(year,{attributes:true,attributeFilter:['value']});
    sync();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

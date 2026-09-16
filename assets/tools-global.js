/* Laxman Nepal — global tools enhancement */
(function(){
  'use strict';
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function removeLegacyServices(){
    qa('.featured-services,.services-section,[data-section="services"]').forEach(function(el){el.remove()});
  }
  function ensureUniversalShell(){
    var head=q('[data-page-shell="header"]');
    var foot=q('[data-page-shell="footer"]');
    if(head&&foot&&window.PageShell&&typeof window.PageShell.mount==='function') window.PageShell.mount({header:head,footer:foot});
  }
  function ensureCalendarPreview(){
    var host=q('#calendarPreview');
    if(!host||host.dataset.ready==='1') return;
    var now=new Date();
    var gy=now.getUTCFullYear();
    var nm=now.getUTCMonth()+1;
    var ny=gy+57;
    var data=(window.NepaliCalendarData&&typeof window.NepaliCalendarData.getMonth==='function')?window.NepaliCalendarData.getMonth(ny,nm):null;
    if(!Array.isArray(data)||!data.length) return;
    host.dataset.ready='1';
    var first=data[0];
    var title=(first&&first.year?first.year:ny)+' '+(first&&first.monthName?first.monthName:'');
    var html='<div class="np-home-cal-head"><strong>'+title+'</strong><span>नेपाली पात्रो</span></div>';
    html+='<div class="np-home-cal-week"><span>आइत</span><span>सोम</span><span>मंगल</span><span>बुध</span><span>बिहि</span><span>शुक्र</span><span>शनि</span></div>';
    html+='<div class="np-home-cal-grid">';
    var start=first&&typeof first.weekday==='number'?first.weekday:0;
    for(var i=0;i<start;i++) html+='<div class="np-home-cal-empty" aria-hidden="true"></div>';
    data.forEach(function(x){
      var holiday=x.holiday===true||String(x.holiday??'').trim().toLowerCase()==='true';
      var festival=String(x.festival||'').trim();
      var cls='np-home-cal-day'+(holiday?' holiday':'');
      var meta=festival||(holiday?'बिदा':'');
      html+='<div class="'+cls+'"><b>'+String(x.day||'')+'</b>'+(meta?'<small>'+meta+'</small>':'')+'</div>';
    });
    html+='</div>';
    host.innerHTML=html;
  }
  function makeUI(){
    if(!document.getElementById('np-global-tools-style')){
      var st=document.createElement('style');st.id='np-global-tools-style';st.textContent='.np-home-cal-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.np-home-cal-head strong{font-size:1rem}.np-home-cal-head span{font-size:.78rem;opacity:.7}.np-home-cal-week,.np-home-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.np-home-cal-week span{text-align:center;font-size:.72rem;opacity:.72}.np-home-cal-day,.np-home-cal-empty{min-height:76px;min-width:0;border-radius:12px;padding:8px;box-sizing:border-box}.np-home-cal-day{background:rgba(127,127,127,.08);display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}.np-home-cal-day b{font-size:.95rem}.np-home-cal-day small{font-size:.68rem;line-height:1.25;white-space:normal;overflow:hidden}.np-home-cal-day.holiday{color:#d00;background:rgba(220,0,0,.07)}.np-home-cal-empty{visibility:hidden}@media(max-width:650px){.np-home-cal-week,.np-home-cal-grid{gap:3px}.np-home-cal-day,.np-home-cal-empty{min-height:66px;padding:6px;border-radius:9px}.np-home-cal-day small{font-size:.6rem}}';document.head.appendChild(st);
    }
  }
  function loadIntelCard(){
    var el=q('[data-intel-card]');
    if(!el||el.dataset.loaded==='1') return;
    el.dataset.loaded='1';
  }
  function boot(){
    removeLegacyServices();
    makeUI();
    ensureUniversalShell();
    ensureCalendarPreview();
    loadIntelCard();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

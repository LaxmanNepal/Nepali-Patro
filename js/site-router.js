(function(){
  const path=location.pathname.replace(/\/+$/,'/');
  const baseIndex=path.toLowerCase().indexOf('/nepali-patro/')>=0;
  if(!baseIndex) return;
  const key=(path.split('/').filter(Boolean).pop()||'').toLowerCase();
  const routes={calendar:'calendar',patro:'calendar',panchanga:'panchang',panchang:'panchang',parba:'festivals',festivals:'festivals',saith:'saait',saait:'saait',rashifal:'rashifal',news:'news',converter:'converter'};
  const target=routes[key];
  const $=s=>document.querySelector(s);
  function href(name,query){const base=location.pathname.split('/nepali-patro/')[0]+'/nepali-patro/';return base+name+'/'+(query||'')}
  function setActive(name){document.querySelectorAll('[data-site-nav]').forEach(a=>a.classList.toggle('active',a.dataset.siteNav===name));}
  function showOnly(id){
    const main=document.querySelector('main'); if(!main)return;
    const sections=[...main.querySelectorAll(':scope > section')];
    if(!target){sections.forEach(s=>s.classList.remove('route-hidden'));return;}
    const keep=new Set([target]);
    if(target==='calendar') keep.add('dayDetail');
    sections.forEach(s=>s.classList.toggle('route-hidden',!keep.has(s.id)));
    $('#homepageNewsSection')?.classList.add('route-hidden');
    $('#quick')?.classList.add('route-hidden');
    document.body.classList.add('detail-route');
  }
  function dateFromQuery(){return new URLSearchParams(location.search).get('date')||''}
  function selectQueryDate(){
    const q=dateFromQuery(); if(!q || !window.DATA || !Array.isArray(DATA.days)) return;
    let i=DATA.days.findIndex(x=>x.ad?.date===q || `${x.bs?.year}-${String(x.bs?.month).padStart(2,'0')}-${String(x.bs?.day).padStart(2,'0')}`===q);
    if(i<0)return;
    window.selectedIndex=i; window.currentYear=DATA.days[i].bs.year; window.viewMonth=DATA.days[i].bs.month;
    if(typeof renderPanchang==='function')renderPanchang();
    if(typeof renderDetail==='function')renderDetail();
    if(typeof renderZodiac==='function')renderZodiac();
    const title=$('#detailTitle'); if(title) title.textContent=DATA.days[i].bs.display;
    const label=$('.panchanga-date-label'); if(label) label.textContent=`${DATA.days[i].bs.display} · ${DATA.days[i].ad.date}`;
  }
  function installNav(){
    const nav=$('.desktop-nav'); if(!nav)return;
    if(!document.querySelector('.mobile-nav')){
      const m=document.createElement('nav'); m.className='mobile-nav'; m.setAttribute('aria-label','मोबाइल मुख्य मेनु');
      [['calendar','पात्रो','📅'],['panchang','पञ्चाङ्ग','☀'],['rashifal','राशिफल','♈'],['news','समाचार','📰'],['converter','रूपान्तरण','↔']].forEach(([id,label,icon])=>{const a=document.createElement('a');a.dataset.siteNav=id;a.href=href(id);a.innerHTML=`<span>${icon}</span><small>${label}</small>`;m.appendChild(a)});
      document.body.appendChild(m);
    }
    nav.querySelectorAll('button[data-section]').forEach(b=>{
      const sec=b.dataset.section; const routeName=sec==='calendar'?'calendar':sec==='panchang'?'panchang':sec==='festivals'?'parba':sec==='saait'?'saith':sec;
      b.onclick=e=>{e.preventDefault();location.href=href(routeName)};
    });
    document.querySelectorAll('[data-section]').forEach(b=>{if(b.closest('.desktop-nav'))return;b.addEventListener('click',e=>{const sec=b.dataset.section;if(!sec)return;e.preventDefault();const routeName=sec==='calendar'?'calendar':sec==='panchang'?'panchang':sec==='festivals'?'parba':sec==='saait'?'saith':sec;location.href=href(routeName);})});
  }
  function installDateNavigation(){
    document.addEventListener('click',e=>{
      const btn=e.target.closest('.day[data-day]'); if(!btn || !window.DATA)return;
      e.preventDefault(); e.stopImmediatePropagation();
      const m=window.viewMonth||1,d=+btn.dataset.day; const x=DATA.days.find(v=>v.bs?.month===m&&v.bs?.day===d); if(x) location.href=href('panchanga',`?date=${x.ad.date}`);
    },true);
  }
  function installFooter(){
    const f=document.querySelector('footer'); if(!f)return;
    f.innerHTML=`<div class="footer-grid"><div><b>नेपाली पात्रो</b><p>विक्रम संवत् पात्रो, पञ्चाङ्ग, पर्व, राशिफल र नेपाली समाचारका लागि स्वतन्त्र डिजिटल प्लेटफर्म।</p></div><div><strong>द्रुत लिंक</strong><a href="${href('calendar')}">पात्रो</a><a href="${href('panchanga')}">पञ्चाङ्ग</a><a href="${href('rashifal')}">राशिफल</a><a href="${href('news')}">समाचार</a></div><div><strong>महत्त्वपूर्ण सूचना</strong><p>पञ्चाङ्ग तथा ज्योतिषीय सामग्री सामान्य जानकारीका लागि मात्र हुन्। साइत, मुहूर्त, स्वास्थ्य, आर्थिक वा अन्य महत्वपूर्ण निर्णयअघि सम्बन्धित विज्ञसँग परामर्श गर्नुहोस्। समाचार सामग्री सम्बन्धित स्रोतको हो।</p></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} Laxman Nepal</span><span>नेपाली पात्रो · २०४०–२१०० BS</span></div>`;
  }
  function boot(){installNav();installDateNavigation();installFooter();showOnly(target);setActive(target||'');setTimeout(selectQueryDate,250);setTimeout(selectQueryDate,900);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
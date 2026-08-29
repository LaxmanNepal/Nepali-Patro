(()=>{
  // Canonical router: navigation/UI coordination only.
  // Content is owned by each page's canonical renderer; this file never synthesizes it.
  const ROOT=new URL('./',location.href).href;
  const routes={calendar:'calendar/',patro:'calendar/',panchanga:'panchanga/',panchang:'panchanga/',parba:'parba/',festivals:'parba/',saith:'saith/',saait:'saith/',rashifal:'rashifal/',news:'news/',converter:'converter/',itihas:'itihas-aaja/','itihas-aaja':'itihas-aaja/','gold-price':'gold-price/',forex:'forex/'};
  const href=(route,query='')=>new URL(route+query,ROOT).href;
  function installNav(){document.querySelectorAll('[data-section]').forEach(el=>{if(el.dataset.routerBound)return;const route=routes[String(el.dataset.section||'').toLowerCase()];if(!route)return;el.dataset.routerBound='1';el.addEventListener('click',e=>{if(el.tagName==='A')return;e.preventDefault();location.href=href(route)})})}
  function installDateNavigation(){document.addEventListener('click',e=>{const btn=e.target.closest('.day[data-day]');if(!btn||!window.DATA||!Array.isArray(DATA.days))return;const month=Number(window.viewMonth),day=Number(btn.dataset.day);const x=DATA.days.find(v=>Number(v.bs?.month)===month&&Number(v.bs?.day)===day);if(x){e.preventDefault();location.href=href('panchanga/',`?date=${encodeURIComponent(x.ad.date)}`)}},true)}
  function init(){installNav();installDateNavigation()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

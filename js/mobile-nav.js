(()=>{
const ROOT='https://apps.laxmannepal.com.np/Nepali-Patro/';
const INTEREST_URL=`${ROOT}interest-rate/`;
const addNepalInterestLink=()=>{
  const header=document.querySelector('header.np-header');
  const desktop=header?.querySelector(':scope > nav');
  if(desktop&&!desktop.querySelector('[data-nepal-interest]')){
    const a=document.createElement('a');
    a.href=INTEREST_URL;
    a.textContent='नेपाल';
    a.title='नेपाल — बैंक ब्याजदर';
    a.setAttribute('aria-label','नेपाल — बैंक ब्याजदर');
    a.dataset.nepalInterest='true';
    a.style.cssText='font-weight:700;color:var(--primary,#b91c1c);';
    desktop.appendChild(a);
  }
  const mobile=document.getElementById('mobileMenu');
  if(mobile&&!mobile.querySelector('[data-nepal-interest]')){
    const a=document.createElement('a');
    a.href=INTEREST_URL;
    a.textContent='🇳🇵 नेपाल — बैंक ब्याजदर';
    a.setAttribute('aria-label','नेपाल — बैंक ब्याजदर');
    a.dataset.nepalInterest='true';
    mobile.appendChild(a);
  }
};
const load=(kind,url)=>{const el=document.createElement(kind);if(kind==='link'){el.rel='stylesheet';el.href=`${url}?v=${Date.now().toString(36)}`}else{el.src=`${url}?v=${Date.now().toString(36)}`;el.defer=true}document.head.appendChild(el)};
const registerOffline=async()=>{if(!('serviceWorker'in navigator))return;try{const r=await navigator.serviceWorker.register(`${ROOT}sw.js`,{scope:ROOT,updateViaCache:'none'});await r.update()}catch(e){console.warn('offline cache unavailable',e)}const set=()=>{let b=document.getElementById('npOfflineBanner');if(!b){b=document.createElement('div');b.id='npOfflineBanner';b.textContent='अफलाइन मोड · क्यास गरिएको सामग्री देखाइँदैछ';Object.assign(b.style,{position:'fixed',left:'50%',bottom:'12px',transform:'translateX(-50%)',zIndex:'99999',padding:'8px 14px',borderRadius:'999px',background:'#111827',color:'#fff',font:'600 12px system-ui',boxShadow:'0 6px 20px rgba(0,0,0,.18)',display:'none'});document.body.appendChild(b)}b.style.display=navigator.onLine?'none':'block'};addEventListener('online',set);addEventListener('offline',set);document.readyState==='loading'?document.addEventListener('DOMContentLoaded',set,{once:true}):set()};
const init=()=>{addNepalInterestLink();requestAnimationFrame(addNepalInterestLink);setTimeout(addNepalInterestLink,100);setTimeout(addNepalInterestLink,1000);registerOffline();if(!document.querySelector('[data-shared-shell-loader]')){const s=document.createElement('script');s.src=`${ROOT}js/shared-shell.js?v=${Date.now().toString(36)}`;s.defer=true;s.dataset.sharedShellLoader='true';document.head.appendChild(s)}load('link',`${ROOT}css/today-engine.css`);load('script',`${ROOT}js/today-engine.js`);load('script',`${ROOT}js/core/storage.js`);load('script',`${ROOT}js/core/data-cache.js`);load('script',`${ROOT}js/core/global-search.js`);if(location.pathname.replace(/\/+$/,'/')===ROOT)load('script',`${ROOT}js/homepage-fixes.js`)};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();

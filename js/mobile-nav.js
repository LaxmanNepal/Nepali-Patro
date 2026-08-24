(()=>{
  const ROOT='https://apps.laxmannepal.com.np/Nepali-Patro/';
  const load=(kind,url)=>{const el=document.createElement(kind);if(kind==='link'){el.rel='stylesheet';el.href=`${url}?v=${Date.now().toString(36)}`}else{el.src=`${url}?v=${Date.now().toString(36)}`;el.defer=true}el.dataset.homeUpgrade='true';document.head.appendChild(el)};
  const isHome=location.pathname.replace(/\/+$/,'/')===ROOT;
  const registerOffline=async()=>{
    if(!('serviceWorker'in navigator))return;
    try{await navigator.serviceWorker.register(`${ROOT}sw.js`,{scope:ROOT})}catch(e){console.warn('Nepali Patro offline cache unavailable',e)}
    const setOffline=()=>{let b=document.getElementById('npOfflineBanner');if(!b){b=document.createElement('div');b.id='npOfflineBanner';b.textContent='अफलाइन मोड · क्यास गरिएको सामग्री देखाइँदैछ';Object.assign(b.style,{position:'fixed',left:'50%',bottom:'12px',transform:'translateX(-50%)',zIndex:'99999',padding:'8px 14px',borderRadius:'999px',background:'#111827',color:'#fff',font:'600 12px system-ui',boxShadow:'0 6px 20px rgba(0,0,0,.18)',display:'none'});document.body.appendChild(b)}b.style.display=navigator.onLine?'none':'block'};window.addEventListener('online',setOffline);window.addEventListener('offline',setOffline);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setOffline,{once:true});else setOffline();
  };
  const loadSharedShell=()=>{
    registerOffline();
    if(!document.querySelector('script[data-shared-shell-loader]')){
      const s=document.createElement('script');
      s.src=`${ROOT}js/shared-shell.js?v=${Date.now().toString(36)}`;
      s.defer=true;
      s.dataset.sharedShellLoader='true';
      document.head.appendChild(s);
    }
    load('link',`${ROOT}css/today-engine.css`);
    load('script',`${ROOT}js/today-engine.js`);
    if(isHome){
      load('script',`${ROOT}js/homepage-fixes.js`);
    }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadSharedShell,{once:true});
  else loadSharedShell();
})();
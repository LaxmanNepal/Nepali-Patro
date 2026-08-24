(()=>{
  const ROOT='https://apps.laxmannepal.com.np/Nepali-Patro/';
  const load=(kind,url)=>{const el=document.createElement(kind);if(kind==='link'){el.rel='stylesheet';el.href=`${url}?v=${Date.now().toString(36)}`}else{el.src=`${url}?v=${Date.now().toString(36)}`;el.defer=true}el.dataset.homeUpgrade='true';document.head.appendChild(el)};
  const isHome=location.pathname.replace(/\/+$/,'/')===ROOT;
  const loadSharedShell=()=>{
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
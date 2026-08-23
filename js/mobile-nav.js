(()=>{
  const ROOT='https://apps.laxmannepal.com.np/Nepali-Patro/';

  // The homepage historically shipped its own header/footer/mobile drawer.
  // Bootstrap the canonical shared shell so the homepage uses exactly the same
  // navigation, search, Forex menu and footer as every other page.
  const loadSharedShell=()=>{
    if(document.querySelector('script[data-shared-shell-loader]')) return;
    const s=document.createElement('script');
    s.src=`${ROOT}js/shared-shell.js?v=${Date.now().toString(36)}`;
    s.defer=true;
    s.dataset.sharedShellLoader='true';
    document.head.appendChild(s);
  };

  // Wait until the legacy homepage DOM exists, then let shared-shell.js remove
  // the legacy shell and mount the canonical header/footer.
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadSharedShell,{once:true});
  else loadSharedShell();
})();
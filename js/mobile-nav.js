(()=>{
  const ROOT='https://apps.laxmannepal.com.np/Nepali-Patro/';
  const b=document.getElementById('mobileMenuBtn');
  const m=document.getElementById('mobileMenu');
  const x=document.getElementById('mobileMenuClose');
  const o=document.getElementById('mobileMenuBackdrop');
  if(!b||!m)return;

  // Keep the homepage mobile navigation aligned with the canonical site navigation.
  const forexUrl=`${ROOT}forex/`;
  if(![...m.querySelectorAll('a')].some(a=>a.href.replace(/\/+$/,'/')===forexUrl.replace(/\/+$/,'/'))){
    const a=document.createElement('a');
    a.href=forexUrl;
    a.innerHTML='💱 विदेशी मुद्रा';
    m.appendChild(a);
  }

  // Ensure desktop/home navigation also exposes Forex when this legacy homepage shell is present.
  const desktopNav=document.querySelector('.np-header nav');
  if(desktopNav && ![...desktopNav.querySelectorAll('a')].some(a=>a.href.replace(/\/+$/,'/')===forexUrl.replace(/\/+$/,'/'))){
    const a=document.createElement('a');
    a.href=forexUrl;
    a.textContent='विदेशी मुद्रा';
    desktopNav.appendChild(a);
  }

  const set=v=>{
    m.classList.toggle('open',v);
    o?.classList.toggle('open',v);
    b.setAttribute('aria-expanded',String(v));
    document.body.classList.toggle('mobile-nav-open',v);
  };
  b.setAttribute('aria-expanded','false');
  b.addEventListener('click',()=>set(!m.classList.contains('open')));
  x?.addEventListener('click',()=>set(false));
  o?.addEventListener('click',()=>set(false));
  m.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>set(false)));
  window.addEventListener('keydown',e=>{if(e.key==='Escape')set(false)});
})();
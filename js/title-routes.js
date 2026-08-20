(() => {
  const routes={calendar:'patro',panchang:'panchanga',festivals:'parba',saait:'saith',rashifal:'rashifal',news:'news',converter:'converter'};
  const root=document.querySelector('base')?.href||new URL('./',location.href).href;
  document.querySelectorAll('main > section[id]').forEach(section=>{
    const route=routes[section.id];
    const title=section.querySelector('.section-title h2');
    if(!route||!title||title.dataset.routeReady)return;
    title.dataset.routeReady='1';
    title.setAttribute('role','link');
    title.tabIndex=0;
    title.style.cursor='pointer';
    const open=()=>{location.href=new URL(`${route}/`,root).href};
    title.addEventListener('click',open);
    title.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
  });
})();

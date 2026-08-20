(() => {
  const aliases={
    patro:'calendar',calendar:'calendar',
    panchanga:'panchang',panchang:'panchang',
    parba:'festivals',festivals:'festivals',
    saith:'saait',saait:'saait',
    rashifal:'rashifal',news:'news',converter:'converter'
  };
  const parts=location.pathname.split('/').filter(Boolean);
  const i=parts.indexOf('nepali-patro');
  const raw=i>=0?(parts[i+1]||''):'';
  const section=aliases[raw.toLowerCase()];
  if(!section)return;
  const apply=()=>{
    document.querySelectorAll('main > section').forEach(s=>s.classList.add('route-hidden'));
    const target=document.getElementById(section);
    if(target)target.classList.remove('route-hidden');
    if(raw==='patro'||raw==='calendar')document.getElementById('dayDetail')?.classList.remove('route-hidden');
    document.body.classList.add('feature-route');
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();

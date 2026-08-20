(() => {
  const root = document.body;
  const base = '/Nepali-Patro/';
  const routes = [
    ['patro','पात्रो'],['panchanga','पञ्चाङ्ग'],['rashifal','राशिफल'],['parba','पर्व'],['saith','साइत'],['news','समाचार'],['converter','रूपान्तरण']
  ];
  const path = location.pathname.replace(/\/+$/,'/');
  const current = routes.find(([r]) => path.includes(`/${r}/`))?.[0] || (path === base || path === '/' ? 'home' : 'home');
  document.querySelectorAll('[data-route]').forEach(a => {
    const r=a.dataset.route; a.href=base+(r==='home'?'':r+'/');
    if(r===current) a.classList.add('active');
  });
  document.querySelectorAll('[data-menu]').forEach(b=>b.addEventListener('click',()=>document.body.classList.toggle('menu-open')));
  const bs = document.querySelector('#bs-date'); const ad=document.querySelector('#ad-date'); const out=document.querySelector('#convert-result');
  const parseBS = value => { const m=value.trim().match(/^(\d{4})[-/]([0-9]{1,2})[-/]([0-9]{1,2})$/); return m?m.slice(1).map(Number):null };
  const fmt = d => d.toLocaleDateString('en-CA',{timeZone:'Asia/Kathmandu'});
  document.querySelector('#bs-to-ad')?.addEventListener('click', async()=>{ if(!bs?.value)return; out.textContent='रूपान्तरण भइरहेको छ…'; try{const r=await fetch(base+'data/conversion-index.json');const x=await r.json();const k=bs.value.replaceAll('/','-');out.textContent=x.bs_to_ad?.[k]||'यो मिति उपलब्ध डेटामा भेटिएन।';}catch(e){out.textContent='रूपान्तरण डेटा लोड हुन सकेन।';}});
  document.querySelector('#ad-to-bs')?.addEventListener('click', async()=>{ if(!ad?.value)return; out.textContent='रूपान्तरण भइरहेको छ…'; try{const r=await fetch(base+'data/conversion-index.json');const x=await r.json();out.textContent=x.ad_to_bs?.[ad.value]||'यो मिति उपलब्ध डेटामा भेटिएन।';}catch(e){out.textContent='रूपान्तरण डेटा लोड हुन सकेन।';}});
})();
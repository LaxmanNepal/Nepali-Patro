(() => {
  const sites = Array.isArray(window.GOVERNMENT_SITES) ? window.GOVERNMENT_SITES : [];
  const grid = document.getElementById('govGrid');
  const search = document.getElementById('search');
  const clear = document.getElementById('clearSearch');
  const category = document.getElementById('categoryFilter');
  const level = document.getElementById('levelFilter');
  const favBtn = document.getElementById('favoritesOnly');
  const stats = document.getElementById('stats');
  const strip = document.getElementById('categoryStrip');
  const tags = document.getElementById('quickTags');
  const empty = document.getElementById('empty');
  const key = 'nepaliPatroGovFavorites';
  let favorites = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  let activeCategory = 'all';
  let favoritesOnly = false;
  const categoryLabels = {
    'सरकार':'🏛️ सरकार','गृह तथा सुरक्षा':'🛡️ गृह तथा सुरक्षा','परराष्ट्र':'🌐 परराष्ट्र','अर्थ तथा राजस्व':'💰 अर्थ तथा राजस्व','पूर्वाधार':'🛣️ पूर्वाधार','शिक्षा':'🎓 शिक्षा','स्वास्थ्य':'🏥 स्वास्थ्य','डिजिटल तथा IT':'💻 डिजिटल तथा IT','कृषि':'🌾 कृषि','उद्योग तथा व्यापार':'🏭 उद्योग तथा व्यापार','श्रम तथा रोजगार':'👷 श्रम तथा रोजगार','भूमि तथा सहकारी':'🏠 भूमि तथा सहकारी','पर्यटन तथा उड्डयन':'✈️ पर्यटन तथा उड्डयन','ऊर्जा तथा जलस्रोत':'⚡ ऊर्जा तथा जलस्रोत','वन तथा वातावरण':'🌿 वन तथा वातावरण','स्थानीय शासन':'🏘️ स्थानीय शासन','कानुन तथा न्याय':'⚖️ कानुन तथा न्याय','सामाजिक सेवा':'🤝 सामाजिक सेवा','युवा तथा खेलकुद':'🏃 युवा तथा खेलकुद','बैंकिङ तथा वित्त':'🏦 बैंकिङ तथा वित्त','संवैधानिक निकाय':'🏛️ संवैधानिक निकाय','सुरक्षा':'🚨 सुरक्षा','नागरिक सेवा':'🪪 नागरिक सेवा','व्यवसाय सेवा':'💼 व्यवसाय सेवा','रोजगार तथा परीक्षा':'📝 रोजगार तथा परीक्षा','डिजिटल सेवा':'📱 डिजिटल सेवा','ऊर्जा तथा उपयोगिता':'💡 ऊर्जा तथा उपयोगिता','पर्यटन':'🏔️ पर्यटन','विज्ञान तथा मौसम':'🌦️ विज्ञान तथा मौसम','विपद् व्यवस्थापन':'🚑 विपद् व्यवस्थापन','तथ्याङ्क':'📊 तथ्याङ्क'
  };
  const levelLabels = {federal:'संघीय',constitutional:'संवैधानिक',security:'सुरक्षा',provincial:'प्रदेश',local:'स्थानीय',service:'सेवा'};
  const iconMap = { 'गृह तथा सुरक्षा':'🛡️','परराष्ट्र':'🌐','अर्थ तथा राजस्व':'💰','शिक्षा':'🎓','स्वास्थ्य':'🏥','कृषि':'🌾','उद्योग तथा व्यापार':'🏭','श्रम तथा रोजगार':'👷','बैंकिङ तथा वित्त':'🏦','नागरिक सेवा':'🪪','व्यवसाय सेवा':'💼','रोजगार तथा परीक्षा':'📝','डिजिटल सेवा':'📱','विपद् व्यवस्थापन':'🚑','तथ्याङ्क':'📊','ऊर्जा तथा उपयोगिता':'⚡','पर्यटन':'🏔️' };
  const cats = [...new Set(sites.map(s => s.c))].sort((a,b) => a.localeCompare(b,'ne'));
  cats.forEach(c => { const o=document.createElement('option'); o.value=c; o.textContent=categoryLabels[c] || c; category.appendChild(o); });
  const quick = ['पासपोर्ट','नागरिकता','PAN','कर','लोक सेवा','जग्गा','वैदेशिक रोजगार','बिजुली','परीक्षाफल'];
  quick.forEach(q => { const b=document.createElement('button'); b.textContent=q; b.onclick=()=>{search.value=q;render()}; tags.appendChild(b); });
  const allButton = document.createElement('button'); allButton.className='active'; allButton.dataset.cat='all'; allButton.textContent='सबै'; strip.appendChild(allButton);
  cats.forEach(c=>{const b=document.createElement('button');b.dataset.cat=c;b.textContent=categoryLabels[c]||c;b.onclick=()=>{activeCategory=c;category.value=c;[...strip.children].forEach(x=>x.classList.toggle('active',x.dataset.cat===c));render()};strip.appendChild(b)});
  allButton.onclick=()=>{activeCategory='all';category.value='all';[...strip.children].forEach(x=>x.classList.toggle('active',x.dataset.cat==='all'));render()};
  category.addEventListener('change',()=>{activeCategory=category.value;[...strip.children].forEach(x=>x.classList.toggle('active',x.dataset.cat===activeCategory));render()});
  level.addEventListener('change',render); search.addEventListener('input',render); clear.onclick=()=>{search.value='';render();search.focus()};
  favBtn.onclick=()=>{favoritesOnly=!favoritesOnly;favBtn.classList.toggle('active',favoritesOnly);favBtn.textContent=favoritesOnly?'★ सबै हेर्नुहोस्':'☆ मनपर्ने मात्र';render()};
  function save(){localStorage.setItem(key,JSON.stringify([...favorites]))}
  function toggleFav(url){favorites.has(url)?favorites.delete(url):favorites.add(url);save();render()}
  window.addEventListener('storage',render);
  function filtered(){const q=search.value.trim().toLowerCase();return sites.filter(s=>{const hay=[s.n,s.e,s.c,s.d,s.k,s.u].join(' ').toLowerCase();return (!q||hay.includes(q))&&(activeCategory==='all'||s.c===activeCategory)&&(level.value==='all'||s.l===level.value)&&(!favoritesOnly||favorites.has(s.u))})}
  function render(){const list=filtered();stats.textContent=`${list.length} वटा वेबसाइट · कुल ${sites.length} वटा सूचीबद्ध`;grid.innerHTML='';empty.hidden=list.length>0;list.forEach(s=>{const card=document.createElement('article');card.className='gov-card';const icon=iconMap[s.c]||'🇳🇵';const saved=favorites.has(s.u);card.innerHTML=`<div class="gov-card-top"><span class="gov-icon">${icon}</span><button class="star ${saved?'saved':''}" title="${saved?'मनपर्नेबाट हटाउनुहोस्':'मनपर्नेमा राख्नुहोस्'}" aria-label="मनपर्ने">${saved?'★':'☆'}</button></div><h2>${esc(s.n)}</h2><div class="en">${esc(s.e)}</div><p>${esc(s.d)}</p><div class="gov-meta"><span class="pill official">✓ आधिकारिक लिंक</span><span class="pill">${esc(levelLabels[s.l]||s.l)}</span><span class="pill">${esc(s.c)}</span></div><a class="gov-open" href="${escAttr(s.u)}" target="_blank" rel="noopener noreferrer">वेबसाइट खोल्नुहोस् <span>↗</span></a>`;card.querySelector('.star').onclick=()=>toggleFav(s.u);grid.appendChild(card)})}
  function esc(v){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function escAttr(v){return esc(v)}
  document.getElementById('menuBtn')?.addEventListener('click',()=>document.getElementById('mobileNav')?.classList.toggle('open'));
  render();
})();

(() => {
  const BASE = 'https://apps.laxmannepal.com.np/Nepali-Patro/';
  const FEED = `${BASE}feeds/news.json`;
  const PLACEHOLDER = `${BASE}assets/news-placeholder.svg`;
  const state = { items: [], category: 'all', source: 'all', query: '', sort: 'latest', visible: 12 };
  const cats = { all:'सबै', national:'राष्ट्रिय', politics:'राजनीति', business:'अर्थतन्त्र', sports:'खेलकुद', technology:'प्रविधि', entertainment:'मनोरञ्जन' };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const clean = v => String(v ?? '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const date = v => { const d = new Date(v); return Number.isNaN(d.getTime()) ? 0 : d.getTime(); };
  const rel = v => { const t=date(v); if(!t)return 'समय उपलब्ध छैन'; const s=Math.max(0,Math.floor((Date.now()-t)/1000)); if(s<60)return 'अहिले'; const m=Math.floor(s/60); if(m<60)return `${m.toLocaleString('ne-NP')} मिनेट अघि`; const h=Math.floor(m/60); if(h<24)return `${h.toLocaleString('ne-NP')} घण्टा अघि`; const d=Math.floor(h/24); return d<7?`${d.toLocaleString('ne-NP')} दिन अघि`:new Date(v).toLocaleDateString('ne-NP'); };
  const source = n => n.sourceName || n.source || 'समाचार स्रोत';
  const img = n => n.imageUrl || PLACEHOLDER;
  const badge = n => n.sourceLogo ? `<img src="${esc(n.sourceLogo)}" alt="" loading="lazy" onerror="this.src='${PLACEHOLDER}'">` : `<span>${esc(source(n).slice(0,1))}</span>`;

  function filtered(){
    let a=state.items.filter(n=>state.category==='all'||n.category===state.category).filter(n=>state.source==='all'||source(n)===state.source);
    if(state.query){const q=state.query.toLocaleLowerCase('ne');a=a.filter(n=>`${n.title} ${n.description} ${source(n)}`.toLocaleLowerCase('ne').includes(q));}
    a.sort((x,y)=>state.sort==='oldest'?date(x.publishedTime)-date(y.publishedTime):date(y.publishedTime)-date(x.publishedTime));
    return a;
  }
  function card(n,featured=false){
    return `<article class="news-card ${featured?'news-featured':''}"><a class="news-card-link" href="${esc(n.articleUrl||n.link||'#')}" target="_blank" rel="noopener noreferrer"><img class="news-card-image" src="${esc(img(n))}" alt="${esc(n.title)}" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER}'"><div class="news-card-body"><h3>${esc(n.title)}</h3>${n.description?`<p>${esc(clean(n.description))}</p>`:''}<div class="news-meta"><span class="news-source">${badge(n)}<b>${esc(source(n))}</b></span><time datetime="${esc(n.publishedTime||'')}">${rel(n.publishedTime)}</time></div></div></a></article>`;
  }
  function render(){
    const a=filtered();
    const feature=document.querySelector('#newsFeatureArea');
    if(feature){const first=a[0], side=a.slice(1,4);feature.innerHTML=first?`<div class="news-section-head"><h2>आजका मुख्य समाचार</h2><span>${rel(first.publishedTime)}</span></div><div class="news-feature-grid"><div>${card(first,true)}</div><div class="side-stories">${side.map(n=>card(n)).join('')}</div></div>`:'';}
    const grid=document.querySelector('#newsGrid');
    if(grid){const shown=a.slice(4,4+state.visible);grid.innerHTML=shown.length?shown.map(n=>card(n)).join(''):`<div class="news-empty">तपाईंको खोज वा फिल्टरसँग मिल्ने समाचार भेटिएन।</div>`;}
    const count=document.querySelector('#newsCount'); if(count)count.textContent=`${a.length.toLocaleString('ne-NP')} समाचार`;
    const stat=document.querySelector('#newsStatCount');if(stat)stat.textContent=state.items.length.toLocaleString('ne-NP');
    const sources=[...new Set(state.items.map(source))];const ss=document.querySelector('#newsStatSources');if(ss)ss.textContent=sources.length.toLocaleString('ne-NP');
    const fresh=document.querySelector('#newsStatFresh');if(fresh)fresh.textContent=state.items.filter(n=>Date.now()-date(n.publishedTime)<6*3600000).length.toLocaleString('ne-NP');
    const more=document.querySelector('#loadMoreNews');if(more)more.hidden=4+state.visible>=a.length;
    const inf=document.querySelector('#newsInfiniteStatus');if(inf)inf.textContent=4+state.visible<a.length?'थप समाचारका लागि तल स्क्रोल गर्नुहोस्':'सबै उपलब्ध समाचार देखाइयो';
  }
  function sources(){const el=document.querySelector('#newsSourceFilter');if(!el)return;const list=[...new Set(state.items.map(source))].sort((a,b)=>a.localeCompare(b,'ne'));el.innerHTML='<option value="all">सबै स्रोत</option>'+list.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');el.value=state.source;}
  function status(payload){const el=document.querySelector('#newsLiveStatus');if(!el)return;const d=payload.updatedAt||payload.generatedAt;const age=d?Math.max(0,Math.floor((Date.now()-date(d))/60000)):null;el.innerHTML=`<span class="news-live-dot"></span><strong>नेपाल समाचार लाइभ</strong><span>${age===null?'डेटा तयार हुँदैछ':age<1?'अहिले अपडेट गरिएको':`${age.toLocaleString('ne-NP')} मिनेट अघि अपडेट`}</span><span>· ${state.items.length.toLocaleString('ne-NP')} समाचार</span><button id="refreshNewsLive" type="button">↻ ताजा</button>`;document.querySelector('#refreshNewsLive')?.addEventListener('click',()=>load(true));}
  async function load(manual=false){
    try{
      const r=await fetch(`${FEED}?v=${Date.now()}`,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});if(!r.ok)throw Error(`HTTP ${r.status}`);
      const p=await r.json();const raw=Array.isArray(p)?p:(Array.isArray(p.articles)?p.articles:p.items);if(!Array.isArray(raw))throw Error('Invalid news JSON');
      const seen=new Set();state.items=raw.map(n=>({...n,title:clean(n.title),description:clean(n.description||n.summary),articleUrl:n.articleUrl||n.link,publishedTime:n.publishedTime||n.published,sourceName:source(n)})).filter(n=>n.title&&n.articleUrl).filter(n=>{const k=n.articleUrl.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>date(b.publishedTime)-date(a.publishedTime));
      sources();render();status(p);if(manual){const m=document.querySelector('#newsRefreshMessage');if(m)m.textContent='समाचार JSON सफलतापूर्वक ताजा गरियो।';}
    }catch(e){console.error(e);const el=document.querySelector('#newsLiveStatus');if(el)el.innerHTML='<span>⚠️</span><strong>समाचार फिड अस्थायी रूपमा उपलब्ध छैन</strong><button id="refreshNewsLive" type="button">↻ पुनः प्रयास</button>';document.querySelector('#refreshNewsLive')?.addEventListener('click',()=>load(true));}
  }
  function init(){
    const cat=document.querySelector('#newsCategoryFilter');if(cat){cat.innerHTML=Object.entries(cats).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');cat.onchange=()=>{state.category=cat.value;state.visible=12;render();};}
    const src=document.querySelector('#newsSourceFilter');if(src)src.onchange=()=>{state.source=src.value;state.visible=12;render();};
    const sort=document.querySelector('#newsSort');if(sort)sort.onchange=()=>{state.sort=sort.value;render();};
    const search=document.querySelector('#newsSearch');if(search)search.oninput=()=>{state.query=search.value.trim();state.visible=12;render();};
    document.querySelectorAll('[data-news-cat]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-news-cat]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.category=b.dataset.newsCat;state.visible=12;if(cat)cat.value=state.category;render();}));
    document.querySelector('#loadMoreNews')?.addEventListener('click',()=>{state.visible+=12;render();});
    const sentinel=document.createElement('div');sentinel.style.height='1px';document.querySelector('#newsGrid')?.after(sentinel);if('IntersectionObserver' in window)new IntersectionObserver(e=>{if(e[0]?.isIntersecting){state.visible+=12;render();}},{rootMargin:'800px'}).observe(sentinel);
    load(false);setInterval(()=>load(false),60000);
  }
  window.addEventListener('DOMContentLoaded',init);
})();

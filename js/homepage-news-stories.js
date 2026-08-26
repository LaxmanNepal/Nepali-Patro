/* Homepage News Stories — loads the local news JSON and creates an Instagram/Facebook-style rail. */
(() => {
  'use strict';
  const DATA = '/feeds/news.json';
  const MAX = 12;
  const viewedKey = 'np-home-news-stories-viewed-v1';
  const $ = (s, r=document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ago = value => { const t = new Date(value).getTime(); if(!Number.isFinite(t)) return ''; const m=Math.max(0,Math.floor((Date.now()-t)/60000)); return m<1?'अहिले':m<60?`${m} मिनेट अघि`:m<1440?`${Math.floor(m/60)} घण्टा अघि`:`${Math.floor(m/1440)} दिन अघि`; };
  const seen = () => { try{return new Set(JSON.parse(localStorage.getItem(viewedKey)||'[]'));}catch{return new Set();} };
  const mark = id => { try { const a=[...seen(),id].slice(-200); localStorage.setItem(viewedKey,JSON.stringify(a)); } catch{} };
  const words = s => new Set(String(s||'').toLowerCase().replace(/[^\u0900-\u097F\w ]/g,' ').split(/\s+/).filter(w=>w.length>2));
  function unique(items){
    const sorted=items.filter(x=>x && (x.title||x.heading) && (x.articleUrl||x.link)).map((x,i)=>({...x,_title:x.title||x.heading,_url:x.articleUrl||x.link,_time:x.publishedAt||x.publishedTime||x.fetchedAt,_words:words(x.title||x.heading),_i:i})).sort((a,b)=>new Date(b._time)-new Date(a._time));
    const out=[];
    for(const x of sorted){ if(out.some(y=>{let c=0;x._words.forEach(w=>y._words.has(w)&&(c++));return c/Math.max(1,Math.min(x._words.size,y._words.size))>=.72;})) continue; out.push(x); if(out.length>=MAX) break; }
    return out;
  }
  function mount(){
    if($('#npHomeStories')) return $('#npHomeStories');
    const host=document.querySelector('[data-home-news-stories]')||document.querySelector('#news')||document.querySelector('main')||document.body;
    const el=document.createElement('section'); el.id='npHomeStories'; el.className='np-home-stories';
    el.innerHTML='<div class="np-home-stories-head"><div><b><span></span> ताजा Stories</b><small>नेपालमा अहिले चर्चामा रहेका समाचार</small></div><a href="/Nepali-Patro/news/">सबै समाचार →</a></div><div class="np-home-story-rail" id="npHomeStoryRail"></div><div class="np-home-story-viewer" id="npHomeStoryViewer" hidden><div class="np-hsv-progress" id="npHsvProgress"></div><button class="np-hsv-close" aria-label="बन्द">×</button><button class="np-hsv-prev" aria-label="अघिल्लो">‹</button><div class="np-hsv-card"><div class="np-hsv-image" id="npHsvImage"></div><div class="np-hsv-body"><small id="npHsvSource"></small><h2 id="npHsvTitle"></h2><p id="npHsvDesc"></p><em id="npHsvTime"></em><a id="npHsvLink">सम्पूर्ण समाचार पढ्नुहोस् →</a></div></div><button class="np-hsv-next" aria-label="अर्को">›</button></div>';
    host.prepend(el);
    $('.np-hsv-close',el).onclick=close; $('.np-hsv-prev',el).onclick=()=>show(current-1); $('.np-hsv-next',el).onclick=()=>show(current+1);
    let sx=0; $('#npHomeStoryViewer').addEventListener('touchstart',e=>sx=e.touches[0].clientX,{passive:true}); $('#npHomeStoryViewer').addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>45)show(current+(dx<0?1:-1));},{passive:true});
    return el;
  }
  let stories=[],current=0,timer;
  function render(){const r=$('#npHomeStoryRail');if(!r)return;const s=seen();r.innerHTML=stories.map((x,i)=>`<button class="np-home-story ${s.has(x.id||x._url)?'viewed':''}" data-i="${i}"><span class="np-home-story-ring"><i style="background-image:url('${esc(x.imageUrl||x.image||'')}')"></i></span><b>${esc(x._title.slice(0,36))}</b><small>${esc(x.sourceName||x.source||'समाचार')}</small></button>`).join('');r.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>show(+b.dataset.i));}
  function show(i){if(!stories.length)return;current=(i+stories.length)%stories.length;const x=stories[current];mark(x.id||x._url);$('#npHsvImage').style.backgroundImage=x.imageUrl||x.image?`url("${x.imageUrl||x.image}")`:'';$('#npHsvSource').textContent=x.sourceName||x.source||'समाचार';$('#npHsvTitle').textContent=x._title;$('#npHsvDesc').textContent=x.description||x.summary||'';$('#npHsvTime').textContent=ago(x._time);$('#npHsvLink').href=x._url;$('#npHsvProgress').innerHTML=stories.map((_,j)=>`<i class="${j===current?'on':''}"></i>`).join('');$('#npHomeStoryViewer').hidden=false;document.body.classList.add('np-home-story-open');render();clearTimeout(timer);timer=setTimeout(()=>show(current+1),6000);}
  function close(){clearTimeout(timer);$('#npHomeStoryViewer').hidden=true;document.body.classList.remove('np-home-story-open');}
  async function load(){mount();try{const r=await fetch(`${DATA}?v=${Date.now()}`,{cache:'no-store'});const d=await r.json();stories=unique(d.articles||d.items||[]);render();}catch{const r=$('#npHomeStoryRail');if(r)r.innerHTML='<small>Stories अहिले उपलब्ध छैनन्।</small>';}}
  mount();load();setInterval(load,60000);
})();

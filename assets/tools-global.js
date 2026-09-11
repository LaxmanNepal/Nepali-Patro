/* Nepali Patro — Global Tools V1 */
(function(){
  'use strict';
  if(window.__NP_GLOBAL_TOOLS__) return;
  window.__NP_GLOBAL_TOOLS__=true;

  function removeLegacyServices(){
    const bad=/उपकरण\s*(तथा|र)\s*सेवाहरू?|उपकरण\s*तथा\s*सेवा|tools\s*(and|&)\s*services/i;
    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(h){
      if(!bad.test((h.textContent||'').trim())) return;
      const section=h.closest('section,article,.section,.card,div');
      if(section && section!==document.body) section.remove(); else h.remove();
    });
    document.querySelectorAll('.featured-services,.services-section,[data-section="services"]').forEach(function(el){el.remove();});
  }

  function rootUrl(){
    try{return new URL('../data/tool-manifest.json',document.currentScript && document.currentScript.src || location.href).href;}
    catch(e){return '../data/tool-manifest.json';}
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);});}
  function makeUI(tools){
    const wrap=document.createElement('div');
    wrap.className='np-global-tools';
    wrap.innerHTML='<div class="np-tools-backdrop" aria-hidden="true"></div>'+
      '<button class="np-tools-trigger" type="button" aria-expanded="false" aria-label="सबै उपकरण खोल्नुहोस्"><span>🧰</span><span>सबै उपकरण</span></button>'+
      '<section class="np-tools-panel" role="dialog" aria-modal="true" aria-label="सबै उपकरण">'+
      '<div class="np-tools-head"><div class="np-tools-title">सबै उपयोगी उपकरण</div><button class="np-tools-close" type="button" aria-label="बन्द गर्नुहोस्">×</button></div>'+ 
      '<input class="np-tools-search" type="search" placeholder="उपकरण खोज्नुहोस्…" aria-label="उपकरण खोज्नुहोस्">'+
      '<div class="np-tools-grid"></div><div class="np-tools-count"></div></section>';
    document.body.appendChild(wrap);
    const grid=wrap.querySelector('.np-tools-grid'), search=wrap.querySelector('.np-tools-search'), count=wrap.querySelector('.np-tools-count');
    const current=location.pathname.replace(/\\/g,'/');
    function render(q){
      const needle=(q||'').trim().toLocaleLowerCase('ne');
      const list=tools.filter(function(t){return !needle || (t.name+' '+t.title+' '+t.id).toLocaleLowerCase('ne').includes(needle);});
      grid.innerHTML=list.map(function(t){
        const href=new URL(t.url,location.href).href;
        const active=current.endsWith('/'+String(t.url).replace(/\\/g,'/')) || current.includes('/'+String(t.url).replace(/\\/g,'/'));
        return '<a class="np-tool-item'+(active?' active':'')+'" href="'+esc(href)+'"><span class="np-tool-icon">'+esc(t.icon||'🧰')+'</span><span class="np-tool-name">'+esc(t.name||t.title||t.id)+'</span></a>';
      }).join('') || '<div class="np-tools-error">कुनै उपकरण भेटिएन।</div>';
      count.textContent=list.length+' / '+tools.length+' उपकरण';
    }
    function close(){wrap.classList.remove('open');wrap.querySelector('.np-tools-trigger').setAttribute('aria-expanded','false');}
    wrap.querySelector('.np-tools-trigger').addEventListener('click',function(){const open=wrap.classList.toggle('open');this.setAttribute('aria-expanded',String(open));if(open){search.focus();render(search.value);}});
    wrap.querySelector('.np-tools-close').addEventListener('click',close);
    wrap.querySelector('.np-tools-backdrop').addEventListener('click',close);
    search.addEventListener('input',function(){render(this.value);});
    document.addEventListener('keydown',function(e){if(e.key==='Escape') close();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();wrap.classList.add('open');search.focus();render('');}});
    render('');
  }

  function boot(){
    removeLegacyServices();
    fetch(rootUrl(),{cache:'no-store'}).then(function(r){if(!r.ok) throw new Error('manifest');return r.json();}).then(function(data){
      const tools=Array.isArray(data.tools)?data.tools:[];
      if(tools.length) makeUI(tools);
    }).catch(function(){/* Global launcher is optional if manifest is temporarily unavailable. */});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();

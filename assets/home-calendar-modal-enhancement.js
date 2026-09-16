/* Nepali Patro — Date modal UX + daily intelligence */
(()=>{'use strict';
 const nep=n=>String(n).replace(/\d/g,d=>'०१२३४५६७८९'[d]);
 const todayAD=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu'}).format(new Date());
 const dayDiff=(a,b)=>{const x=new Date(a+'T00:00:00Z'),y=new Date(b+'T00:00:00Z');return Math.round((x-y)/86400000)};
 const enhance=modal=>{
  if(!modal||modal.dataset.enhanced)return; modal.dataset.enhanced='1';
  const card=modal.querySelector('.np-date-modal-card'); if(!card)return;
  const top=card.querySelector('.np-date-modal-top');
  if(top){const handle=document.createElement('div');handle.className='np-modal-drag-handle';handle.setAttribute('aria-hidden','true');top.prepend(handle)}
  const title=top?.querySelector('h3');
  const adText=top?.querySelector('p')?.textContent||'';
  const adMatch=adText.match(/(\d{4}-\d{2}-\d{2})/);
  const selected=adMatch?adMatch[1]:'';
  const diff=selected?dayDiff(selected,todayAD()):null;
  const relationship=diff===0?'आज':diff===1?'भोलि':diff===-1?'हिजो':diff>0?nep(diff)+' दिनपछि':nep(Math.abs(diff))+' दिनअघि':'';
  if(top&&relationship){const rel=document.createElement('div');rel.className='np-modal-date-relation '+(diff===0?'is-today':diff>0?'is-future':'is-past');rel.innerHTML='<span>📍</span><strong>'+relationship+'</strong>';top.appendChild(rel)}
  const events=card.querySelector('.np-date-events');
  if(events){events.classList.add('has-events');const strong=events.querySelector('strong');if(strong){const raw=strong.textContent.trim();strong.innerHTML=raw.split(' • ').map(x=>'<span class="np-modal-event-chip">'+x+'</span>').join('')}}
  const grid=card.querySelector('.np-date-detail-grid');
  if(grid){const items=[...grid.children];const groups=[
   ['🪔','पञ्चाङ्ग',['तिथि','पक्ष','तिथि समाप्ति','नक्षत्र','योग','करण']],
   ['☀️','सूर्य तथा चन्द्र',['सूर्योदय','सूर्यास्त','चन्द्रोदय','चन्द्रास्त']],
   ['⏱️','विशेष समय',['राहुकाल','गुलिककाल']],
   ['♈','अन्य जानकारी',['राशि','नेपाल संवत्']]
  ]; const labels=new Map(items.map(x=>[x.querySelector('small')?.textContent.trim(),x]));
   grid.innerHTML=''; groups.forEach(([icon,title,names])=>{const present=names.map(n=>labels.get(n)).filter(Boolean);if(!present.length)return;const section=document.createElement('section');section.className='np-modal-detail-group';section.innerHTML='<div class="np-modal-group-title"><span>'+icon+'</span><strong>'+title+'</strong></div>';const wrap=document.createElement('div');wrap.className='np-modal-group-grid';present.forEach(x=>wrap.appendChild(x));section.appendChild(wrap);grid.appendChild(section)})
  }
  const sunItems=[...card.querySelectorAll('.np-date-detail')];
  const findLabel=label=>sunItems.find(x=>x.querySelector('small')?.textContent.trim()===label);
  const sunrise=findLabel('सूर्योदय'),sunset=findLabel('सूर्यास्त');
  if(sunrise&&sunset){const timeline=document.createElement('div');timeline.className='np-modal-sun-timeline';timeline.innerHTML='<div class="np-modal-sun-head"><span>🌅 दिनको उज्यालो</span><small>सूर्योदय → सूर्यास्त</small></div><div class="np-modal-sun-track"><span></span></div><div class="np-modal-sun-times"><b>सूर्योदय<br><strong>'+sunrise.querySelector('strong').textContent+'</strong></b><b>सूर्यास्त<br><strong>'+sunset.querySelector('strong').textContent+'</strong></b></div>';const groups=card.querySelectorAll('.np-modal-detail-group');let target=groups[1]||groups[0];if(target)target.after(timeline)}
  const action=card.querySelector('.np-date-modal-actions');if(action)action.classList.add('is-sticky-action');
 };
 const watch=()=>{document.querySelectorAll('.np-date-modal').forEach(enhance);new MutationObserver(m=>m.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===1){if(n.matches?.('.np-date-modal'))enhance(n);n.querySelectorAll?.('.np-date-modal').forEach(enhance)}}))).observe(document.body,{childList:true})};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();

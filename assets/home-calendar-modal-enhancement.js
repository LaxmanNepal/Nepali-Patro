/* Nepali Patro — Date modal UX enhancement */
(()=>{'use strict';
 const enhance=modal=>{
  if(!modal||modal.dataset.enhanced)return; modal.dataset.enhanced='1';
  const card=modal.querySelector('.np-date-modal-card'); if(!card)return;
  const top=card.querySelector('.np-date-modal-top');
  if(top){const handle=document.createElement('div');handle.className='np-modal-drag-handle';handle.setAttribute('aria-hidden','true');top.prepend(handle)}
  const grid=card.querySelector('.np-date-detail-grid');
  if(grid){const items=[...grid.children];const groups=[
   ['🪔','पञ्चाङ्ग',['तिथि','पक्ष','तिथि समाप्ति','नक्षत्र','योग','करण']],
   ['☀️','सूर्य तथा चन्द्र',['सूर्योदय','सूर्यास्त','चन्द्रोदय','चन्द्रास्त']],
   ['⏱️','विशेष समय',['राहुकाल','गुलिककाल']],
   ['♈','अन्य जानकारी',['राशि','नेपाल संवत्']]
  ]; const labels=new Map(items.map(x=>[x.querySelector('small')?.textContent.trim(),x]));
   grid.innerHTML=''; groups.forEach(([icon,title,names])=>{const present=names.map(n=>labels.get(n)).filter(Boolean);if(!present.length)return;const section=document.createElement('section');section.className='np-modal-detail-group';section.innerHTML='<div class="np-modal-group-title"><span>'+icon+'</span><strong>'+title+'</strong></div>';const wrap=document.createElement('div');wrap.className='np-modal-group-grid';present.forEach(x=>wrap.appendChild(x));section.appendChild(wrap);grid.appendChild(section)})
  }
  const events=card.querySelector('.np-date-events');if(events)events.classList.add('has-events');
  const action=card.querySelector('.np-date-modal-actions');if(action)action.classList.add('is-sticky-action');
 };
 const watch=()=>{document.querySelectorAll('.np-date-modal').forEach(enhance);new MutationObserver(m=>m.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===1){if(n.matches?.('.np-date-modal'))enhance(n);n.querySelectorAll?.('.np-date-modal').forEach(enhance)}}))).observe(document.body,{childList:true})};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();

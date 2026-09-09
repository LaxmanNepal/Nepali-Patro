(() => {
  const mount = document.querySelector('.gov-page');
  if (!mount) return;
  fetch('./data/local-governments.json', {cache:'no-store'})
    .then(r => r.ok ? r.json() : Promise.reject(new Error('directory unavailable')))
    .then(data => {
      const records = Array.isArray(data.records) ? data.records : [];
      const section = document.createElement('section');
      section.className = 'local-gov-directory';
      section.innerHTML = `<div class="section-heading"><div><span>🏘️ स्थानीय सरकार</span><small>७५३ स्थानीय तहका आधिकारिक वेबसाइटहरू</small></div><a class="local-source" href="https://mofaga.gov.np/local-contact" target="_blank" rel="noopener">MoFAGA स्रोत ↗</a></div><div class="local-tools"><input id="localGovSearch" type="search" placeholder="पालिका, जिल्ला वा प्रदेश खोज्नुहोस्…" aria-label="स्थानीय सरकार खोज्नुहोस्"><select id="localGovProvince"><option value="">सबै प्रदेश</option></select><select id="localGovType"><option value="">सबै प्रकार</option><option value="metropolitan">महानगरपालिका</option><option value="sub-metropolitan">उपमहानगरपालिका</option><option value="municipality">नगरपालिका</option><option value="rural-municipality">गाउँपालिका</option></select><span id="localGovCount"></span></div><div id="localGovGrid" class="local-gov-grid"></div>`;
      mount.insertBefore(section, mount.querySelector('.official-note'));
      const input=section.querySelector('#localGovSearch'), province=section.querySelector('#localGovProvince'), type=section.querySelector('#localGovType'), grid=section.querySelector('#localGovGrid'), count=section.querySelector('#localGovCount');
      [...new Set(records.map(x=>x.province).filter(Boolean))].forEach(p => { const o=document.createElement('option'); o.value=p; o.textContent=p; province.appendChild(o); });
      const labels={'metropolitan':'महानगरपालिका','sub-metropolitan':'उपमहानगरपालिका','municipality':'नगरपालिका','rural-municipality':'गाउँपालिका'};
      const render=()=>{ const q=(input.value||'').toLocaleLowerCase('ne-NP').replace(/\s+/g,''); const list=records.filter(x=>(!q||[x.name,x.district,x.province,x.email].join(' ').toLocaleLowerCase('ne-NP').replace(/\s+/g,'').includes(q))&&(!province.value||x.province===province.value)&&(!type.value||x.type===type.value)); count.textContent=`${list.length} / ${records.length} स्थानीय तह`; grid.innerHTML=''; list.forEach(x=>{ const card=document.createElement('article'); card.className='local-gov-card'; const title=String(x.name||'स्थानीय तह').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); const safeUrl=/^https?:\/\//i.test(x.website||'')?x.website:''; card.innerHTML=`<span class="local-type">${labels[x.type]||'स्थानीय तह'}</span><h3>${title}</h3><p>${x.district||''} · ${x.province||''}</p>${safeUrl?`<a href="${safeUrl}" target="_blank" rel="noopener">आधिकारिक वेबसाइट ↗</a>`:'<span class="local-missing">वेबसाइट लिंक उपलब्ध छैन</span>'}`; grid.appendChild(card); }); };
      input.addEventListener('input',render); province.addEventListener('change',render); type.addEventListener('change',render); render();
    }).catch(() => {});
})();

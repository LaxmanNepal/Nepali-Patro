// Citizen-first official service portals.
window.GOVERNMENT_SERVICE_PORTALS = [
{id:'passport',title:'राहदानी आवेदन',subtitle:'e-Passport / राहदानी',url:'https://emrtds.nepalpassport.gov.np/',queries:['पासपोर्ट','राहदानी','passport','e-passport'],icon:'🛂',description:'राहदानीसम्बन्धी आधिकारिक आवेदन/सेवा पोर्टल।'},
{id:'tax',title:'PAN / करदाता सेवा',subtitle:'IRD Taxpayer Portal',url:'https://taxpayerportal.ird.gov.np/',queries:['PAN','करदाता','आयकर','tax','VAT'],icon:'💰',description:'PAN, करदाता र करसम्बन्धी अनलाइन सेवा।'},
{id:'company',title:'कम्पनी दर्ता',subtitle:'Office of Company Registrar',url:'https://ocr.gov.np/',queries:['कम्पनी','company','दर्ता','व्यवसाय'],icon:'💼',description:'कम्पनी र व्यवसाय दर्तासम्बन्धी आधिकारिक स्रोत।'},
{id:'land',title:'भूमि / मालपोत',subtitle:'Department of Land Management and Archives',url:'https://dolma.gov.np/',queries:['जग्गा','भूमि','मालपोत','land'],icon:'🏠',description:'भूमि प्रशासन र मालपोतसम्बन्धी सरकारी स्रोत।'},
{id:'loksewa',title:'लोक सेवा आयोग',subtitle:'Public Service Commission',url:'https://psc.gov.np/',queries:['लोक सेवा','PSC','सरकारी जागिर','vacancy'],icon:'📝',description:'लोक सेवा विज्ञापन, परीक्षा र नतिजा।'},
{id:'foreign-employment',title:'वैदेशिक रोजगार',subtitle:'Department of Foreign Employment',url:'https://dofe.gov.np/',queries:['वैदेशिक रोजगार','श्रम स्वीकृति','foreign employment'],icon:'✈️',description:'वैदेशिक रोजगार र श्रमसम्बन्धी सरकारी जानकारी।'},
{id:'driving',title:'सवारी चालक अनुमतिपत्र',subtitle:'DoTM / यातायात',url:'https://dotm.gov.np/',queries:['लाइसेन्स','driving license','सवारी','यातायात'],icon:'🚗',description:'सवारी तथा चालक अनुमतिपत्रसम्बन्धी सरकारी स्रोत।'},
{id:'citizenship',title:'नागरिकता',subtitle:'गृह मन्त्रालय',url:'https://moha.gov.np/',queries:['नागरिकता','citizenship'],icon:'🪪',description:'नागरिकता तथा गृह प्रशासनसम्बन्धी आधिकारिक जानकारी।'},
{id:'electricity',title:'विद्युत्',subtitle:'Nepal Electricity Authority',url:'https://nea.org.np/',queries:['बिजुली','विद्युत्','electricity','NEA'],icon:'⚡',description:'विद्युत् तथा ऊर्जा सेवासम्बन्धी आधिकारिक स्रोत।'},
{id:'exam',title:'परीक्षा / नतिजा',subtitle:'National Examinations Board',url:'https://www.neb.gov.np/',queries:['परीक्षा','नतिजा','result','NEB'],icon:'🎓',description:'शिक्षा तथा परीक्षा सम्बन्धी सरकारी स्रोत।'}
];

// Render a compact citizen-first service panel without changing the shared homepage shell.
(function(){
  const portals=window.GOVERNMENT_SERVICE_PORTALS||[];
  const main=document.querySelector('.gov-page');
  const search=document.getElementById('search');
  if(!main||!portals.length)return;
  const style=document.createElement('style');
  style.textContent='.service-portals{margin:8px 0 24px}.service-portals-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:12px}.service-portals-head strong{font-size:20px;font-weight:850}.service-portals-head small{color:var(--gov-muted)}.service-portals-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.service-portal-card{display:flex;flex-direction:column;gap:7px;text-decoration:none;color:inherit;background:var(--gov-card);border:1px solid var(--gov-line);border-radius:16px;padding:14px;min-height:165px;transition:.18s}.service-portal-card:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(0,0,0,.07);border-color:#d5d9e1}.service-portal-icon{font-size:26px}.service-portal-card strong{font-size:14px}.service-portal-card small{color:var(--gov-muted);font-size:11px;line-height:1.45}.service-portal-card span{margin-top:auto;color:var(--gov-brand);font-size:12px;font-weight:850}.service-portal-card.is-exact{border-color:#fda4af;box-shadow:0 0 0 2px rgba(185,28,28,.07)}.service-portal-badge{font-size:10px!important;color:var(--gov-green)!important;font-weight:850!important}.dark .service-portal-card{background:var(--gov-card)}@media(max-width:1000px){.service-portals-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:620px){.service-portals-head{align-items:flex-start;flex-direction:column}.service-portals-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.service-portal-card{min-height:150px;padding:12px}}';
  document.head.appendChild(style);
  const section=document.createElement('section');
  section.className='service-portals';
  section.id='servicePortals';
  section.setAttribute('aria-label','सीधा सरकारी सेवा पोर्टल');
  section.innerHTML='<div class="service-portals-head"><div><strong>⚡ सीधा सरकारी सेवा पोर्टल</strong><small> लोकप्रिय सेवाका आधिकारिक लिंक — खोज्दा मिल्ने सेवा माथि देखिन्छ</small></div></div><div class="service-portals-grid" id="servicePortalsGrid"></div>';
  const tools=main.querySelector('.directory-tools');
  main.insertBefore(section,tools||main.firstChild);
  const grid=section.querySelector('#servicePortalsGrid');
  const norm=s=>String(s||'').toLocaleLowerCase('ne-NP').replace(/[\s\-_\/]+/g,'').trim();
  function render(q){
    const nq=norm(q);
    let list=portals.map((p,i)=>({p,i,score:nq&&p.queries.some(x=>norm(x)===nq)?100:(nq&&p.queries.some(x=>norm(x).includes(nq)||nq.includes(norm(x)))?60:0)})).filter(x=>!nq||x.score>0).sort((a,b)=>b.score-a.score||a.i-b.i).slice(0, nq?4:10);
    grid.innerHTML=list.map(({p,score})=>'<a class="service-portal-card '+(score>=100?'is-exact':'')+'" href="'+p.url+'" target="_blank" rel="noopener noreferrer"><div class="service-portal-icon">'+p.icon+'</div><strong>'+p.title+'</strong><small>'+p.subtitle+'</small><small>'+p.description+'</small>'+(score>=100?'<small class="service-portal-badge">✓ तपाईंको खोजसँग मिल्यो</small>':'')+'<span>आधिकारिक साइट ↗</span></a>').join('');
    section.hidden=!!nq&&!list.length;
  }
  render('');
  search?.addEventListener('input',()=>render(search.value));
})();

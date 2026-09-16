/* Nepali Patro — Homepage Calendar Navigation + Date Details */
(function(){'use strict';
  function boot(){
    var el=document.getElementById('calendarPreview');
    if(!el||el.dataset.npCalendarNav)return;
    el.dataset.npCalendarNav='1';
    var months=['बैशाख','जेठ','असार','साउन','भदौ','असोज','कात्तिक','मंसिर','पुष','माघ','फागुन','चैत'];
    var days=['आइत','सोम','मंगल','बुध','बिही','शुक्र','शनि'];
    var nep=function(n){return String(n).replace(/\d/g,function(d){return '०१२३४५६७८९'[d]})};
    var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);});};
    var clean=function(v){return String(v==null?'':v).trim();};
    function kathmanduParts(){
      var parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kathmandu',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
      var get=function(type){var p=parts.find(function(x){return x.type===type});return p?Number(p.value):0;};
      return {year:get('year'),month:get('month'),day:get('day')};
    }
    var todayAD=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu'}).format(new Date());
    var state={year:null,month:null,todayYear:null,todayMonth:null,busy:false,observer:null,currentData:null};
    function load(src){return new Promise(function(resolve,reject){var old=document.querySelector('script[src="'+src+'"]');if(old){if(window.NPCalendarData)resolve();else{old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});}return;}var s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
    function ensureData(){if(window.NPCalendarData)return Promise.resolve();return load('/Nepali-Patro/js/core/data-client.js').then(function(){return load('/Nepali-Patro/js/core/calendar-data.js');});}
    function getYear(y){return window.NPCalendarData.year(y,{bust:false}).then(function(r){return r.data||{};});}
    function detailValue(label,value,icon){return '<div class="np-date-detail"><span class="np-date-detail-icon">'+icon+'</span><span><small>'+esc(label)+'</small><strong>'+esc(clean(value)||'—')+'</strong></span></div>';}
    function formatAd(ad){try{return new Intl.DateTimeFormat('ne-NP',{timeZone:'Asia/Kathmandu',year:'numeric',month:'long',day:'numeric'}).format(new Date(ad+'T00:00:00+05:45'));}catch(_){return ad;}}
    function openDetails(day){
      closeDetails();
      var modal=document.createElement('div');modal.className='np-date-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','npDateModalTitle');
      var festival=clean(day.festival),events=Array.isArray(day.events)?day.events.filter(Boolean):[];
      var holiday=day.holiday===true||clean(day.holiday).toLowerCase()==='true';
      var eventText=events.length?events.join(' • '):festival;
      modal.innerHTML='<div class="np-date-modal-backdrop" data-close-date></div><div class="np-date-modal-card"><button type="button" class="np-date-modal-close" aria-label="बन्द गर्नुहोस्" data-close-date>×</button><div class="np-date-modal-top"><span class="np-date-modal-badge">'+(holiday?'🇳🇵 बिदा':'📅 दिनको विवरण')+'</span><h3 id="npDateModalTitle">'+esc(day.bs.display)+'</h3><p>'+esc(day.weekday&&day.weekday.nepali)+' · '+esc(formatAd(day.ad.date))+'</p></div><div class="np-date-detail-grid">'+detailValue('तिथि',day.tithi&&day.tithi.name,'☀️')+detailValue('पक्ष',day.tithi&&day.tithi.paksha,'🌙')+detailValue('नक्षत्र',day.nakshatra&&day.nakshatra.name,'⭐')+detailValue('योग',day.yoga&&day.yoga.name,'🕉️')+detailValue('करण',day.karana&&day.karana.name,'◐')+detailValue('राशि',day.rashi,'♈')+detailValue('सूर्योदय',day.sun&&day.sun.sunrise,'🌅')+detailValue('सूर्यास्त',day.sun&&day.sun.sunset,'🌇')+'</div>'+(eventText?'<div class="np-date-events"><small>पर्व / कार्यक्रम</small><strong>'+(holiday?'🇳🇵 ':'')+esc(eventText)+'</strong></div>':'')+'<div class="np-date-modal-actions"><button type="button" class="np-date-open-calendar" data-open-calendar>पूर्ण पात्रोमा यो मिति खोल्नुहोस् <span>→</span></button></div></div>';
      document.body.appendChild(modal);document.body.classList.add('np-date-modal-open');
      requestAnimationFrame(function(){modal.classList.add('is-open');});
      modal.querySelectorAll('[data-close-date]').forEach(function(b){b.addEventListener('click',closeDetails);});
      modal.querySelector('[data-open-calendar]').addEventListener('click',function(){window.location.href='/Nepali-Patro/calendar/?date='+encodeURIComponent(day.ad.date);});
      modal.addEventListener('keydown',function(e){if(e.key==='Escape')closeDetails();});
      modal._previousFocus=document.activeElement;modal.querySelector('.np-date-modal-close').focus();
    }
    function closeDetails(){var modal=document.querySelector('.np-date-modal');if(!modal)return;var focus=modal._previousFocus;modal.remove();document.body.classList.remove('np-date-modal-open');if(focus&&focus.focus)focus.focus();}
    function render(y,m){
      if(state.busy)return Promise.resolve();state.busy=true;el.dataset.npCalendarPreview='loading';
      return getYear(y).then(function(data){
        var all=(data.days||[]).filter(function(x){return x.bs&&x.bs.month===m;});if(!all.length)throw Error('month');
        state.currentData=all;
        var first=all[0],start=new Date(first.ad.date+'T00:00:00Z').getUTCDay();
        var html='<div class="np-home-cal-head" data-canonical-home-calendar="1"><div class="np-home-cal-title"><small>महिना</small><strong>'+months[m-1]+' '+nep(y)+'</strong></div><div class="np-home-cal-controls"><button type="button" class="np-home-cal-btn np-home-cal-prev" aria-label="अघिल्लो महिना">‹</button><button type="button" class="np-home-cal-btn np-home-cal-today">आज</button><button type="button" class="np-home-cal-btn np-home-cal-next" aria-label="अर्को महिना">›</button><a class="np-home-cal-full" href="/Nepali-Patro/calendar/">पूर्ण पात्रो →</a></div></div>';
        html+='<div class="np-home-cal-grid">'+days.map(function(d){return '<span class="np-home-cal-week">'+d+'</span>';}).join('')+Array(start).fill('<span class="np-home-cal-empty"></span>').join('')+all.map(function(x,i){var isToday=x.ad.date===todayAD;var holiday=x.holiday===true||clean(x.holiday).toLowerCase()==='true';var tithi=clean(x.tithi&&x.tithi.name);var festival=clean(x.festival);var meta=festival||(holiday?'बिदा':'');return '<button type="button" class="np-home-cal-day '+(isToday?'today ':'')+(holiday?'holiday':'')+'" data-date-index="'+i+'" aria-label="'+esc(x.bs.display)+' — विवरण हेर्नुहोस्"><div class="np-cal-main"><b>'+nep(x.bs.day)+'</b><span class="np-cal-ad">'+x.ad.day+'</span></div>'+(tithi?'<div class="np-cal-tithi">'+esc(tithi)+'</div>':'')+'<div class="np-cal-meta">'+(meta?'<span class="'+(holiday?'np-cal-holiday':'np-cal-festival')+'">'+(holiday?'🇳🇵 ':'')+esc(meta)+'</span>':'')+'</div></button>';}).join('')+'</div>';
        el.innerHTML=html;el.dataset.npCalendarPreview='ready';state.year=y;state.month=m;state.busy=false;bind();
      }).catch(function(err){state.busy=false;showError();throw err;});
    }
    function bind(){
      var prev=el.querySelector('.np-home-cal-prev'),next=el.querySelector('.np-home-cal-next'),today=el.querySelector('.np-home-cal-today');
      if(prev)prev.onclick=function(){render(state.month===1?state.year-1:state.year,state.month===1?12:state.month-1);};
      if(next)next.onclick=function(){render(state.month===12?state.year+1:state.year,state.month===12?1:state.month+1);};
      if(today)today.onclick=function(){if(state.todayYear!=null)render(state.todayYear,state.todayMonth);};
      el.querySelectorAll('.np-home-cal-day').forEach(function(button){button.onclick=function(){var day=state.currentData[Number(button.dataset.dateIndex)];if(day)openDetails(day);};});
    }
    function protectCanonicalRenderer(){
      if(!window.MutationObserver)return;
      state.observer=new MutationObserver(function(){if(state.busy)return;var canonical=el.querySelector('[data-canonical-home-calendar="1"]');if(canonical)return;if(state.todayYear!=null&&state.todayMonth!=null)render(state.todayYear,state.todayMonth).catch(function(){});});
      state.observer.observe(el,{childList:true,subtree:false});
    }
    ensureData().then(function(){var now=kathmanduParts(),yearGuess=now.year+57;return getYear(yearGuess).then(function(data){var d=(data.days||[]).find(function(x){return x.ad&&x.ad.date===todayAD;});if(!d)throw Error('today');state.todayYear=d.bs.year;state.todayMonth=d.bs.month;protectCanonicalRenderer();return render(state.todayYear,state.todayMonth);});}).catch(function(){showError();});
    window.addEventListener('keydown',function(e){if(e.key==='Escape')closeDetails();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

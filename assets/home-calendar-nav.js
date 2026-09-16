/* Nepali Patro — Homepage Calendar Navigation */
(function(){'use strict';
  function boot(){
    var el=document.getElementById('calendarPreview');
    if(!el||el.dataset.npCalendarNav)return;
    el.dataset.npCalendarNav='1';
    var months=['बैशाख','जेठ','असार','साउन','भदौ','असोज','कात्तिक','मंसिर','पुष','माघ','फागुन','चैत'];
    var days=['आइत','सोम','मंगल','बुध','बिही','शुक्र','शनि'];
    var nep=function(n){return String(n).replace(/\d/g,function(d){return '०१२३४५६७८९'[d]})};
    var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);});};
    function kathmanduParts(){
      var parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kathmandu',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
      var get=function(type){var p=parts.find(function(x){return x.type===type});return p?Number(p.value):0;};
      return {year:get('year'),month:get('month'),day:get('day')};
    }
    var todayAD=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu'}).format(new Date());
    var state={year:null,month:null,todayYear:null,todayMonth:null,busy:false,observer:null};
    function load(src){return new Promise(function(resolve,reject){var old=document.querySelector('script[src="'+src+'"]');if(old){if(window.NPCalendarData)resolve();else{old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});}return;}var s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
    function ensureData(){if(window.NPCalendarData)return Promise.resolve();return load('/Nepali-Patro/js/core/data-client.js').then(function(){return load('/Nepali-Patro/js/core/calendar-data.js');});}
    function getYear(y){return window.NPCalendarData.year(y,{bust:false}).then(function(r){return r.data||{};});}
    function showError(){el.dataset.npCalendarPreview='error';el.innerHTML='<div style="padding:24px;text-align:center">पात्रो डेटा लोड हुन सकेन। <a href="/Nepali-Patro/calendar/">पूर्ण पात्रो खोल्नुहोस् →</a></div>';}
    function render(y,m){
      if(state.busy)return Promise.resolve();
      state.busy=true;
      el.dataset.npCalendarPreview='loading';
      return getYear(y).then(function(data){
        var all=(data.days||[]).filter(function(x){return x.bs&&x.bs.month===m;});
        if(!all.length)throw Error('month');
        var first=all[0],start=new Date(first.ad.date+'T00:00:00Z').getUTCDay();
        var html='<div class="np-home-cal-head" data-canonical-home-calendar="1"><div class="np-home-cal-title"><small>महिना</small><strong>'+months[m-1]+' '+nep(y)+'</strong></div><div class="np-home-cal-controls"><button type="button" class="np-home-cal-btn np-home-cal-prev" aria-label="अघिल्लो महिना">‹</button><button type="button" class="np-home-cal-btn np-home-cal-today">आज</button><button type="button" class="np-home-cal-btn np-home-cal-next" aria-label="अर्को महिना">›</button><a class="np-home-cal-full" href="/Nepali-Patro/calendar/">पूर्ण पात्रो →</a></div></div>';
        html+='<div class="np-home-cal-grid">'+days.map(function(d){return '<span class="np-home-cal-week">'+d+'</span>';}).join('')+Array(start).fill('<span class="np-home-cal-empty"></span>').join('')+all.map(function(x){var isToday=x.ad.date===todayAD;var holiday=x.holiday===true||String(x.holiday??'').trim().toLowerCase()==='true';var tithi=String(x.tithi&&x.tithi.name||'').trim();var festival=String(x.festival||'').trim();var meta=festival||(holiday?'बिदा':'');return '<a class="np-home-cal-day '+(isToday?'today ':'')+(holiday?'holiday':'')+'" href="/Nepali-Patro/calendar/?date='+encodeURIComponent(x.ad.date)+'" aria-label="'+esc(x.bs.display)+' — '+esc(tithi)+' — '+esc(x.ad.date)+'"><div class="np-cal-main"><b>'+nep(x.bs.day)+'</b><span class="np-cal-ad">'+x.ad.day+'</span></div>'+(tithi?'<div class="np-cal-tithi">'+esc(tithi)+'</div>':'')+'<div class="np-cal-meta">'+(meta?'<span class="'+(holiday?'np-cal-holiday':'np-cal-festival')+'">'+(holiday?'🇳🇵 ':'')+esc(meta)+'</span>':'')+'</div></a>';}).join('')+'</div>';
        el.innerHTML=html;el.dataset.npCalendarPreview='ready';state.year=y;state.month=m;state.busy=false;bind();
      }).catch(function(err){state.busy=false;showError();throw err;});
    }
    function bind(){
      var prev=el.querySelector('.np-home-cal-prev'),next=el.querySelector('.np-home-cal-next'),today=el.querySelector('.np-home-cal-today');
      if(prev)prev.onclick=function(){render(state.month===1?state.year-1:state.year,state.month===1?12:state.month-1);};
      if(next)next.onclick=function(){render(state.month===12?state.year+1:state.year,state.month===12?1:state.month+1);};
      if(today)today.onclick=function(){if(state.todayYear!=null)render(state.todayYear,state.todayMonth);};
    }
    function protectCanonicalRenderer(){
      if(!window.MutationObserver)return;
      state.observer=new MutationObserver(function(){
        if(state.busy)return;
        var canonical=el.querySelector('[data-canonical-home-calendar="1"]');
        if(canonical)return;
        if(state.todayYear!=null&&state.todayMonth!=null)render(state.todayYear,state.todayMonth).catch(function(){});
      });
      state.observer.observe(el,{childList:true,subtree:false});
    }
    ensureData().then(function(){
      var now=kathmanduParts(),yearGuess=now.year+57;
      return getYear(yearGuess).then(function(data){
        var d=(data.days||[]).find(function(x){return x.ad&&x.ad.date&&x.ad.date===todayAD;});
        if(!d)throw Error('today');
        state.todayYear=d.bs.year;state.todayMonth=d.bs.month;
        protectCanonicalRenderer();
        return render(state.todayYear,state.todayMonth);
      });
    }).catch(function(){showError();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

document.addEventListener('DOMContentLoaded',function(){
  var p=location.pathname.split('/').filter(Boolean),i=p.indexOf('Nepali-Patro'),key=(i>=0?p[i+1]:p[p.length-1]||'').toLowerCase(),target={patro:'calendar',calendar:'calendar',panchanga:'panchang',parba:'festivals',saith:'saait',rashifal:'rashifal',news:'news',converter:'converter'}[key];
  if(!target)return;
  var labels={calendar:'पात्रो',panchang:'पञ्चाङ्ग',festivals:'पर्व',saait:'साइत',rashifal:'राशिफल',news:'समाचार',converter:'मिति रूपान्तरण'};
  var style=document.createElement('style');style.textContent='.np-global-search{position:relative;margin-left:auto}.np-global-search input{width:210px;height:38px;border:1px solid #e2e5e9;border-radius:11px;padding:0 12px;background:#fff;color:#182230;outline:none}.np-global-search input:focus{border-color:#b91c1c;box-shadow:0 0 0 3px rgba(185,28,28,.08)}.np-search-results{position:absolute;right:0;top:46px;width:min(520px,calc(100vw - 24px));max-height:65vh;overflow:auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 18px 45px rgba(16,24,40,.18);padding:8px;z-index:300}.np-search-result{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #eee;background:#fff;padding:12px;border-radius:10px;cursor:pointer}.np-search-result:hover{background:#fff7f7}.np-search-result b,.np-search-result span,.np-search-result small{display:block}.np-search-result span,.np-search-result small{color:#667085;font-size:12px;margin-top:3px}.np-search-loading,.np-search-empty{padding:18px;color:#667085;text-align:center}.np-mobile-nav{display:none}@media(max-width:760px){.np-global-search{flex:1}.np-global-search input{width:100%}.np-mobile-nav{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:250;background:rgba(255,255,255,.97);border-top:1px solid #e5e7eb;justify-content:space-around;padding:8px 4px calc(8px + env(safe-area-inset-bottom))}.np-mobile-nav a{font-size:11px;text-decoration:none;color:#667085;text-align:center}.np-mobile-nav span{display:block;font-size:18px}body{padding-bottom:65px}}';document.head.appendChild(style);
  if(document.querySelector('main')){document.querySelectorAll('main>section[id]').forEach(function(s){if(s.id!==target&&s.id!=='dayDetail')s.remove()});document.querySelector('#quick')?.remove();document.querySelector('#homepageNewsSection')?.remove();var hero=document.querySelector('#today');if(hero&&target!=='calendar')hero.remove()}
  document.title=labels[target]+' — नेपाली पात्रो';
  var mobile=document.createElement('nav');mobile.className='np-mobile-nav';mobile.innerHTML='<a href="../patro/"><span>📅</span>पात्रो</a><a href="../panchanga/"><span>☀️</span>पञ्चाङ्ग</a><a href="../rashifal/"><span>♈</span>राशिफल</a><a href="../news/"><span>📰</span>समाचार</a><a href="../converter/"><span>⇄</span>रूपान्तरण</a>';document.body.appendChild(mobile);

  if(target==='calendar'){
    var tries=0;(function pickToday(){
      var today=document.querySelector('.day.today');
      if(today){today.click();return;}
      if(tries++<20)setTimeout(pickToday,250);
    })();
  }
});

document.addEventListener('DOMContentLoaded',async function(){
  if(location.pathname.indexOf('/panchanga/')<0)return;
  var q=new URLSearchParams(location.search),date=q.get('date');
  var parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  var today=(function(){var y=parts.find(function(x){return x.type==='year'}).value,m=parts.find(function(x){return x.type==='month'}).value,d=parts.find(function(x){return x.type==='day'}).value;return y+'-'+m+'-'+d})();
  date=/^\d{4}-\d{2}-\d{2}$/.test(date||'')?date:today;
  var esc=function(s){return String(s??'').replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]})};
  var candidates=[];var adYear=Number(date.slice(0,4));[adYear+57,adYear+56,adYear+58].forEach(function(y){if(candidates.indexOf(y)<0)candidates.push(y)});
  try{
    var found=null;
    for(var n=0;n<candidates.length;n++){
      try{var r=await fetch('../data/calendar/'+candidates[n]+'.json',{cache:'no-store'});if(!r.ok)continue;var j=await r.json();var x=(j.days||[]).find(function(d){return d.ad&&d.ad.date===date});if(x){found=x;break}}catch(e){}
    }
    var g=document.getElementById('panchangGrid');if(!found||!g){if(g)g.innerHTML='<div class="info-card"><span>स्थिति</span><b>यो मितिको पञ्चाङ्ग डेटा उपलब्ध छैन।</b></div>';return}
    var rows=[['BS मिति',found.bs&&found.bs.display],['AD मिति',found.ad&&found.ad.date],['वार',found.weekday&&found.weekday.nepali],['तिथि',found.tithi&&found.tithi.name],['तिथि समाप्ति',found.tithi&&found.tithi.end],['पक्ष',found.tithi&&found.tithi.paksha],['नक्षत्र',found.nakshatra&&found.nakshatra.name],['नक्षत्र समाप्ति',found.nakshatra&&found.nakshatra.end],['योग',found.yoga&&found.yoga.name],['योग समाप्ति',found.yoga&&found.yoga.end],['करण',found.karana&&found.karana.name],['करण समाप्ति',found.karana&&found.karana.end],['राशि',found.rashi],['सूर्योदय',found.sun&&found.sun.sunrise],['सूर्यास्त',found.sun&&found.sun.sunset],['राहुकाल',found.rahuKaal?found.rahuKaal.start+' – '+found.rahuKaal.end:'—'],['चन्द्रोदय',found.moon&&found.moon.rise],['चन्द्रास्त',found.moon&&found.moon.set],['चन्द्र अवस्था',found.moon&&found.moon.phase],['नेपाल संवत्',found.nepalSambat],['पर्व',found.festival||'—'],['बिदा',found.holiday?'हो':'होइन']];
    g.innerHTML=rows.map(function(row){return '<div class="info-card"><span>'+esc(row[0])+'</span><b>'+esc(row[1]||'डेटा उपलब्ध छैन')+'</b></div>'}).join('');
    var h=document.querySelector('.section-title h1,.section-title h2');if(h)h.textContent=found.bs.display+' को पञ्चाङ्ग';
    var hero=document.querySelector('#todayBs');if(hero)hero.textContent=found.bs.display;
    var ad=document.querySelector('#todayAd');if(ad)ad.textContent=date;
  }catch(e){var g2=document.getElementById('panchangGrid');if(g2)g2.innerHTML='<div class="info-card"><span>स्थिति</span><b>पञ्चाङ्ग डेटा लोड गर्न सकिएन।</b></div>'}
});
const DATA_URL='../data/live-tv.json';
const $=s=>document.querySelector(s);
let channels=[], hls=null, current=null;
const video=$('#video'), message=$('#playerMessage'), cards=$('#channels');

async function loadData(){
  try{const r=await fetch(`${DATA_URL}?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error('catalog');const d=await r.json();channels=d.channels||[];render();setCount('तयार');}
  catch(e){cards.innerHTML='<div class="source-note">च्यानल सूची लोड हुन सकेन। केही बेरपछि फेरि प्रयास गर्नुहोस्।</div>';setCount('डेटा उपलब्ध छैन');}
}
function setCount(t){$('#liveCount').textContent=t;}
function render(){
  const q=($('#search').value||'').trim().toLowerCase(), g=$('#groupFilter').value;
  const list=channels.filter(c=>(g==='all'||c.group===g)&&(!q||`${c.name} ${c.group}`.toLowerCase().includes(q)));
  cards.innerHTML=list.map(c=>`<button class="channel ${current?.id===c.id?'selected':''}" data-id="${escapeHtml(c.id)}"><img class="logo" src="${escapeAttr(c.logo)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span class="channel-main"><span class="channel-name">${escapeHtml(c.name)}</span><span class="channel-meta"><i class="dot unknown"></i><span>HLS · जाँच नभएको</span></span></span></button>`).join('')||'<div class="source-note">च्यानल भेटिएन।</div>';
  cards.querySelectorAll('.channel').forEach(b=>b.addEventListener('click',()=>selectChannel(channels.find(c=>c.id===b.dataset.id))));
}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function escapeAttr(s){return escapeHtml(s).replace(/`/g,'&#96;');}
function stop(){if(hls){hls.destroy();hls=null}video.pause();video.removeAttribute('src');video.load();}
function selectChannel(c){
  if(!c)return;current=c;render();stop();message.textContent='Stream लोड हुँदैछ…';$('#nowName').textContent=c.name;$('#nowStatus').textContent='HLS stream जाँच हुँदैछ';const a=$('#openStream');a.href=c.stream;a.hidden=false;
  if(window.Hls&&Hls.isSupported()){
    hls=new Hls({enableWorker:true,lowLatencyMode:true,backBufferLength:30});
    hls.loadSource(c.stream);hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED,()=>{message.hidden=true;$('#nowStatus').textContent='LIVE stream तयार छ';});
    hls.on(Hls.Events.ERROR,(_,d)=>{if(d.fatal){message.hidden=false;message.textContent='यो stream अहिले चल्न सकेन। Alternate stream वा official page प्रयोग गर्नुहोस्।';$('#nowStatus').textContent='Stream unavailable';markCard(c.id,'offline');}});
  }else if(video.canPlayType('application/vnd.apple.mpegurl')){
    video.src=c.stream;video.addEventListener('loadedmetadata',()=>{message.hidden=true},{once:true});video.addEventListener('error',()=>{message.hidden=false;message.textContent='यो stream browser मा उपलब्ध छैन।';$('#nowStatus').textContent='Stream unavailable'},{once:true});
  }else{message.textContent='तपाईंको browser ले HLS support गर्दैन। Chrome/Edge/Safari प्रयोग गर्नुहोस्।';}
}
function markCard(id,status){const b=cards.querySelector(`[data-id="${CSS.escape(id)}"]`);if(!b)return;const dot=b.querySelector('.dot'),txt=b.querySelector('.channel-meta span');dot.className=`dot ${status}`;txt.textContent=status==='online'?'LIVE उपलब्ध':status==='offline'?'अहिले उपलब्ध छैन':'जाँच नभएको';}
async function checkStream(c){
  try{const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),7000);const r=await fetch(c.stream,{method:'GET',cache:'no-store',signal:ctl.signal,headers:{Accept:'application/vnd.apple.mpegurl,application/x-mpegURL,*/*'}});clearTimeout(timer);if(!r.ok)throw 0;const t=(await r.text()).slice(0,1000);if(!t.includes('#EXTM3U'))throw 0;markCard(c.id,'online');return true;}catch(e){markCard(c.id,'offline');return false;}
}
async function healthCheck(){setCount('Stream जाँच हुँदैछ…');render();let ok=0;for(const c of channels){if(await checkStream(c))ok++;}setCount(`${ok}/${channels.length} streams उपलब्ध`);}
$('#search').addEventListener('input',render);$('#groupFilter').addEventListener('change',render);$('#refreshBtn').addEventListener('click',healthCheck);loadData();

(() => {
  'use strict';
  const API = 'https://shubhamnpk.github.io/yonepse/data';
  const REFRESH_MS = 60000;
  let stocks = [];
  const $ = id => document.getElementById(id);
  const num = (v, d=2) => Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d}) : '—';
  const compact = v => Number.isFinite(Number(v)) ? new Intl.NumberFormat('en-IN',{notation:'compact',maximumFractionDigits:2}).format(Number(v)) : '—';
  const pctClass = v => Number(v)>0?'up':Number(v)<0?'down':'';
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function get(path){
    const r=await fetch(`${API}/${path}?v=${Date.now()}`,{cache:'no-store'});
    if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  }
  function pickIndex(indices){
    return (indices||[]).find(x=>String(x.index||x.name||'').toLowerCase()==='nepse') || (indices||[]).find(x=>/nepse/i.test(String(x.index||x.name||''))) || indices?.[0];
  }
  function renderIndex(x){
    if(!x)return;
    const value=x.currentValue ?? x.close ?? x.value ?? x.indexValue;
    const change=x.change ?? x.diff ?? (Number(value)-Number(x.previousClose));
    const pc=x.perChange ?? x.percentChange ?? (Number(x.previousClose)?Number(change)/Number(x.previousClose)*100:NaN);
    $('nepseIndex').textContent=num(value,2);
    $('nepseChange').textContent=`${Number(change)>=0?'+':''}${num(change,2)} (${Number(pc)>=0?'+':''}${num(pc,2)}%)`;
    $('nepseChange').className=pctClass(pc);
  }
  function renderSummary(s){
    if(!s)return;
    $('turnover').textContent=compact(s.turnover ?? s.totalTurnover);
    $('transactions').textContent=compact(s.totalTrades ?? s.transactions ?? s.totalTransactions);
    $('tradedScrips').textContent=num(s.tradedScrips ?? s.totalTradedScrips ?? s.totalScrips,0);
    const a=s.advances ?? s.advanced ?? s.advancing;
    const d=s.declines ?? s.declined ?? s.declining;
    const u=s.unchanged ?? s.unchangedScrips;
    $('breadth').textContent=[a!=null?`↑ ${a}`:'',d!=null?`↓ ${d}`:'',u!=null?`• ${u}`:''].filter(Boolean).join('  ')||'—';
    $('turnoverSub').textContent='आजको बजार'; $('transactionsSub').textContent='कुल कारोबार';
  }
  function row(x){
    const pc=x.percent_change ?? x.percentChange ?? x.perChange ?? 0;
    const ch=x.change ?? x.diff ?? 0;
    return `<tr><td><span class="symbol">${esc(x.symbol)}</span><span class="company">${esc(x.name)}</span></td><td>${num(x.ltp ?? x.lastTradedPrice)}</td><td class="${pctClass(ch)}">${Number(ch)>=0?'+':''}${num(ch)}</td><td class="${pctClass(pc)}">${Number(pc)>=0?'+':''}${num(pc)}%</td><td>${num(x.high)}</td><td>${num(x.low)}</td><td>${compact(x.volume ?? x.quantity)}</td><td>${compact(x.turnover)}</td></tr>`;
  }
  function renderTable(){
    const q=$('stockSearch').value.trim().toLowerCase();
    const filtered=stocks.filter(x=>!q||String(x.symbol).toLowerCase().includes(q)||String(x.name).toLowerCase().includes(q)).slice(0,250);
    $('stockTable').innerHTML=filtered.length?filtered.map(row).join(''):`<tr><td colspan="8" class="loading">कुनै शेयर भेटिएन।</td></tr>`;
  }
  function renderMovers(list,id){
    const arr=(list||[]).slice(0,8);
    $(id).innerHTML=arr.length?arr.map(x=>{const p=x.percent_change ?? x.percentChange ?? x.perChange ?? 0; return `<div class="mini-row"><strong>${esc(x.symbol)}</strong><span>${num(x.ltp ?? x.lastTradedPrice)}</span><span class="${pctClass(p)}">${Number(p)>=0?'+':''}${num(p)}%</span></div>`}).join(''):'<p class="loading">डेटा उपलब्ध छैन।</p>';
  }
  async function load(){
    $('marketState').innerHTML='<span class="dot"></span><span>डेटा अपडेट हुँदैछ…</span>';
    try{
      const [status,indices,summary,top,data]=await Promise.all([
        get('market/status.json'),get('market/indices.json'),get('market/summary.json'),get('market/top_stocks.json'),get('nepse_data.json')
      ]);
      stocks=Array.isArray(data)?data:[];
      renderIndex(pickIndex(indices)); renderSummary(summary); renderMovers(top?.gainers,'gainers'); renderMovers(top?.losers,'losers'); renderTable();
      const open=Boolean(status?.is_open ?? status?.isOpen);
      $('marketState').innerHTML=`<span class="dot ${open?'live':''}"></span><span>${open?'बजार खुला':'बजार बन्द'} · latest published data</span>`;
      const stamp=status?.last_checked || status?.lastChecked || indices?.[0]?.generatedTime || stocks.find(x=>x.last_updated)?.last_updated;
      $('lastUpdated').textContent=`अन्तिम अपडेट: ${stamp?new Date(stamp).toLocaleString('ne-NP',{dateStyle:'medium',timeStyle:'medium'}):'उपलब्ध छैन'}`;
      $('sourceStatus').textContent=`${stocks.length.toLocaleString('en-IN')} securities loaded · ${new Date().toLocaleTimeString('ne-NP')}`;
      $('sourceLink').onclick=()=>window.open(`${API}/nepse_data.json`,'_blank','noopener');
    }catch(e){
      $('marketState').innerHTML='<span class="dot"></span><span>डेटा स्रोत अस्थायी रूपमा उपलब्ध छैन</span>';
      $('sourceStatus').textContent=`Source error: ${e.message}`;
    }
  }
  $('stockSearch').addEventListener('input',renderTable);
  $('refreshBtn').addEventListener('click',load);
  load(); setInterval(load,REFRESH_MS);
})();

/* Kundali engine loader — direct ESM import with safe fallback. */
(async()=>{
  const state=document.getElementById('engineState');
  const meta=document.getElementById('engineMeta');
  const error=document.getElementById('error');
  const source='./kundali-v3.js?v=20260907-04';
  const cdns=[
    'https://esm.sh/@swisseph/browser@1.3.1',
    'https://cdn.jsdelivr.net/npm/@swisseph/browser@1.3.1/+esm'
  ];
  const show=(s,m)=>{if(state)state.textContent=s;if(meta)meta.textContent=m};
  try{
    show('इन्जिन जाँच हुँदैछ…','Swiss Ephemeris module');
    const r=await fetch(source,{cache:'no-store'});
    if(!r.ok)throw new Error(`Kundali module ${r.status}`);
    const code=await r.text();
    const original='https://cdn.jsdelivr.net/npm/@swisseph/browser@1.3.1/+esm';
    let lastError=null;
    for(const cdn of cdns){
      try{
        show('इन्जिन लोड हुँदैछ…',`Swiss Ephemeris · ${cdn.includes('esm.sh')?'ESM':'jsDelivr'}`);
        const patched=code.replace(original,cdn);
        const blob=new Blob([patched],{type:'text/javascript'});
        const url=URL.createObjectURL(blob);
        await import(url);
        setTimeout(()=>URL.revokeObjectURL(url),60000);
        show('✓ गणना इन्जिन तयार',`Swiss Ephemeris · ${cdn.includes('esm.sh')?'ESM':'jsDelivr'}`);
        if(error){error.hidden=true;error.textContent='';}
        return;
      }catch(e){lastError=e;console.warn('[Kundali] CDN failed:',cdn,e);}
    }
    throw lastError||new Error('Swiss Ephemeris module load failed');
  }catch(e){
    console.error('[Kundali] engine load failed',e);
    show('✕ गणना इन्जिन लोड भएन','Swiss Ephemeris module unavailable');
    if(error){error.hidden=false;error.textContent='गणना इन्जिन लोड हुन सकेन। नेटवर्क वा CDN उपलब्धता जाँच गर्नुहोस्।';}
  }
})();

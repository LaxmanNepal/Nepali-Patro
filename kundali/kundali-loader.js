/* Kundali resilient module loader. Keeps the page usable when one CDN fails. */
(async()=>{
  const state=document.getElementById('engineState');
  const meta=document.getElementById('engineMeta');
  const source='./kundali-v3.js?v=20260830-06';
  const cdns=[
    'https://esm.sh/@swisseph/browser@1.3.1',
    'https://cdn.jsdelivr.net/npm/@swisseph/browser@1.3.1/+esm'
  ];
  try{
    if(state)state.textContent='इन्जिन जाँच हुँदैछ…';
    const r=await fetch(source,{cache:'no-store'});
    if(!r.ok)throw new Error(`Kundali module ${r.status}`);
    let code=await r.text();
    const original="https://cdn.jsdelivr.net/npm/@swisseph/browser@1.3.1/+esm";
    let lastError=null;
    for(const cdn of cdns){
      try{
        const patched=code.replace(original,cdn);
        const blob=new Blob([patched],{type:'text/javascript'});
        const url=URL.createObjectURL(blob);
        await import(url);
        setTimeout(()=>URL.revokeObjectURL(url),60000);
        if(meta)meta.textContent=`Swiss Ephemeris · ${cdn.includes('esm.sh')?'ESM fallback':'jsDelivr'}`;
        return;
      }catch(e){lastError=e}
    }
    throw lastError||new Error('Swiss Ephemeris module load failed');
  }catch(e){
    console.error('[Kundali] module load failed',e);
    if(state)state.textContent='✕ गणना इन्जिन लोड भएन';
    if(meta)meta.textContent='Swiss Ephemeris module उपलब्ध भएन';
    const err=document.getElementById('error');
    if(err){err.hidden=false;err.textContent='गणना इन्जिन लोड हुन सकेन। कृपया पेज refresh गर्नुहोस्। यदि समस्या दोहोरियो भने browser console मा module/CDN error जाँच गर्नुहोस्।'}
  }
})();

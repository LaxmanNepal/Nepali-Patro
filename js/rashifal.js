(()=>{
  // Compatibility loader. Rashifal content MUST come from archived source snapshots.
  // The previous deterministic/generative forecast engine has been removed.
  if(document.querySelector('[data-rashifal-source-renderer]'))return;
  if(!document.querySelector('#daily,#weekly,#zodiacGrid'))return;
  const script=document.createElement('script');
  script.src=new URL('rashifal-only.js',new URL('./',location.href)).href+'?v=20260829';
  script.defer=true;
  script.dataset.rashifalSourceRenderer='true';
  document.head.appendChild(script);
})();

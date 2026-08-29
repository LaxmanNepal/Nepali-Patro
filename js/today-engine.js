(()=>{
  // Legacy compatibility shim.
  // The homepage already has a canonical data renderer. Never inject a second
  // "today" dashboard or duplicate news/finance/trending content.
  const hasCanonicalHomepage=()=>Boolean(document.querySelector('#todayBs,#panchangaPreview,#calendarPreview,#rashifalPreview'));
  if(hasCanonicalHomepage())return;
  // Keep this file harmless on older cached pages; content must be rendered by
  // the page-specific canonical modules instead of this legacy aggregator.
})();

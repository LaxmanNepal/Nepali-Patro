/* Calendar dataset adapter. Feature code should use this instead of fetch(). */
(()=>{
  'use strict';
  const client=window.NPData;
  if(!client?.get)return;
  window.NPCalendarData={
    async years(options={}){return client.get('years',{ttl:86400000,bust:false,...options});},
    async year(year,options={}){return client.get('calendar',{year,ttl:3600000,bust:false,...options});}
  };
})();

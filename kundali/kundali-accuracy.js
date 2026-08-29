/* Kundali accuracy guard: historical-offset resolution, input sanity checks, and audit metadata. */
const TZ_API='https://timeapi.io/api/timezone/coordinate';
const $=id=>document.getElementById(id);
function offsetFromParts(parts){const s=parts?.seconds??parts?.totalSeconds;return Number.isFinite(s)?s/3600:null}
function historicalOffset(zone,date){try{const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);const get=k=>Number(parts.find(p=>p.type===k)?.value);const asUTC=Date.UTC(get('year'),get('month')-1,get('day'),get('hour'),get('minute'),get('second'));return (asUTC-date.getTime())/3600000}catch{return null}}
async function resolveHistoricalTimezone(lat,lon,birthDate){
  try{
    const r=await fetch(`${TZ_API}?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`,{headers:{Accept:'application/json'}});
    if(!r.ok)return null;
    const j=await r.json();
    const zone=j.timeZone||j.timezone||j.ianaTimeZone||j.ianaTimeId||j.id;
    if(!zone)return offsetFromParts(j.currentUtcOffset);
    const offset=historicalOffset(zone,birthDate);
    return {zone,offset:offset??offsetFromParts(j.currentUtcOffset)};
  }catch{return null}
}
function validate(){
  const y=Number($('year')?.value),m=Number($('month')?.value),d=Number($('day')?.value),[hh,mm]=($('time')?.value||'12:00').split(':').map(Number);
  const lat=Number($('lat')?.value),lon=Number($('lon')?.value),tz=Number($('tz')?.value);
  const errors=[];if(!Number.isInteger(y)||y<1200||y>2200)errors.push('वर्ष अमान्य छ');if(!Number.isInteger(m)||m<1||m>12)errors.push('महिना अमान्य छ');if(!Number.isInteger(d)||d<1||d>31)errors.push('गते अमान्य छ');if(!Number.isInteger(hh)||hh<0||hh>23||!Number.isInteger(mm)||mm<0||mm>59)errors.push('समय अमान्य छ');if(!Number.isFinite(lat)||lat<-90||lat>90)errors.push('latitude अमान्य छ');if(!Number.isFinite(lon)||lon<-180||lon>180)errors.push('longitude अमान्य छ');if(!Number.isFinite(tz)||tz<-14||tz>14)errors.push('timezone अमान्य छ');return errors}
function audit(result){
  if(!result?.planets)return {ok:false,errors:['Calculation result missing planets']};
  const p=result.planets,r=[];
  if(Math.abs((((p.rahu.longitude-p.ketu.longitude+180)%360+360)%360)-180)>1e-7)r.push('Rahu/Ketu are not exactly 180° apart');
  if(p.moon.nak?.pada<1||p.moon.nak?.pada>4)r.push('Moon Nakshatra pada invalid');
  for(const k of Object.keys(p)){if(p[k].longitude<0||p[k].longitude>=360)r.push(`${k}: longitude outside 0–360°`);if(p[k].sign!==Math.floor(p[k].longitude/30))r.push(`${k}: sign mismatch`) }
  return {ok:r.length===0,errors:r,engine:'Swiss Ephemeris',checkedAt:new Date().toISOString()}
}
window.KundaliAccuracy={resolveHistoricalTimezone,validate,audit,historicalOffset};

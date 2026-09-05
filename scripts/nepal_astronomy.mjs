/**
 * Deterministic Nepal daily astronomy helpers.
 * Location: Kathmandu (27.7172 N, 85.3240 E), Nepal Time UTC+05:45.
 * Sunrise/sunset uses the NOAA solar-position approximation. Rahu Kaal is
 * derived from weekday daylight segments, so no remote API is required.
 */
const LAT=27.7172,LON=85.3240,TZ=5.75;
const pad=n=>String(Math.floor(Math.abs(n))).padStart(2,'0');
const deg=v=>v*Math.PI/180,rad=v=>v*180/Math.PI;
const norm=v=>((v%360)+360)%360;
function timeFromMinutes(min){min=((min%1440)+1440)%1440;return pad(min/60)+':'+pad(min%60)}
function dayOfYear(date){return Math.floor((Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())-Date.UTC(date.getUTCFullYear(),0,0))/86400000)}
function solar(date,isRise){
 const n=dayOfYear(date),gamma=2*Math.PI/365*(n-1+(isRise?6:18)/24);
 const eq=229.18*(0.000075+0.001868*Math.cos(gamma)-0.032077*Math.sin(gamma)-0.014615*Math.cos(2*gamma)-0.040849*Math.sin(2*gamma));
 const decl=0.006918-0.399912*Math.cos(gamma)+0.070257*Math.sin(gamma)-0.006758*Math.cos(2*gamma)+0.000907*Math.sin(2*gamma)-0.002697*Math.cos(3*gamma)+0.00148*Math.sin(3*gamma);
 const zen=deg(90.833),lat=deg(LAT);
 const cosH=(Math.cos(zen)/(Math.cos(lat)*Math.cos(decl)))-Math.tan(lat)*Math.tan(decl);
 if(cosH>1||cosH<-1)return null;
 const ha=rad(Math.acos(cosH));
 const noon=720-4*LON-eq+TZ*60;
 return timeFromMinutes(noon+(isRise?-4*ha:4*ha));
}
export function sunTimes(adDate){const d=new Date(adDate+'T00:00:00Z');return {sunrise:solar(d,true),sunset:solar(d,false)}}
export function rahuKaal(adDate,sunrise,sunset){
 if(!sunrise||!sunset)return null;
 const toMin=s=>{const [h,m]=s.split(':').map(Number);return h*60+m};
 const rise=toMin(sunrise),set=toMin(sunset),segment=(set-rise)/8;
 // JS weekday: Sun=0..Sat=6; Rahu segment order follows standard weekday rule.
 const segmentIndex=[7,1,6,4,5,3,2][new Date(adDate+'T00:00:00Z').getUTCDay()];
 const start=rise+(segmentIndex-1)*segment,end=start+segment;
 return {start:timeFromMinutes(start),end:timeFromMinutes(end)};
}

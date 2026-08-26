/* Self-contained Kundali fallback engine.
 * No WASM, no CDN, no runtime binary fetches.
 * Meeus-style low-precision solar/lunar + planetary mean-orbit fallback.
 * The UI must label this as fallback/approximate, not Swiss Ephemeris.
 */
const K= Math.PI/180, TAU=2*Math.PI;
const names=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
const signs=['मेष','वृष','मिथुन','कर्कट','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];
function norm(x){return ((x%360)+360)%360}
function jd(date){return date.getTime()/86400000+2440587.5}
function days(j){return j-2451543.5}
function orbit(d,N,i,w,a,e,M){N*=K;i*=K;w*=K;M=norm(M)*K;const E=M+e*Math.sin(M)*(1+e*Math.cos(M));let xv=a*(Math.cos(E)-e),yv=a*Math.sqrt(1-e*e)*Math.sin(E);const v=Math.atan2(yv,xv),r=Math.hypot(xv,yv);return {x:r*(Math.cos(N)*Math.cos(v+w)-Math.sin(N)*Math.sin(v+w)*Math.cos(i)),y:r*(Math.sin(N)*Math.cos(v+w)+Math.cos(N)*Math.sin(v+w)*Math.cos(i)),z:r*Math.sin(v+w)*Math.sin(i)}}
function pos(d,n){
 const data={Mercury:[48.3313+.0000324587*d,7.0047+.00000005*d,0.387098,.387098,.205635+.000000000559*d,168.6562+4.0923344368*d],Venus:[76.6799+.000024659*d,3.3946+.0000000275*d,.72333,.72333,.006773-.000000001302*d,48.0052+1.6021302244*d],Mars:[49.5574+.0000211081*d,1.8497-.0000000178*d,1.523688,1.523688,.093405+.000000002516*d,18.6021+.5240207766*d],Jupiter:[100.4542+.0000276854*d,1.303-.0000001557*d,5.20256,5.20256,.048498+.000000004469*d,19.895+.0830853001*d],Saturn:[113.6634+.000023898*d,2.4886-.0000001081*d,9.55475,9.55475,.055546-.000000000346*d,316.967+.0334442282*d]};
 const p=data[n];let q=orbit(d,...p);return norm(Math.atan2(q.y,q.x)/K)
}
function sun(d){return norm(280.460+0.9856474*d+1.915*Math.sin((357.528+0.9856003*d)*K)+.020*Math.sin(2*(357.528+0.9856003*d)*K))}
function moon(d){const L=norm(218.316+13.176396*d),M=norm(134.963+13.064993*d),F=norm(93.272+13.22935*d);return norm(L+6.289*Math.sin(M*K)+1.274*Math.sin((2*(L-(218.316+0.9856474*d))-M)*K)+.658*Math.sin(2*(L-(218.316+0.9856474*d))*K)-.186*Math.sin((357.529+.9856*d)*K)-.059*Math.sin((2*M-2*F)*K))}
function ayan(d,mode='lahiri'){const years=d/365.2425;const base={lahiri:23.85675,raman:22.460,krishnamurti:23.85675}[mode]??23.85675;return base+0.013968*years}
function nak(lon){const span=360/27,n=Math.floor(norm(lon)/span);return {index:n,name:['अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा','पुनर्वसु','पुष्य','आश्लेषा','मघा','पूर्वाफाल्गुनी','उत्तराफाल्गुनी','हस्त','चित्रा','स्वाती','विशाखा','अनुराधा','ज्येष्ठा','मूल','पूर्वाषाढा','उत्तराषाढा','श्रवण','धनिष्ठा','शतभिषा','पूर्वाभाद्रपद','उत्तराभाद्रपद','रेवती'][n],pada:Math.floor((norm(lon)%span)/(span/4))+1}}
export function calculate({date,lat,lon,ayanamsa='lahiri'}){const J=jd(date),d=days(J),a=ayan(d,ayanamsa);const tropical={Sun:sun(d),Moon:moon(d),Mercury:pos(d,'Mercury'),Venus:pos(d,'Venus'),Mars:pos(d,'Mars'),Jupiter:pos(d,'Jupiter'),Saturn:pos(d,'Saturn')};const out={};for(const n of names){const l=norm(tropical[n]-a);out[n]={longitude:l,sign:Math.floor(l/30),degree:l%30,nakshatra:nak(l)}}const rahu=norm(125.04452-0.0529538083*d-a);out.Rahu={longitude:rahu,sign:Math.floor(rahu/30),degree:rahu%30,nakshatra:nak(rahu)};out.Ketu={longitude:norm(rahu+180),sign:Math.floor(norm(rahu+180)/30),degree:norm(rahu+180)%30,nakshatra:nak(norm(rahu+180))};return {engine:'Kundali Safe Fallback',precision:'approximate',julianDay:J,ayanamsa,planets:out,signs}}
export {signs};

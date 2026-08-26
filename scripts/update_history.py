#!/usr/bin/env python3
import html,json,os,re
from datetime import datetime
from urllib.parse import quote
from urllib.request import Request,urlopen
from xml.etree import ElementTree as ET
from zoneinfo import ZoneInfo
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),".."));CAL_DIR=os.path.join(ROOT,"data","calendar");HISTORY_DIR=os.path.join(ROOT,"data","itihas")
MONTHS={1:("baishakh","बैशाख"),2:("jestha","जेठ"),3:("ashar","असार"),4:("shrawan","साउन"),5:("bhadra","भदौ"),6:("ashoj","असोज"),7:("kartik","कात्तिक"),8:("mangsir","मंसिर"),9:("poush","पुष"),10:("magh","माघ"),11:("fagun","फागुन"),12:("chaitra","चैत")}
def fetch(url):
 r=Request(url,headers={"User-Agent":"Nepali-Patro-HistoryBot/8.0"})
 with urlopen(r,timeout=25) as x:return x.read().decode("utf-8","replace")
def jget(url):return json.loads(fetch(url))
def today_bs():
 iso=datetime.now(ZoneInfo("Asia/Kathmandu")).strftime("%Y-%m-%d")
 for n in sorted(os.listdir(CAL_DIR)):
  if not n.endswith('.json'):continue
  try:d=json.load(open(os.path.join(CAL_DIR,n),encoding='utf-8'))
  except Exception:continue
  for day in d.get('days',[]):
   if day.get('ad',{}).get('date')==iso:return day
 raise RuntimeError(f'BS date not found for {iso}')
def ensure_file(day):
 bs=day['bs'];slug,mne=MONTHS[int(bs['month'])];os.makedirs(os.path.join(HISTORY_DIR,slug),exist_ok=True);p=os.path.join(HISTORY_DIR,slug,f"{int(bs['day'])}.json")
 if not os.path.exists(p):
  with open(p,'w',encoding='utf-8') as f:json.dump({'version':8,'bs_year':int(bs['year']),'bs_month':int(bs['month']),'bs_month_ne':mne,'bs_day':int(bs['day']),'bs_date':bs.get('display'),'ad_date':day['ad']['date'],'events':[],'births':[],'deaths':[],'research_leads':[],'sources':[],'last_researched':None},f,ensure_ascii=False,indent=2)
 return p,slug,mne
def wiki(lang,month,day,kind):
 try:p=jget(f'https://{lang}.wikipedia.org/api/rest_v1/feed/onthisday/{kind}/{month:02d}/{day:02d}')
 except Exception as e:print('wiki',lang,kind,e);return []
 out=[]
 for it in p.get(kind,[]):
  pg=(it.get('pages') or [{}])[0];text=(it.get('text') or '').strip()
  if text:out.append({'year':it.get('year'),'title':pg.get('normalizedtitle') or pg.get('title') or text[:100],'summary':text,'type':{'events':'event','births':'birth','deaths':'death'}[kind],'source':f'Wikipedia {lang} On This Day','url':pg.get('content_urls',{}).get('desktop',{}).get('page',''),'source_tier':'reference','language':lang})
 return out
def ne_article(title):
 try:
  q=jget('https://ne.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch='+quote(title)+'&gsrlimit=1&prop=extracts|info&exintro=1&explaintext=1&inprop=url');pages=list(q.get('query',{}).get('pages',{}).values())
  if not pages:return None
  p=pages[0];s=re.sub(r'\s+',' ',p.get('extract','')).strip()
  return {'title':p.get('title'),'summary':s,'url':p.get('fullurl') or ''} if len(s)>=40 else None
 except Exception:return None
def normalize_nepali(x):
 if x.get('domain') not in ('nepal','hindu-dharma'):return x
 h=ne_article(x.get('title',''))
 if h:
  x.update({'original_title':x.get('title'),'original_summary':x.get('summary'),'title_ne':h['title'],'summary_ne':h['summary'],'title':h['title'],'summary':h['summary'],'language':'ne','translation_status':'source-native-nepali'})
  x['sources']=(x.get('sources') or [])+[{'name':'नेपाली विकिपिडिया','url':h['url'],'tier':'reference'}]
 else:x.update({'language':'en','translation_status':'needs-nepali-source'})
 return x
def news(queries):
 out=[]
 for q in queries:
  try:r=ET.fromstring(fetch('https://news.google.com/rss/search?q='+quote(q)+'&hl=ne&gl=NP&ceid=NP:ne'))
  except Exception:continue
  for it in r.findall('.//item')[:8]:
   t=html.unescape((it.findtext('title') or '').strip());u=(it.findtext('link') or '').strip();s=html.unescape(re.sub(r'<[^>]+>',' ',it.findtext('description') or '')).strip()
   if t:out.append({'title':t,'summary':s,'type':'research-lead','source':'Google News discovery','url':u,'query':q,'source_tier':'discovery','language':'ne'})
 return out
def norm(v):return re.sub(r'[^\w\u0900-\u097F]+','',str(v or '').casefold())
def domain_for(x,default='world'):
 t=(x.get('title','')+' '+x.get('summary','')).casefold()
 if any(k in t for k in ['नेपाल','नेपाली','काठमाडौं','काठमाडौँ','लुम्बिनी','गोरखा','शाह','राणा','पृथ्वीनारायण','त्रिभुवन','जनकपुर','पशुपतिनाथ','सगरमाथा']):return 'nepal'
 if any(k in t for k in ['हिन्दू','हिन्दु','शिव','विष्णु','राम','कृष्ण','महादेव','वेद','उपनिषद','पुराण','रामायण','महाभारत','गीता','दशैं','दशैँ','तिहार','शिवरात्रि','जनै पूर्णिमा','होली']):return 'hindu-dharma'
 return default
def classify(x,domain=None):
 d=domain or x.get('domain') or domain_for(x);t=(x.get('title','')+' '+x.get('summary','')).casefold();typ=x.get('type')
 cat='जन्म' if typ=='birth' else 'निधन' if typ=='death' else 'हिन्दू धर्म तथा परम्परा' if d=='hindu-dharma' else 'विश्व इतिहास'
 if typ not in ('birth','death'):
  if any(k in t for k in ['युद्ध','सेना','फौज','battle','war']):cat='युद्ध तथा सैन्य इतिहास'
  elif any(k in t for k in ['भूकम्प','बाढी','पहिरो','दुर्घटना','earthquake','flood']):cat='प्राकृतिक विपत्ति'
  elif any(k in t for k in ['राजा','राणा','शाह','सरकार','राष्ट्रपति','संविधान','राजनीति']):cat='राजनीति'
  elif any(k in t for k in ['मन्दिर','पर्व','संस्कृति','heritage','temple']):cat='संस्कृति तथा सम्पदा'
  elif any(k in t for k in ['विज्ञान','प्रविधि','technology','science']):cat='विज्ञान तथा प्रविधि'
  elif d=='nepal':cat='नेपाल इतिहास'
 x.update({'domain':d,'category':x.get('category') or cat,'importance':x.get('importance') or (5 if d!='world' else 3),'confidence':x.get('confidence') or ('medium' if typ=='research-lead' else 'high')})
 if x.get('source') and not x.get('sources'):x['sources']=[{'name':x['source'],'url':x.get('url',''),'tier':x.get('source_tier','reference')}]
 return x
def score(x):
 s=0;s+=55 if x.get('source_tier')=='reference' else 0;s+=15 if x.get('url') else 0;s+=10 if len(x.get('summary',''))>=80 else 0;s+=10 if x.get('year') is not None else 0;s+=10 if x.get('language')=='ne' else 0
 return min(s,100)
def enrich(x):
 if x.get('type')=='research-lead':return x
 text=(x.get('title','')+' '+x.get('summary','')).casefold();d=x.get('domain');cat=x.get('category');imp=int(x.get('importance') or (5 if d in ('nepal','hindu-dharma') else 3));q=score(x)
 if any(k in text for k in ['स्वतन्त्रता','संविधान','गणतन्त्र','युद्ध','राजा','राणा','पृथ्वीनारायण','लुम्बिनी','पशुपतिनाथ','राम','कृष्ण','बुद्ध']):imp=max(imp,5)
 if d=='nepal':why='यो घटना नेपालको इतिहास, राज्यव्यवस्था, समाज वा राष्ट्रिय पहिचान बुझ्न महत्त्वपूर्ण सन्दर्भ हो।'
 elif d=='hindu-dharma':why='यो विवरण हिन्दू धर्म, दर्शन, परम्परा वा सांस्कृतिक विरासत बुझ्न महत्त्वपूर्ण सन्दर्भ हो।'
 else:why='यो घटना विश्व इतिहास, समाज, राजनीति, विज्ञान वा संस्कृतिको विकास बुझ्न महत्त्वपूर्ण सन्दर्भ हो।'
 if cat=='जन्म':why='यस व्यक्तिको जन्मले सम्बन्धित इतिहास, विचार, कला, धर्म वा समाजमा दीर्घकालीन प्रभाव पारेको छ।'
 elif cat=='निधन':why='यस व्यक्तित्वको निधन ऐतिहासिक वा सांस्कृतिक स्मृतिमा उल्लेखनीय घटना बनेको छ।'
 elif any(k in text for k in ['संविधान','आन्दोलन','क्रान्ति','युद्ध','स्वतन्त्रता','सन्धि']):why='यस घटनाले शासन, अधिकार, युद्ध वा राजनीतिक परिवर्तनमा उल्लेखनीय प्रभाव पारेको छ।'
 reliability='उच्च' if q>=80 and x.get('source_tier')=='reference' else 'मध्यम' if q>=55 else 'कम'
 x.update({'importance':min(5,imp),'quality_score':q,'relevance_score':min(100,q+(10 if d in ('nepal','hindu-dharma') else 0)),'display_priority':min(200,imp*20+q+(10 if d in ('nepal','hindu-dharma') else 0)),'why_important':x.get('why_important') or why,'reliability':x.get('reliability') or reliability,'source_count':len(x.get('sources') or []),'verified_fact':x.get('source_tier')=='reference'})
 return x
def dedupe(items):
 out=[];seen=set()
 for x in sorted([enrich(z) for z in items],key=lambda z:(-int(z.get('display_priority') or 0),-int(z.get('quality_score') or 0))):
  k=(x.get('domain'),norm(x.get('title')),str(x.get('year') or ''))
  if k[1] and k not in seen:seen.add(k);out.append(x)
 return out
def main():
 day=today_bs();p,slug,mne=ensure_file(day);bs=day['bs'];ad=day['ad']['date'];m,d=map(int,ad.split('-')[1:]);data=json.load(open(p,encoding='utf-8'))
 existing=[]
 for b in ('events','births','deaths'):existing += [classify(x,x.get('domain')) for x in data.get(b,[]) if isinstance(x,dict)]
 candidates=[]
 for lang,dom in [('ne','nepal'),('en','world')]:
  for kind in ('events','births','deaths'):candidates += [classify(x,dom) for x in wiki(lang,m,d,kind)]
 candidates=[normalize_nepali(x) for x in candidates];merged=dedupe(existing+candidates)
 nq=[f'{mne} {int(bs["day"])} नेपाल इतिहास',f'{mne} {int(bs["day"])} नेपालको ऐतिहासिक घटना',f'{ad} नेपालको इतिहास'];hq=[f'{mne} {int(bs["day"])} हिन्दू धर्म इतिहास',f'{mne} {int(bs["day"])} हिन्दू पर्व परम्परा',f'{ad} सनातन धर्म इतिहास'];leads=news(nq+hq);clean=[];ls=set()
 for x in leads:
  x=classify(x,'hindu-dharma' if x.get('query') in hq else 'nepal');k=(x['domain'],norm(x['title']))
  if k[1] and k not in ls:ls.add(k);clean.append(x)
 now=datetime.now(ZoneInfo('UTC')).replace(microsecond=0).isoformat().replace('+00:00','Z');counts={z:sum(x.get('domain')==z for x in merged) for z in ('nepal','hindu-dharma','world')};verified_local=sum(1 for x in merged if x.get('domain') in ('nepal','hindu-dharma') and x.get('source_tier')=='reference');high_quality=sum(1 for x in merged if int(x.get('quality_score') or 0)>=80)
 if not merged and not clean:raise RuntimeError('Quality gate failed: no history data or research leads found')
 data.update({'version':8,'bs_year':int(bs['year']),'bs_month':int(bs['month']),'bs_month_ne':mne,'bs_day':int(bs['day']),'bs_date':bs.get('display'),'ad_date':ad,'last_researched':now,'events':[x for x in merged if x.get('type')=='event'][:180],'births':[x for x in merged if x.get('type')=='birth'][:80],'deaths':[x for x in merged if x.get('type')=='death'][:80],'research_leads':clean[:100],'research':{'status':'automated daily research v7','domains':['nepal','hindu-dharma','world'],'counts':counts,'verified_local_reference':verified_local,'high_quality_events':high_quality,'nepali_native':sum(1 for x in merged if x.get('language')=='ne'),'needs_nepali_source':sum(1 for x in merged if x.get('translation_status')=='needs-nepali-source'),'research_leads':len(clean),'quality_gate':'passed','enrichment':['why_important','reliability','source_count','verified_fact','display_priority'],'note':'Discovery results are never promoted to historical facts automatically.'},'sources':[{'name':'नेपाली विकिपिडिया','url':f'https://ne.wikipedia.org/wiki/Special:Search?search={quote(mne+" "+str(int(bs["day"]))) }','tier':'reference'},{'name':'English Wikipedia On This Day','url':'https://en.wikipedia.org/wiki/On_this_day','tier':'reference'}]})
 with open(p,'w',encoding='utf-8') as f:json.dump(data,f,ensure_ascii=False,indent=2);f.write('\n')
 print(f'Updated {p}: Nepal={counts["nepal"]}, Hindu={counts["hindu-dharma"]}, World={counts["world"]}, high_quality={high_quality}, leads={len(clean)}')
if __name__=='__main__':main()

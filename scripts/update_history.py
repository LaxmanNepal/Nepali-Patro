#!/usr/bin/env python3
import html,json,os,re
from datetime import datetime
from urllib.parse import quote
from urllib.request import Request,urlopen
from xml.etree import ElementTree as ET
from zoneinfo import ZoneInfo

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..")); CAL_DIR=os.path.join(ROOT,"data","calendar"); HISTORY_DIR=os.path.join(ROOT,"data","itihas")
MONTHS={1:("baishakh","बैशाख"),2:("jestha","जेठ"),3:("ashar","असार"),4:("shrawan","साउन"),5:("bhadra","भदौ"),6:("ashoj","असोज"),7:("kartik","कात्तिक"),8:("mangsir","मंसिर"),9:("poush","पुष"),10:("magh","माघ"),11:("fagun","फागुन"),12:("chaitra","चैत")}

def fetch(url):
 r=Request(url,headers={"User-Agent":"Nepali-Patro-HistoryBot/3.0"})
 with urlopen(r,timeout=25) as x:return x.read().decode("utf-8","replace")
def jget(url):return json.loads(fetch(url))
def today_bs():
 iso=datetime.now(ZoneInfo("Asia/Kathmandu")).strftime("%Y-%m-%d")
 for n in sorted(os.listdir(CAL_DIR)):
  if n.endswith('.json'):
   try:d=json.load(open(os.path.join(CAL_DIR,n),encoding='utf-8'))
   except:continue
   for day in d.get('days',[]):
    if day.get('ad',{}).get('date')==iso:return day
 raise RuntimeError(f'BS date not found for {iso}')
def ensure_file(day):
 bs=day['bs']; slug,ne=MONTHS[int(bs['month'])]; os.makedirs(os.path.join(HISTORY_DIR,slug),exist_ok=True); p=os.path.join(HISTORY_DIR,slug,f"{int(bs['day'])}.json")
 if not os.path.exists(p):
  with open(p,'w',encoding='utf-8') as f:json.dump({'version':4,'bs_year':int(bs['year']),'bs_month':int(bs['month']),'bs_month_ne':ne,'bs_day':int(bs['day']),'bs_date':bs.get('display'),'ad_date':day['ad']['date'],'events':[],'births':[],'deaths':[],'research_leads':[],'sources':[],'last_researched':None},f,ensure_ascii=False,indent=2);f.write('\n')
 return p,slug,ne
def wiki(lang,month,day,kind):
 url=f'https://{lang}.wikipedia.org/api/rest_v1/feed/onthisday/{kind}/{month:02d}/{day:02d}'
 try:p=jget(url)
 except Exception as e:print(f'wiki {lang}/{kind}: {e}');return []
 out=[]
 for it in p.get(kind,[]):
  pages=it.get('pages') or []; pg=pages[0] if pages else {}; text=(it.get('text') or '').strip()
  if not text:continue
  out.append({'year':it.get('year'),'title':pg.get('normalizedtitle') or pg.get('title') or text[:100],'summary':text,'type':{'events':'event','births':'birth','deaths':'death'}[kind],'source':f'Wikipedia {lang} On This Day','url':pg.get('content_urls',{}).get('desktop',{}).get('page',''),'source_tier':'reference'})
 return out
def news(queries):
 out=[]
 for q in queries:
  try:r=ET.fromstring(fetch('https://news.google.com/rss/search?q='+quote(q)+'&hl=ne&gl=NP&ceid=NP:ne'))
  except Exception as e:print(f'news: {e}');continue
  for it in r.findall('.//item')[:8]:
   t=html.unescape((it.findtext('title') or '').strip()); link=(it.findtext('link') or '').strip(); desc=html.unescape(re.sub(r'<[^>]+>',' ',it.findtext('description') or '')).strip()
   if t:out.append({'title':t,'summary':desc,'type':'research-lead','source':'Google News discovery','url':link,'query':q,'source_tier':'discovery'})
 return out
def norm(v):return re.sub(r'[^\w\u0900-\u097F]+','',str(v or '').casefold())
def domain_for(item,default='world'):
 t=(str(item.get('title',''))+' '+str(item.get('summary',''))).casefold()
 if any(x in t for x in ['नेपाल','नेपाली','काठमाडौं','काठमाडौँ','लुम्बिनी','गोरखा','शाह','राणा','पृथ्वीनारायण','त्रिभुवन','जनकपुर','पशुपतिनाथ','सगरमाथा']):return 'nepal'
 if any(x in t for x in ['हिन्दू','हिन्दु','शिव','विष्णु','राम','कृष्ण','कृष्ण','महादेव','वेद','उपनिषद','पुराण','रामायण','महाभारत','गीता','दशैं','दशैँ','तिहार','शिवरात्रि','जनै पूर्णिमा','होली']):return 'hindu-dharma'
 return default
def classify(item,domain=None):
 d=domain or domain_for(item); t=(str(item.get('title',''))+' '+str(item.get('summary',''))).casefold(); typ=item.get('type')
 if typ=='birth':cat='जन्म'
 elif typ=='death':cat='निधन'
 elif d=='hindu-dharma':cat='हिन्दू धर्म तथा परम्परा'
 elif any(x in t for x in ['युद्ध','सेना','फौज','battle','war']):cat='युद्ध तथा सैन्य इतिहास'
 elif any(x in t for x in ['भूकम्प','बाढी','पहिरो','दुर्घटना','earthquake','flood']):cat='प्राकृतिक विपत्ति'
 elif any(x in t for x in ['राजा','राणा','शाह','सरकार','राष्ट्रपति','संविधान','राजनीति']):cat='राजनीति'
 elif any(x in t for x in ['मन्दिर','पर्व','संस्कृति','heritage','temple']):cat='संस्कृति तथा सम्पदा'
 elif any(x in t for x in ['विज्ञान','प्रविधि','technology','science']):cat='विज्ञान तथा प्रविधि'
 elif d=='nepal':cat='नेपाल इतिहास'
 else:cat='विश्व इतिहास'
 item.update({'domain':d,'category':item.get('category') or cat,'importance':item.get('importance') or (5 if d in ('nepal','hindu-dharma') else 3),'confidence':item.get('confidence') or ('medium' if typ=='research-lead' else 'high')})
 if item.get('source'):item['sources']=item.get('sources') or [{'name':item['source'],'url':item.get('url',''),'tier':item.get('source_tier','reference')}]
 return item
def main():
 day=today_bs(); p,slug,mne=ensure_file(day); bs=day['bs']; ad=day['ad']['date']; m,d=map(int,ad.split('-')[1:]); data=json.load(open(p,encoding='utf-8'))
 existing=[classify(x,x.get('domain')) for x in data.get('events',[]) if isinstance(x,dict)]; seen={(x.get('domain'),norm(x.get('title'))) for x in existing if x.get('title')}
 candidates=[]
 # Nepal-specific and Hindu research are deliberately separate from world research.
 for lang,dom in [('ne','nepal'),('en','world')]:
  for kind in ('events','births','deaths'):
   for x in wiki(lang,m,d,kind):candidates.append(classify(x,dom if dom=='nepal' else None))
 # Hindu domain: research-date and tradition queries; these remain discovery leads unless sourced/curated.
 hindu_queries=[f'{mne} {int(bs["day"])} हिन्दू धर्म इतिहास',f'{mne} {int(bs["day"])} हिन्दू पर्व परम्परा',f'{ad} Hindu history festival',f'{ad} Sanatana Dharma history']
 nepal_queries=[f'{mne} {int(bs["day"])} नेपाल इतिहास',f'{mne} {int(bs["day"])} नेपालको ऐतिहासिक घटना',f'{ad} Nepal history',f'{ad} नेपालको इतिहास']
 leads=news(nepal_queries+hindu_queries)
 for x in candidates:
  key=(x.get('domain'),norm(x.get('title')))
  if key[1] and key not in seen:existing.append(x);seen.add(key)
 lead_seen=set(); clean=[]
 for x in leads:
  x['domain']='hindu-dharma' if any(q in x.get('query','') for q in hindu_queries) else 'nepal'
  x=classify(x,x['domain']);k=(x['domain'],norm(x['title']))
  if k[1] and k not in lead_seen:lead_seen.add(k);clean.append(x)
 now=datetime.now(ZoneInfo('UTC')).replace(microsecond=0).isoformat().replace('+00:00','Z')
 sources=[{'name':'Nepali Wikipedia On This Day','url':f'https://ne.wikipedia.org/api/rest_v1/feed/onthisday/events/{m:02d}/{d:02d}','tier':'reference'},{'name':'English Wikipedia On This Day','url':f'https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/{m:02d}/{d:02d}','tier':'reference'}]
 data.update({'version':4,'bs_year':int(bs['year']),'bs_month':int(bs['month']),'bs_month_ne':mne,'bs_day':int(bs['day']),'bs_date':bs.get('display'),'ad_date':ad,'last_researched':now,'events':existing[:150],'births':[x for x in existing if x.get('type')=='birth'][:60],'deaths':[x for x in existing if x.get('type')=='death'][:60],'research_leads':clean[:100],'research':{'status':'automated daily research v3','domains':['nepal','hindu-dharma','world'],'nepal_reference_candidates':sum(1 for x in existing if x.get('domain')=='nepal'),'hindu_reference_candidates':sum(1 for x in existing if x.get('domain')=='hindu-dharma'),'world_reference_candidates':sum(1 for x in existing if x.get('domain')=='world'),'research_leads':len(clean),'note':'Discovery results are not promoted to facts automatically; curated/reference content is preferred.'},'sources':sources})
 with open(p,'w',encoding='utf-8') as f:json.dump(data,f,ensure_ascii=False,indent=2);f.write('\n')
 print(f'Updated {p}: Nepal={sum(x.get("domain")=="nepal" for x in existing)}, Hindu={sum(x.get("domain")=="hindu-dharma" for x in existing)}, World={sum(x.get("domain")=="world" for x in existing)}, leads={len(clean)}')
if __name__=='__main__':main()

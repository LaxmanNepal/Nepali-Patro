import concurrent.futures
import difflib
import html
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

CONFIG_PATH=Path('feeds/feeds.js'); OUT=Path('feeds/news.json'); LEGACY_OUT=Path('data/news.json')
HEADERS={'User-Agent':'Mozilla/5.0 Nepali-Patro-News/3.0','Accept':'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5'}; DEV=re.compile(r'[\u0900-\u097F]')
CATEGORY_MAP={'all':'national','sports':'sports','finance':'business','tech':'technology','entertainment':'entertainment'}
SOURCE_NAMES={'onlinekhabar.com':'अनलाइनखबर','nagariknetwork.com':'नागरिक','ratopati.com':'रातोपाटी','setopati.com':'सेतोपाटी','gorkhapatraonline.com':'गोरखापत्र','bbc.co.uk':'बीबीसी नेपाली','annapurnapost.com':'अन्नपूर्ण पोस्ट','rajdhanidaily.com':'राजधानी','ujyaaloonline.com':'उज्यालो अनलाइन','news24nepal.com':'न्यूज २४ नेपाल','nepallive.com':'नेपाल लाइभ','myrepublica.nagariknetwork.com':'माइ रिपब्लिका','lokaantar.com':'लोकान्तर','dainiknepal.com':'दैनिक नेपाल','nepalsamaya.com':'नेपाल समय','pahilopost.com':'पहिलोपोस्ट','nepalheadlines.com':'नेपाल हेडलाइन्स','nepalpress.com':'नेपाल प्रेस','himalkhabar.com':'हिमालखबर','nepalnews.com':'नेपालन्युज','hamrokhelkud.com':'हाम्रो खेलकुद','goalnepal.com':'गोल नेपाल','khelpati.com':'खेलपाटी','nepalsportz.com':'नेपाल स्पोर्ट्स','cricnepal.com':'क्रिक नेपाल','newsofnepal.com':'न्युज अफ नेपाल','cricketnepal.org.np':'क्रिकेट नेपाल','sharesansar.com':'सेयरसंसार','abhiyandaily.com':'अभियान','clickmandu.com':'क्लिकमाण्डु','arthasarokar.com':'अर्थ सरोकार','bankingkhabar.com':'बैंकिङ खबर','vikasnews.com':'विकास न्यूज','aarthiknews.com':'आर्थिक न्यूज','techpana.com':'टेकपाना','nepalitelecom.com':'नेपाली टेलिकम','techmandu.com':'टेकमाण्डु','ictframe.com':'आईसीटी फ्रेम','techsathi.com':'टेक साथी','clicknepal.com':'क्लिक नेपाल','merofilm.com':'मेरो फिल्म','lensnepal.com':'लेन्स नेपाल','filmykhabar.com':'फिल्मी खबर','dcnepal.com':'डीसी नेपाल','lexlimbu.com':'लेक्स लिम्बु','khabarhub.com':'खबरहब'}

def clean(v):return re.sub(r'\s+',' ',html.unescape(v or '')).strip()
def tagname(el):return el.tag.split('}')[-1].lower()
def first(el,names):
    wanted={n.lower() for n in names}
    for child in list(el):
        if tagname(child) in wanted:
            value=clean(' '.join(child.itertext()))
            if value:return value
    return ''
def parse_date(v):
    if not v:return ''
    try:
        from email.utils import parsedate_to_datetime
        dt=parsedate_to_datetime(v)
        if dt.tzinfo is None:dt=dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        try:return datetime.fromisoformat(v.replace('Z','+00:00')).astimezone(timezone.utc).isoformat()
        except Exception:return ''
def source_name(url):
    host=re.sub(r'^www\.','',urllib.parse.urlparse(url).netloc.lower());return SOURCE_NAMES.get(host,host or 'समाचार')
def source_logo(url):
    p=urllib.parse.urlparse(url);return f'{p.scheme}://{p.netloc}/favicon.ico' if p.netloc else ''
def load_feed_config():
    js=CONFIG_PATH.read_text(encoding='utf-8');result={}
    for category,body in re.findall(r'([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\[(.*?)\]',js,re.S):
        for url in re.findall(r'["\'](https?://[^"\']+)["\']',body):result[url]=CATEGORY_MAP.get(category,'national')
    if not result:raise RuntimeError('No RSS feeds found in feeds/feeds.js')
    return result
def image_from_item(item):
    for child in item.iter():
        tag=tagname(child);url=child.attrib.get('url') or child.attrib.get('href') or clean(''.join(child.itertext()))
        media_tag=tag in ('content','thumbnail','enclosure','image','media:content','media:thumbnail') or tag.endswith('content') or tag.endswith('thumbnail')
        if media_tag and url and re.match(r'^https?://',url,re.I):
            typ=(child.attrib.get('type') or '').lower()
            if typ.startswith('image/') or re.search(r'\.(?:jpg|jpeg|png|gif|webp|avif)(?:[?#].*)?$',url,re.I):return url
    return ''
def parse_feed(url,category):
    req=urllib.request.Request(url,headers=HEADERS)
    with urllib.request.urlopen(req,timeout=10) as response:raw=response.read(4_000_000)
    root=ET.fromstring(raw);out=[]
    items=[e for e in root.iter() if tagname(e) in ('item','entry')][:50]
    for item in items:
        title=first(item,['title']);link=first(item,['link'])
        if not link:
            for child in list(item):
                if tagname(child)=='link' and child.attrib.get('href'):link=child.attrib['href'];break
        if not title or not link:continue
        description=first(item,['description','summary','content','encoded']);published=first(item,['pubDate','published','updated','date']);title=clean(title);description=clean(re.sub(r'<[^>]+>',' ',description))[:360]
        if len(DEV.findall(title))<2:continue
        if len(DEV.findall(description))<8:description=''
        political=category=='national' and re.search(r'(सरकार|मन्त्री|प्रधानमन्त्री|संसद|सांसद|निर्वाचन|चुनाव|दल|पार्टी|कांग्रेस|एमाले|माओवादी|राष्ट्रपति|राजनीति|प्रतिनिधिसभा|प्रदेशसभा|राजदूत|कूटनीति)',title)
        out.append({'title':title,'description':description,'imageUrl':image_from_item(item),'sourceLogo':source_logo(url),'sourceName':source_name(url),'publishedTime':parse_date(published),'articleUrl':link.strip(),'category':'politics' if political else category})
    return out
def duplicate_key(item):return re.sub(r'[^\u0900-\u097Fa-zA-Z0-9]','',item['title']).lower()
def deduplicate(items):
    chosen=[];keys=[];urls=set()
    for item in sorted(items,key=lambda x:x.get('publishedTime',''),reverse=True):
        u=item.get('articleUrl','').strip()
        key=duplicate_key(item)
        if not key or u in urls:continue
        if any(key==old or difflib.SequenceMatcher(None,key,old).ratio()>=0.90 for old in keys[-500:]):continue
        urls.add(u);keys.append(key);chosen.append(item)
    return chosen
def main():
    feed_map=load_feed_config();articles=[];failures=[];fetched=0
    def worker(pair):
        url,category=pair
        try:return url,parse_feed(url,category),None
        except Exception as exc:return url,[],str(exc)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for url,items,error in pool.map(worker,feed_map.items()):
            fetched+=1
            if error:failures.append({'url':url,'error':error})
            else:articles.extend(items)
    items=deduplicate(articles)[:500]
    if not items:raise RuntimeError(f'No valid Nepali news articles were collected from {len(feed_map)} feeds')
    now=datetime.now(timezone.utc);updated=now.isoformat()
    newest=max((x.get('publishedTime') for x in items if x.get('publishedTime')),default='')
    payload={'updatedAt':updated,'newestPublishedTime':newest,'source':'feeds/feeds.js','feedCount':len(feed_map),'successfulFeeds':len(feed_map)-len(failures),'failedFeeds':len(failures),'failedFeedDetails':failures[:50],'items':items}
    OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    legacy_items=[{'title':x['title'],'summary':x['description'],'link':x['articleUrl'],'source':x['sourceName'],'category':x['category'],'published':x['publishedTime']} for x in items]
    LEGACY_OUT.parent.mkdir(parents=True,exist_ok=True);LEGACY_OUT.write_text(json.dumps({'updatedAt':updated,'items':legacy_items},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Collected {len(items)} unique Nepali articles from {len(feed_map)} feeds; {len(failures)} feeds failed; newest={newest}')
if __name__=='__main__':main()

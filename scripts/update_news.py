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
HEADERS={'User-Agent':'Mozilla/5.0 Nepali-Patro-News/2.0'}; DEV=re.compile(r'[\u0900-\u097F]')
CATEGORY_MAP={'all':'national','sports':'sports','finance':'business','tech':'technology','entertainment':'entertainment'}
SOURCE_NAMES={'onlinekhabar.com':'अनलाइनखबर','nagariknetwork.com':'नागरिक','ratopati.com':'रातोपाटी','setopati.com':'सेतोपाटी','gorkhapatraonline.com':'गोरखापत्र','bbc.co.uk':'बीबीसी नेपाली','annapurnapost.com':'अन्नपूर्ण पोस्ट','rajdhanidaily.com':'राजधानी','ujyaaloonline.com':'उज्यालो अनलाइन','news24nepal.com':'न्यूज २४ नेपाल','nepallive.com':'नेपाल लाइभ','myrepublica.nagariknetwork.com':'माइ रिपब्लिका','lokaantar.com':'लोकान्तर','dainiknepal.com':'दैनिक नेपाल','nepalsamaya.com':'नेपाल समय','pahilopost.com':'पहिलोपोस्ट','nepalheadlines.com':'नेपाल हेडलाइन्स','nepalpress.com':'नेपाल प्रेस','himalkhabar.com':'हिमालखबर','nepalnews.com':'नेपालन्युज','hamrokhelkud.com':'हाम्रो खेलकुद','goalnepal.com':'गोल नेपाल','khelpati.com':'खेलपाटी','nepalsportz.com':'नेपाल स्पोर्ट्स','cricnepal.com':'क्रिक नेपाल','newsofnepal.com':'न्युज अफ नेपाल','cricketnepal.org.np':'क्रिकेट नेपाल','sharesansar.com':'सेयरसंसार','abhiyandaily.com':'अभियान','clickmandu.com':'क्लिकमाण्डु','arthasarokar.com':'अर्थ सरोकार','bankingkhabar.com':'बैंकिङ खबर','vikasnews.com':'विकास न्यूज','aarthiknews.com':'आर्थिक न्यूज','techpana.com':'टेकपाना','nepalitelecom.com':'नेपाली टेलिकम','techmandu.com':'टेकमाण्डु','ictframe.com':'आईसीटी फ्रेम','techsathi.com':'टेक साथी','clicknepal.com':'क्लिक नेपाल','merofilm.com':'मेरो फिल्म','lensnepal.com':'लेन्स नेपाल','filmykhabar.com':'फिल्मी खबर','dcnepal.com':'डीसी नेपाल','lexlimbu.com':'लेक्स लिम्बु','khabarhub.com':'खबरहब'}

def clean(v):return re.sub(r'\s+',' ',html.unescape(v or '')).strip()
def first(el,names):
    for child in list(el):
        if child.tag.split('}')[-1] in names:
            value=clean(' '.join(child.itertext()))
            if value:return value
    return ''
def parse_date(v):
    if not v:return ''
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(v).astimezone(timezone.utc).isoformat()
    except Exception:
        try:return datetime.fromisoformat(v.replace('Z','+00:00')).astimezone(timezone.utc).isoformat()
        except Exception:return ''
def source_name(url):
    host=re.sub(r'^www\.','',urllib.parse.urlparse(url).netloc.lower());return SOURCE_NAMES.get(host,host or 'समाचार')
def load_feed_config():
    js=CONFIG_PATH.read_text(encoding='utf-8');result={}
    for category,body in re.findall(r'([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\[(.*?)\]',js,re.S):
        for url in re.findall(r'["\'](https?://[^"\']+)["\']',body):result[url]=CATEGORY_MAP.get(category,'national')
    if not result:raise RuntimeError('No RSS feeds found in feeds/feeds.js')
    return result
def image_from_item(item):
    for child in item.iter():
        tag=child.tag.split('}')[-1];url=child.attrib.get('url') or child.attrib.get('href')
        if tag in ('content','thumbnail','enclosure','image') and url and re.match(r'^https?://',url) and re.search(r'\.(?:jpg|jpeg|png|webp)(?:\?|$)',url,re.I):return url
    return ''
def parse_feed(url,category):
    req=urllib.request.Request(url,headers=HEADERS)
    with urllib.request.urlopen(req,timeout=15) as response:raw=response.read(3_000_000)
    root=ET.fromstring(raw);out=[]
    for item in [e for e in root.iter() if e.tag.split('}')[-1] in ('item','entry')][:30]:
        title=first(item,['title']);link=first(item,['link'])
        if not link:
            for child in list(item):
                if child.tag.split('}')[-1]=='link' and child.attrib.get('href'):link=child.attrib['href'];break
        if not title or not link:continue
        description=first(item,['description','summary','content','encoded']);published=first(item,['pubDate','published','updated','date']);title=clean(title);description=clean(re.sub(r'<[^>]+>',' ',description))[:320]
        if len(DEV.findall(title))<2:continue
        if len(DEV.findall(description))<8:description=''
        political=category=='national' and re.search(r'(सरकार|मन्त्री|प्रधानमन्त्री|संसद|सांसद|निर्वाचन|चुनाव|दल|पार्टी|कांग्रेस|एमाले|माओवादी|राष्ट्रपति|राजनीति|प्रतिनिधिसभा|प्रदेशसभा|राजदूत|कूटनीति)',title)
        out.append({'title':title,'description':description,'imageUrl':image_from_item(item),'sourceLogo':'','sourceName':source_name(url),'publishedTime':parse_date(published),'articleUrl':link.strip(),'category':'politics' if political else category})
    return out
def duplicate_key(item):return re.sub(r'[^\u0900-\u097Fa-zA-Z0-9]','',item['title']).lower()
def deduplicate(items):
    chosen=[];keys=[]
    for item in sorted(items,key=lambda x:x.get('publishedTime',''),reverse=True):
        key=duplicate_key(item)
        if not key:continue
        if any(key==old or difflib.SequenceMatcher(None,key,old).ratio()>=0.91 for old in keys[-300:]):continue
        keys.append(key);chosen.append(item)
    return chosen
def main():
    feed_map=load_feed_config();articles=[];failures=0
    for url,category in feed_map.items():
        try:articles.extend(parse_feed(url,category))
        except Exception as exc:failures+=1;print(f'WARN {url}: {exc}')
    items=deduplicate(articles)[:500]
    if not items:raise RuntimeError('No valid Nepali news articles were collected')
    payload={'updatedAt':datetime.now(timezone.utc).isoformat(),'source':'feeds/feeds.js','feedCount':len(feed_map),'failedFeeds':failures,'items':items}
    OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    LEGACY_OUT.parent.mkdir(parents=True,exist_ok=True);LEGACY_OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Collected {len(items)} unique Nepali articles from {len(feed_map)} feeds; {failures} feeds failed.')
if __name__=='__main__':main()

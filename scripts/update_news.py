import html
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

FEEDS = {
    'national': [('Onlinekhabar','https://www.onlinekhabar.com/feed'),('Nagarik','https://nagariknetwork.com/feed/'),('Ratopati','https://ratopati.com/feed'),('Setopati','https://www.setopati.com/feed'),('Gorkhapatra','https://gorkhapatraonline.com/rss'),('Annapurna Post','https://www.annapurnapost.com/rss'),('Rajdhani Daily','https://rajdhanidaily.com/feed/'),('Ujyaalo Online','https://ujyaaloonline.com/rss'),('News24 Nepal','https://www.news24nepal.com/feed'),('Nepal Live','https://nepallive.com/feed'),('Lokaantar','https://www.lokaantar.com/feed'),('Dainik Nepal','https://dainiknepal.com/feed'),('Nepal Samaya','https://nepalsamaya.com/feed'),('Pahilo Post','https://pahilopost.com/feed'),('Nepal Headlines','https://nepalheadlines.com/feed'),('Nepal Press','https://nepalpress.com/feed/'),('Himal Khabar','https://himalKhabar.com/feed'),('Nepal News','https://nepalnews.com/feed/')],
    'sports': [('Hamro Khelkud','https://www.hamrokhelud.com/feed'),('Goal Nepal','https://www.goalnepal.com/rss'),('Khelpati','https://www.khelpati.com/feed'),('Nepal Sportz','https://nepalsportz.com/feed/'),('CricNepal','https://www.cricnepal.com/feed'),('Onlinekhabar Sports','https://www.onlinekhabar.com/content/sports/feed'),('News of Nepal Sports','https://www.newsofnepal.com/category/sports/feed/'),('Cricket Nepal','https://cricketnepal.org.np/feed/')],
    'business': [('ShareSansar','https://www.sharesansar.com/rss'),('Abhiyan Daily','https://www.abhiyandaily.com/rss'),('Clickmandu','https://clickmandu.com/feed'),('Artha Sarokar','https://arthasarokar.com/feed'),('Banking Khabar','https://bankingkhabar.com/feed'),('Vikas News','https://www.vikasnews.com/feed'),('Aarthik News','https://www.aarthiknews.com/rss/'),('Onlinekhabar Business','https://www.onlinekhabar.com/content/business/feed')],
    'technology': [('TechPana','https://www.techpana.com/feed'),('NepaliTelecom','https://www.nepalitelecom.com/feed'),('Techmandu','https://techmandu.com/feed'),('ICT Frame','https://ictframe.com/feed'),('TechSathi','https://techsathi.com/feed'),('Click Nepal','https://clicknepal.com/category/technology/feed'),('Onlinekhabar Technology','https://www.onlinekhabar.com/content/technology/feed')],
    'entertainment': [('MeroFilm','https://www.merofilm.com/feed'),('Lens Nepal','https://www.lensnepal.com/feed'),('Filmy Khabar','http://www.filmykhabar.com/feed'),('DC Nepal Entertainment','https://www.dcnepal.com/category/entertainment/feed'),('Lex Limbu','https://lexlimbu.com/feed'),('News of Nepal Entertainment','https://newsofnepal.com/category/entertainment/feed/'),('Onlinekhabar Entertainment','https://www.onlinekhabar.com/content/entertainment/feed')]
}
HEADERS={'User-Agent':'Mozilla/5.0 Nepali-Patro-News/1.0'}
DEV=re.compile(r'[\u0900-\u097F]')
POLITICS=re.compile(r'(सरकार|मन्त्री|मन्त्रि|प्रधानमन्त्री|संसद|सांसद|निर्वाचन|चुनाव|दल|पार्टी|कांग्रेस|एमाले|माओवादी|राष्ट्रपति|उपराष्ट्रपति|राजनीति|प्रतिनिधिसभा|प्रदेशसभा|राजदूत|कूटनीति)')

def text(node): return html.unescape(' '.join(node.itertext())).strip() if node is not None else ''

def first(el,names):
    for name in names:
        x=el.find(name)
        if x is not None and text(x): return text(x)
    for child in list(el):
        if child.tag.split('}')[-1] in names and text(child): return text(child)
    return ''

def parse_date(v):
    if not v:return ''
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(v).astimezone(timezone.utc).isoformat()
    except Exception:
        try:return datetime.fromisoformat(v.replace('Z','+00:00')).astimezone(timezone.utc).isoformat()
        except Exception:return ''

def classify(category,title):
    return 'politics' if category=='national' and POLITICS.search(title) else category

def parse_feed(source,url,category):
    req=urllib.request.Request(url,headers=HEADERS)
    with urllib.request.urlopen(req,timeout=12) as r: raw=r.read(2_000_000)
    root=ET.fromstring(raw);out=[]
    for item in [e for e in root.iter() if e.tag.split('}')[-1] in ('item','entry')][:25]:
        title=first(item,['title']);link=first(item,['link'])
        if not link:
            for c in list(item):
                if c.tag.split('}')[-1]=='link' and c.attrib.get('href'):link=c.attrib['href'];break
        summary=first(item,['description','summary','content','encoded']);published=first(item,['pubDate','published','updated','date'])
        if not title or not link:continue
        title=re.sub(r'\s+',' ',title).strip();summary=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',summary)).strip()
        if len(DEV.findall(title)) < 3:continue
        # Keep summaries only when they are meaningfully Nepali; otherwise the UI shows the Nepali title alone.
        if len(DEV.findall(summary)) < 8:summary=''
        out.append({'title':title,'summary':summary[:300],'link':link,'source':source,'category':classify(category,title),'published':parse_date(published)})
    return out

def main():
    articles=[]
    for category,feeds in FEEDS.items():
        for source,url in feeds:
            try:articles.extend(parse_feed(source,url,category))
            except Exception as e:print(f'WARN {source}: {e}')
    unique={}
    for a in articles:
        key=re.sub(r'[^\u0900-\u097Fa-zA-Z0-9]','',a['title']).lower()
        if key and key not in unique:unique[key]=a
    items=sorted(unique.values(),key=lambda x:x.get('published',''),reverse=True)[:500]
    payload={'updatedAt':datetime.now(timezone.utc).isoformat(),'items':items}
    Path('data').mkdir(exist_ok=True);Path('data/news.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Collected {len(items)} Nepali articles')

if __name__=='__main__':main()

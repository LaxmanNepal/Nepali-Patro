import html
import json
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

FEED_CONFIG_URL='https://raw.githubusercontent.com/LaxmanNepal/Nepal-News-Hub-Pro/refs/heads/main/js/feeds.js'
HEADERS={'User-Agent':'Mozilla/5.0 Nepali-Patro-News/1.0'}
DEV=re.compile(r'[\u0900-\u097F]')
POLITICS=re.compile(r'(सरकार|मन्त्री|मन्त्रि|प्रधानमन्त्री|संसद|सांसद|निर्वाचन|चुनाव|दल|पार्टी|कांग्रेस|एमाले|माओवादी|राष्ट्रपति|उपराष्ट्रपति|राजनीति|प्रतिनिधिसभा|प्रदेशसभा|राजदूत|कूटनीति)')
CATEGORY_MAP={'all':'national','sports':'sports','finance':'business','tech':'technology','entertainment':'entertainment'}

def text(node):
    return html.unescape(' '.join(node.itertext())).strip() if node is not None else ''

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

def source_name(url):
    host=re.sub(r'^www\.', '', urllib.parse.urlparse(url).netloc).lower()
    return host or url

def load_feed_config():
    req=urllib.request.Request(FEED_CONFIG_URL,headers=HEADERS)
    with urllib.request.urlopen(req,timeout=15) as r: js=r.read().decode('utf-8','replace')
    feeds={}
    for category,body in re.findall(r'([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\[(.*?)\]',js,re.S):
        urls=re.findall(r'["\'](https?://[^"\']+)["\']',body)
        feeds[category]=urls
    if not feeds.get('all'): raise RuntimeError('MASTER_FEEDS.all missing from source feed configuration')
    result={}
    for category,urls in feeds.items():
        mapped=CATEGORY_MAP.get(category,'national')
        for url in urls:
            result.setdefault(url, mapped)
            if category!='all': result[url]=mapped
    return result

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
        if len(DEV.findall(summary)) < 8:summary=''
        out.append({'title':title,'summary':summary[:300],'link':link,'source':source,'category':classify(category,title),'published':parse_date(published)})
    return out

def main():
    try: feed_map=load_feed_config()
    except Exception as e:
        print(f'WARN feed configuration unavailable: {e}')
        feed_map={}
    articles=[]
    for url,category in feed_map.items():
        source=source_name(url)
        try:articles.extend(parse_feed(source,url,category))
        except Exception as e:print(f'WARN {source}: {e}')
    unique={}
    for a in articles:
        key=re.sub(r'[^\u0900-\u097Fa-zA-Z0-9]','',a['title']).lower()
        if key and key not in unique:unique[key]=a
    items=sorted(unique.values(),key=lambda x:x.get('published',''),reverse=True)[:500]
    payload={'updatedAt':datetime.now(timezone.utc).isoformat(),'sourceConfig':FEED_CONFIG_URL,'items':items}
    Path('data').mkdir(exist_ok=True)
    Path('data/news.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Collected {len(items)} Nepali articles from {len(feed_map)} configured feeds')

if __name__=='__main__':main()

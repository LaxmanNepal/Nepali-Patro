#!/usr/bin/env python3
"""Build-time Reddit story feed. No browser scraping; stores only compact metadata."""
import json, re, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'feeds/reddit.json'
SUBREDDITS=['Nepal','NepalSocial']
HEADERS={'User-Agent':'NepaliPatro/1.0 (https://apps.laxmannepal.com.np/Nepali-Patro/)'}

def clean(s): return re.sub(r'\\s+',' ',s or '').strip()
def fetch(sub):
    req=urllib.request.Request(f'https://www.reddit.com/r/{sub}/.rss?limit=25',headers=HEADERS)
    with urllib.request.urlopen(req,timeout=20) as r: return r.read()
items=[]
for sub in SUBREDDITS:
    try:
        root=ET.fromstring(fetch(sub))
        ns={'a':'http://www.w3.org/2005/Atom','media':'http://search.yahoo.com/mrss/'}
        for e in root.findall('a:entry',ns):
            title=clean(e.findtext('a:title','',ns)); link=e.find('a:link',ns); updated=clean(e.findtext('a:updated','',ns)); summary=clean(re.sub('<[^>]+>',' ',e.findtext('a:content','',ns) or e.findtext('a:summary','',ns)))
            if not title or not link: continue
            items.append({'title':title,'summary':summary[:300],'subreddit':f'r/{sub}','publishedTime':updated,'articleUrl':link.attrib.get('href','')})
    except Exception as exc:
        print(f'Warning: r/{sub}: {exc}')
seen=set(); out=[]
for x in sorted(items,key=lambda a:a.get('publishedTime',''),reverse=True):
    key=re.sub(r'[^a-z0-9]+','',x['title'].lower())
    if key in seen: continue
    seen.add(key); out.append(x)
OUT.write_text(json.dumps({'generatedAt':datetime.now(timezone.utc).isoformat(),'items':out[:40]},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Wrote {len(out[:40])} Reddit stories')

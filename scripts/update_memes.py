#!/usr/bin/env python3
"""Create a small daily original Nepali meme feed from safe text templates and current news topics.
The site does not copy third-party meme images; each card is rendered by the frontend."""
import json,re,random
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
news_path=ROOT/'feeds/news.json'; out=ROOT/'feeds/memes.json'
try:
    raw=json.loads(news_path.read_text(encoding='utf-8')); items=raw if isinstance(raw,list) else raw.get('items',raw.get('news',[]))
except Exception: items=[]
top=[]
for x in items:
    t=str(x.get('title','')).strip()
    if t: top.append(re.sub(r'\s+',' ',t))
top=top[:10]
templates=[
    ('नेपाली Internet आज','समाचार हेर्न आएको थिएँ… algorithm ले फेरि अर्को कुरा देखायो 😭'),
    ('जब काम धेरै हुन्छ','“आज चाँडै सुत्छु” भन्ने नेपालीको अर्को classic योजना 😂'),
    ('विदेशमा नेपाली','घरबाट फोन: पैसा पठायौ?\nम: पहिले Wi‑Fi चल्न देऊ 😭'),
    ('महिनाको अन्त्य','तलब आएको दिन: राजा 👑\nमहिनाको अन्त्य: ध्यान योगी 🧘'),
    ('Nepali Parents','मोबाइल चलाइरहेको देखेपछि: पढाइ कस्तो हुँदैछ? 😂'),
]
random.seed(datetime.now(timezone.utc).strftime('%Y-%m-%d'))
items=[]
for i,(title,caption) in enumerate(templates):
    topic=top[i%len(top)] if top else ''
    if i==0 and topic: caption=f'आजको headline: “{topic[:120]}”\nअब comment section को पालो 😅'
    items.append({'id':f'daily-{i+1}','title':title,'caption':caption,'category':'nepali','createdAt':datetime.now(timezone.utc).isoformat(),'original':True})
out.write_text(json.dumps({'generatedAt':datetime.now(timezone.utc).isoformat(),'items':items},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Wrote {len(items)} original meme cards')

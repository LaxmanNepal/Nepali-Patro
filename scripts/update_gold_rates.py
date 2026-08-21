import json, re, html, urllib.request
from datetime import datetime, timezone
from pathlib import Path

URL='https://negosida.org/'
OUT=Path('data/gold-price.json')
REQ=urllib.request.Request(URL,headers={'User-Agent':'Nepali-Patro-Gold-Rate/1.0'})
with urllib.request.urlopen(REQ,timeout=30) as r:
    raw=r.read().decode('utf-8','ignore')
text=html.unescape(re.sub(r'<[^>]+>',' ',raw))
text=re.sub(r'\s+',' ',text)

def money(pattern):
    m=re.search(pattern,text,re.I)
    if not m: raise RuntimeError(f'missing {pattern}')
    return float(m.group(1).replace(',',''))

data={
 'fine_gold_tola':money(r'Fine Gold\s+per 1 Tola\s+NRs\s*([\d,]+(?:\.\d+)?)'),
 'gold_22k_tola':money(r'22 KT\s+per 1 Tola\s+NRs\s*([\d,]+(?:\.\d+)?)'),
 'silver_tola':money(r'Silver\s+per 1 Tola\s+NRs\s*([\d,]+(?:\.\d+)?)'),
 'fine_gold_10g':money(r'Fine Gold\s+Per 10 Gram\s+NRs\s*([\d,]+(?:\.\d+)?)'),
 'gold_22k_10g':money(r'22 KT\s+per 10 Gram\s+NRs\s*([\d,]+(?:\.\d+)?)'),
 'silver_10g':money(r'Silver\s+per 10 Gram\s+NRs\s*([\d,]+(?:\.\d+)?)')
}
now=datetime.now(timezone.utc).isoformat()
obj=json.loads(OUT.read_text('utf-8')) if OUT.exists() else {'source':'https://negosida.org/','updated_at':None,'current':{},'history':[]}
obj['source']=URL; obj['updated_at']=now; obj['current']=data
entry={'date':now[:10],**data}
history=[x for x in obj.get('history',[]) if x.get('date')!=entry['date']]
history.append(entry); obj['history']=history[-30:]
OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n','utf-8')
print(json.dumps(data,ensure_ascii=False))

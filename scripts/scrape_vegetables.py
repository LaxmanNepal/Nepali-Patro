from html.parser import HTMLParser
from urllib.request import Request,urlopen
from datetime import datetime,timezone
import json,re

SOURCE='https://kalimatimarket.gov.np/price'
DEV=str.maketrans('०१२३४५६७८९','0123456789')
FRUIT_WORDS=['स्याउ','केरा','कागती','अनार','आँप','तरबुजा','जुनार','भुई कटहर','कटहर','नासपाती','मेवा','लप्सी','किवि','आभोकाडो','अमला','नरिवल','ड्रागन फ्रुट']
OTHER_WORDS=['माछा','तोफु','गुन्दुक','इमली','तामा','च्याउ','कुरीलो','न्यूरो','पार्सले','सेलरी','पुदीना','धनिया']
class TableParser(HTMLParser):
    def __init__(self): super().__init__(); self.in_td=False; self.row=[]; self.rows=[]; self.buf=[]
    def handle_starttag(self,tag,attrs):
        if tag in ('td','th'): self.in_td=True; self.buf=[]
    def handle_endtag(self,tag):
        if tag in ('td','th') and self.in_td:
            self.row.append(' '.join(''.join(self.buf).split())); self.in_td=False
        if tag=='tr' and self.row:
            self.rows.append(self.row); self.row=[]
    def handle_data(self,data):
        if self.in_td: self.buf.append(data)
def num(s):
    s=s.translate(DEV).replace(',','').strip(); m=re.search(r'\d+(?:\.\d+)?',s); return float(m.group()) if m else None
def clean(s): return re.sub(r'\s+',' ',s or '').strip()
def unit(s):
    if 'दर्जन' in s or 'Doz' in s: return 'दर्जन'
    if 'गोटा' in s or 'Pc' in s: return 'प्रति गोटा'
    return 'के.जी.'
def cat(name):
    if any(x in name for x in FRUIT_WORDS): return 'fruit'
    if any(x in name for x in OTHER_WORDS): return 'other'
    return 'vegetable'
def main():
    req=Request(SOURCE,headers={'User-Agent':'Mozilla/5.0 (compatible; NepaliPatroBot/1.0)'})
    with urlopen(req,timeout=30) as r: html=r.read().decode('utf-8','replace')
    parser=TableParser(); parser.feed(html)
    items=[]
    for row in parser.rows:
        if len(row)<4: continue
        if row[0] in ('कृषि उपज','कृषि उपज वस्तु'): continue
        if not any(c in row[0] for c in ('(के.जी','(केजी','(के जी','दर्जन','गोटा')): continue
        lo,hi,avg=num(row[1]),num(row[2]),num(row[3])
        if lo is None or hi is None or avg is None: continue
        name=clean(re.sub(r'\s*\([^)]*\)\s*$','',row[0]))
        items.append({'name':name,'nameRaw':row[0],'unit':unit(row[0]),'min':lo,'max':hi,'avg':avg,'category':cat(name)})
    if len(items)<10: raise RuntimeError(f'Only {len(items)} price rows parsed; source layout may have changed')
    heading=re.search(r'संकलित दैनिक थोक मूल्य[^\n<]*?(?:वि\.सं\.)?\s*([^<\n]+)',html)
    published_bs=clean(heading.group(1)) if heading else None
    payload={'schemaVersion':1,'source':SOURCE,'sourceName':'कालीमाटी फलफूल तथा तरकारी बजार विकास समिति','publishedBs':published_bs,'publishedAd':datetime.now().strftime('%Y-%m-%d'),'scrapedAt':datetime.now(timezone.utc).isoformat(),'itemCount':len(items),'items':items}
    with open('data/vegetables.json','w',encoding='utf-8') as f: json.dump(payload,f,ensure_ascii=False,indent=2)
    print(f'Wrote {len(items)} Kalimati price rows; publishedBs={published_bs}')
if __name__=='__main__': main()

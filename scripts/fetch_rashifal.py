import json, re, sys, time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
import requests
from bs4 import BeautifulSoup, Tag

BASE=Path(__file__).resolve().parents[1]
OUT=BASE/'data'/'rashifal'
SIGNS=[('aries','मेष','Aries'),('taurus','वृष','Taurus'),('gemini','मिथुन','Gemini'),('cancer','कर्कट','Cancer'),('leo','सिंह','Leo'),('virgo','कन्या','Virgo'),('libra','तुला','Libra'),('scorpio','वृश्चिक','Scorpio'),('sagittarius','धनु','Sagittarius'),('capricorn','मकर','Capricorn'),('aquarius','कुम्भ','Aquarius'),('pisces','मीन','Pisces')]
HEADERS={'User-Agent':'Mozilla/5.0 (compatible; LaxmanNepal-RashifalBot/7.0)','Accept-Language':'ne-NP,ne;q=0.9,en;q=0.8'}
SOURCES=[
 ('Nepali Patro','https://nepalipatro.com.np/en/rashifal/daily','उपप्रा. लक्ष्मीप्रसाद बराल (फलितज्योतिषाचार्य)'),
 ('Ramro Patro','https://ramropatro.com/rashifal','ज्यो. देवमणि बस्याल'),
]

def norm(x): return re.sub(r'\s+',' ',str(x or '').replace('\xa0',' ')).strip()
def ascii_nepali(x): return str(x).translate(str.maketrans('०१२३४५६७८९','0123456789'))
def get_bs(ad):
 for year in range(ad.year+56,ad.year+59):
  try:
   r=requests.get(f'https://apps.laxmannepal.com.np/Nepali-Patro/data/calendar/{year}.json',timeout=20); r.raise_for_status()
   for d in r.json().get('days',[]):
    if d.get('ad',{}).get('date')==ad.isoformat(): return d.get('bs',{}).get('display'),d.get('weekday',{}).get('nepali')
  except Exception: pass
 raise RuntimeError(f'BS date not found for {ad}')

def valid(signs):
 if len(signs)!=12 or len({x['id'] for x in signs})!=12: raise RuntimeError('Expected 12 unique zodiac signs')
 if any(len(norm(x.get('prediction')))<40 for x in signs): raise RuntimeError('Prediction too short')
 return signs

def nepali_patro(url,expected_bs):
 r=requests.get(url,headers=HEADERS,timeout=45); r.raise_for_status(); soup=BeautifulSoup(r.text,'html.parser')
 page=ascii_nepali(norm(soup.get_text(' ',strip=True)))
 expected=ascii_nepali(expected_bs or '')
 nums=re.findall(r'\b\d{1,4}\b',expected)
 if nums and not all(n in page for n in nums[-2:]): raise RuntimeError('Source date does not match requested Nepal date')
 out=[]
 for slug,np,en in SIGNS:
  heading=None
  for tag in soup.find_all(['h1','h2','h3','h4','h5','h6','strong','b','a','div','span']):
   t=norm(tag.get_text(' ',strip=True))
   if len(t)<=160 and np in t and en.lower() in re.sub(r'\s+','',t).lower(): heading=tag; break
  if not heading: raise RuntimeError(f'Missing Nepali Patro heading: {en}')
  candidates=[]
  for node in heading.find_all_next(['p','li','div'],limit=15):
   t=norm(node.get_text(' ',strip=True))
   if 60<=len(t)<=2500 and not (np in t and en.lower() in t.lower()): candidates.append(t)
   if any(other_np in t for _,other_np,_ in SIGNS if other_np!=np): break
  if not candidates: raise RuntimeError(f'Missing Nepali Patro prediction: {en}')
  out.append({'id':slug,'nepali':np,'english':en,'prediction':min(candidates,key=len),'source':'Nepali Patro','sourceUrl':url})
 return valid(out)

def ramro(url):
 r=requests.get(url,headers=HEADERS,timeout=45); r.raise_for_status(); soup=BeautifulSoup(r.text,'html.parser'); text=norm(soup.get_text(' ',strip=True))
 if 'आजको राशिफल' not in text: raise RuntimeError('Ramro Patro daily section missing')
 out=[]
 for slug,np,en in SIGNS:
  heading=None
  for tag in soup.find_all(['h1','h2','h3','h4','h5','h6','strong','b','div']):
   t=norm(tag.get_text(' ',strip=True))
   if np in t and en.lower() in t.lower() and len(t)<300: heading=tag; break
  if not heading: raise RuntimeError(f'Missing Ramro Patro heading: {en}')
  candidates=[]
  for node in heading.find_all_next(['p','div','li'],limit=10):
   t=norm(node.get_text(' ',strip=True))
   if 60<=len(t)<=1200 and 'राशी' not in t and 'Image' not in t: candidates.append(t)
   if any(other_np in t for _,other_np,_ in SIGNS if other_np!=np): break
  if not candidates: raise RuntimeError(f'Missing Ramro Patro prediction: {en}')
  out.append({'id':slug,'nepali':np,'english':en,'prediction':min(candidates,key=len),'source':'Ramro Patro','sourceUrl':url})
 return valid(out)

def main():
 now=datetime.now(ZoneInfo('Asia/Kathmandu')); ad=now.date(); bs,weekday=get_bs(ad); errors=[]
 for name,url,astrologer in SOURCES:
  try:
   signs=nepali_patro(url,bs) if name=='Nepali Patro' else ramro(url)
   payload={'schemaVersion':3,'date':ad.isoformat(),'bsDate':bs,'weekday':weekday,'source':name,'sourceUrl':url,'astrologer':astrologer,'fetchedAt':now.isoformat(),'signs':signs}
   OUT.mkdir(parents=True,exist_ok=True); path=OUT/f'{ad.isoformat()}.json'; path.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(f'Wrote {path} using {name}'); return
  except Exception as exc: errors.append(f'{name}: {exc}')
 raise RuntimeError('No verified daily Rashifal source available: '+' | '.join(errors))

if __name__=='__main__':
 try: main()
 except Exception as exc: print(f'ERROR: {exc}',file=sys.stderr); raise

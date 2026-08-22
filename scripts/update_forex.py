#!/usr/bin/env python3
import json, os, urllib.parse, urllib.request
from datetime import date, timedelta
ROOT='https://www.nrb.org.np/api/forex/v1/rates'; OUT='feeds/forex.json'
FLAGS={'USD':'🇺🇸','EUR':'🇪🇺','GBP':'🇬🇧','AUD':'🇦🇺','CAD':'🇨🇦','SGD':'🇸🇬','JPY':'🇯🇵','CNY':'🇨🇳','SAR':'🇸🇦','QAR':'🇶🇦','AED':'🇦🇪','MYR':'🇲🇾','KRW':'🇰🇷','SEK':'🇸🇪','DKK':'🇩🇰','HKD':'🇭🇰','KWD':'🇰🇼','BHD':'🇧🇭','OMR':'🇴🇲','THB':'🇹🇭','INR':'🇮🇳','CHF':'🇨🇭'}
def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':'Nepali-Patro/1.0'})
    with urllib.request.urlopen(req,timeout=30) as r:return json.loads(r.read().decode('utf-8'))
def find_bs(ad_date):
    for y in range(2040,2101):
        p=f'data/calendar/{y}.json'
        if not os.path.exists(p): continue
        try:
            with open(p,encoding='utf-8') as f:data=json.load(f)
            for d in data.get('days',[]):
                if d.get('ad',{}).get('date')==ad_date:
                    bs=d.get('bs',{}); return bs.get('display') or f"{bs.get('monthName','')} {bs.get('day','')}, {y}"
        except Exception: pass
    return ''
def main():
    today=date.today(); start=today-timedelta(days=7)
    qs=urllib.parse.urlencode({'page':1,'per_page':100,'from':start.isoformat(),'to':today.isoformat()})
    payload=get(ROOT+'?'+qs); rows=(payload.get('data') or {}).get('payload') or []
    if not rows: raise RuntimeError(f'NRB returned no rates between {start} and {today}')
    rows.sort(key=lambda x:x.get('date',''),reverse=True); item=rows[0]; rates=[]
    for r in item.get('rates') or []:
        c=r.get('currency') or {}; code=(c.get('ISO3') or c.get('iso3') or '').upper()
        if not code: continue
        rates.append({'currency':code,'name':c.get('name') or code,'flag':FLAGS.get(code,'🌐'),'unit':c.get('unit',1),'buy':float(r.get('buy')),'sell':float(r.get('sell'))})
    rates.sort(key=lambda x:x['currency'])
    ad=item.get('date',today.isoformat()); out={'date_bs':find_bs(ad),'date_ad':ad,'base':'NPR','rates':rates}
    os.makedirs(os.path.dirname(OUT),exist_ok=True)
    with open(OUT,'w',encoding='utf-8') as f:json.dump(out,f,ensure_ascii=False,indent=2)
    print(f"Updated {OUT}: {out['date_ad']} / {len(rates)} currencies")
if __name__=='__main__':main()

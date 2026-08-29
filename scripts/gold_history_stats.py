import json
from pathlib import Path

SRC=Path('data/gold-price-history.json')
OUT=Path('data/gold-price-stats.json')
FIELDS=('fine_gold_tola','gold_22k_tola','silver_tola')
WINDOWS=(7,30,90,365)

def stats(records, field, days):
    vals=[r['prices'].get(field) for r in records[-days:] if r['prices'].get(field) is not None]
    if not vals: return {'count':0,'min':None,'max':None,'average':None,'first':None,'last':None,'change':None,'change_percent':None}
    first,last=vals[0],vals[-1]
    change=last-first
    return {'count':len(vals),'min':min(vals),'max':max(vals),'average':round(sum(vals)/len(vals),2),'first':first,'last':last,'change':change,'change_percent':round(change/first*100,2) if first else None}

def main():
    data=json.loads(SRC.read_text(encoding='utf-8'))
    records=data['records']
    output={'schema':'gold-price-stats/v1','source':data['source'],'sourceUrl':data['sourceUrl'],'generatedAt':data['generatedAt'],'latestDate':records[-1]['date_ad'] if records else None,'windows':{}}
    for days in WINDOWS:
        output['windows'][str(days)]={f:stats(records,f,days) for f in FIELDS}
    OUT.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Generated {OUT}')
if __name__=='__main__': main()

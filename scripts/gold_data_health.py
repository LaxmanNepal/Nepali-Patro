import json
from datetime import date, timedelta
from pathlib import Path

SRC=Path('data/gold-price-history.json'); OUT=Path('data/gold-data-health.json')
FIELDS=('fine_gold_tola','gold_22k_tola','silver_tola','fine_gold_10g','gold_22k_10g','silver_10g')

def main():
 d=json.loads(SRC.read_text(encoding='utf-8')); rows=d.get('records',[]); dates=[]; seen=set(); duplicates=[]; anomalies=[]
 for r in rows:
  ds=r.get('date_ad')
  if not ds: continue
  if ds in seen: duplicates.append(ds)
  seen.add(ds); dates.append(ds)
 dates.sort(); latest=date.fromisoformat(dates[-1]) if dates else None
 expected=0; missing=[]
 if dates:
  start=date.fromisoformat(dates[0]); cur=start
  while cur<=latest:
   if cur.isoformat() not in seen: missing.append(cur.isoformat())
   expected+=1; cur+=timedelta(days=1)
 coverage=round(len(seen)/expected*100,2) if expected else 0
 for field in FIELDS:
  prev=None
  for r in sorted(rows,key=lambda x:x.get('date_ad','')):
   val=r.get('prices',{}).get(field)
   if isinstance(val,(int,float)) and prev:
    pct=(val-prev)/prev*100
    if abs(pct)>=10: anomalies.append({'date_ad':r['date_ad'],'field':field,'change_percent':round(pct,2)})
   if isinstance(val,(int,float)): prev=val
 health='healthy' if not duplicates and not anomalies else 'review'
 payload={'schema':'gold-data-health/v1','generatedAt':d.get('generatedAt'),'recordCount':len(rows),'uniqueDates':len(seen),'dateRange':{'start':dates[0] if dates else None,'end':dates[-1] if dates else None},'coveragePercent':coverage,'missingCalendarDates':missing,'duplicateDates':duplicates,'anomalies':anomalies,'status':health,'note':'Calendar gaps may represent weekends or publication holidays; they are not automatically treated as missing market data.'}
 OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(f'Gold data health: {health}, coverage {coverage}%')
if __name__=='__main__': main()

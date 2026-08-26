#!/usr/bin/env python3
import json,sys,glob,os,datetime
ROOT='data/nepse'
required=['nepse_data.json']
errors=[]
def read(p):
 with open(p,encoding='utf-8') as f:return json.load(f)
for p in required:
 f=os.path.join(ROOT,p)
 if not os.path.exists(f): errors.append(f'missing {f}');continue
 try:
  x=read(f); arr=x if isinstance(x,list) else next((x[k] for k in ('data','results','items','securities','stocks','records','rows') if isinstance(x.get(k),list)),None)
  if not arr: errors.append(f'no securities in {f}')
  else:
   valid=sum(bool((r.get('symbol') or r.get('ticker') or r.get('securityCode')) and any(k in r for k in ('ltp','lastTradedPrice','lastPrice','close','closePrice'))) for r in arr if isinstance(r,dict))
   if valid < max(1,int(len(arr)*.5)): errors.append(f'too few valid securities: {valid}/{len(arr)}')
 except Exception as e: errors.append(f'invalid {f}: {e}')
meta={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'valid':not errors,'errors':errors}
os.makedirs(ROOT,exist_ok=True)
with open(os.path.join(ROOT,'data-health.json'),'w',encoding='utf-8') as f:json.dump(meta,f,ensure_ascii=False,indent=2)
if errors:
 print('\n'.join(errors));sys.exit(1)
print('NEPSE snapshot valid')

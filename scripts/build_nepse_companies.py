#!/usr/bin/env python3
import json,os,glob,datetime
ROOT='data/nepse'; OUT=os.path.join(ROOT,'companies'); os.makedirs(OUT,exist_ok=True)
def load(p):
 try:
  with open(p,encoding='utf-8') as f:return json.load(f)
 except:return None
def arr(x):
 if isinstance(x,list):return x
 if isinstance(x,dict):
  for k in ('data','results','items','securities','stocks','records','rows','content'):
   if isinstance(x.get(k),list):return x[k]
  for v in x.values():
   if isinstance(v,list):return v
 return []
def sym(x):return str(x.get('symbol') or x.get('ticker') or x.get('securityCode') or x.get('symbolCode') or x.get('code') or '').upper().strip()
def merge(base,extra):
 if isinstance(extra,dict):
  for k,v in extra.items():
   if v is not None and v!='':base[k]=v
market=load(os.path.join(ROOT,'nepse_data.json'))
records={sym(x):dict(x) for x in arr(market) if isinstance(x,dict) and sym(x)}
for p in glob.glob(os.path.join(ROOT,'**','*.json'),recursive=True):
 if '/companies/' in p or p.endswith('nepse_data.json'):continue
 for x in arr(load(p)):
  if isinstance(x,dict) and sym(x):merge(records.setdefault(sym(x),{}),x)
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
for s,x in records.items():
 x['symbol']=s;x['_meta']={'generated_at':now,'source':'repository NEPSE datasets'}
 with open(os.path.join(OUT,s+'.json'),'w',encoding='utf-8') as f:json.dump(x,f,ensure_ascii=False,separators=(',',':'))
print(f'Generated {len(records)} company JSON files')

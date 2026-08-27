#!/usr/bin/env python3
import json,os,datetime
ROOT='data/nepse'; src=os.path.join(ROOT,'nepse_data.json')
if not os.path.exists(src): raise SystemExit('nepse_data.json missing')
with open(src,encoding='utf-8') as f:data=json.load(f)
now=datetime.datetime.now(datetime.timezone.utc); day=now.strftime('%Y-%m-%d'); stamp=now.strftime('%H-%M-%S')
outdir=os.path.join(ROOT,'history',day);os.makedirs(outdir,exist_ok=True)
out={'captured_at':now.isoformat(),'source_file':'nepse_data.json','records':data}
with open(os.path.join(outdir,stamp+'.json'),'w',encoding='utf-8') as f:json.dump(out,f,ensure_ascii=False,separators=(',',':'))
# Keep a compact index for the frontend.
idx=os.path.join(ROOT,'history','index.json'); entries=[]
if os.path.exists(idx):
 try:
  with open(idx,encoding='utf-8') as f:entries=json.load(f).get('snapshots',[])
 except:pass
entries=[e for e in entries if e.get('path')!=f'{day}/{stamp}.json'];entries.append({'captured_at':now.isoformat(),'path':f'{day}/{stamp}.json','records':len(data) if isinstance(data,list) else None});entries=entries[-500:]
with open(idx,'w',encoding='utf-8') as f:json.dump({'snapshots':entries},f,ensure_ascii=False,separators=(',',':'))
print(f'Stored {day}/{stamp}.json')

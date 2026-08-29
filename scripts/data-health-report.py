#!/usr/bin/env python3
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[1]
now=datetime.now(ZoneInfo('Asia/Kathmandu'))
report={'schemaVersion':1,'generatedAt':now.isoformat(),'timezone':'Asia/Kathmandu','datasets':{}}

def inspect(name,path):
    p=ROOT/path
    item={'path':path,'exists':p.exists()}
    if p.exists():
        item['modifiedAt']=datetime.fromtimestamp(p.stat().st_mtime,ZoneInfo('Asia/Kathmandu')).isoformat()
        try:
            d=json.loads(p.read_text(encoding='utf-8'))
            item['validJson']=True
            item['updatedAt']=d.get('updatedAt') or d.get('fetchedAt') or d.get('generatedAt')
            item['source']=d.get('source')
        except Exception as e:
            item['validJson']=False; item['error']=str(e)
    report['datasets'][name]=item

inspect('forex','feeds/forex.json')
inspect('goldSilver','feeds/gold_silver.json')
inspect('interestRates','feeds/interest_rates/current.json')
inspect('todayRashifal',f"data/rashifal/{now.date().isoformat()}.json")
ROOT.joinpath('data-health.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))

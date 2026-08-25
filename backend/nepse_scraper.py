#!/usr/bin/env python3
"""Continuous NEPSE collector for a VPS/server.

Refreshes market JSON every 30 seconds during the Nepal trading window and
company/reference data every 15 minutes. It writes atomic JSON snapshots so
the website never reads a half-written file.

The structured source is the published YONEPSE dataset derived from NEPSE;
NEPSE's official website is recorded as the official reference. This is not
an undocumented claim of a direct official NEPSE streaming API.
"""
import json, os, pathlib, time
from datetime import datetime, timezone, time as dtime
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

BASE=os.getenv('YONEPSE_BASE','https://shubhamnpk.github.io/yonepse/data/').rstrip('/')+'/'
ROOT=pathlib.Path(os.getenv('NEPSE_DATA_DIR','data/nepse'))
INTERVAL=int(os.getenv('NEPSE_INTERVAL','30'))
TZ=ZoneInfo('Asia/Kathmandu'); OPEN=dtime(10,45); CLOSE=dtime(15,15)
FAST={'nepse_data.json':'nepse_data.json','market/live.json':'market/live.json','market/status.json':'market/status.json','market/indices.json':'market/indices.json','market/summary.json':'market/summary.json','market/top_stocks.json':'market/top_stocks.json','market/sector_indices.json':'market/sector_indices.json','market/supply_demand.json':'market/supply_demand.json'}
SLOW={'other/securities.json':'other/securities.json','company/profiles.json':'company/profiles.json','company/financials.json':'company/financials.json','company/metadata.json':'company/metadata.json','company/field_descriptions.json':'company/field_descriptions.json','notify/notices.json':'notify/notices.json','notify/disclosures.json':'notify/disclosures.json','notify/exchange_messages.json':'notify/exchange_messages.json','proposed_dividend/latest_1y.json':'proposed_dividend/latest_1y.json','proposed_dividend/history_all_years.json':'proposed_dividend/history_all_years.json','ipo/upcoming.json':'ipo/upcoming.json','other/brokers.json':'other/brokers.json'}

def fetch(path):
    req=Request(BASE+path+'?v='+str(time.time_ns()),headers={'User-Agent':'NepaliPatro-NEPSE-Backend/2.0'})
    with urlopen(req,timeout=20) as r: return json.loads(r.read())

def save(rel,data):
    p=ROOT/rel; p.parent.mkdir(parents=True,exist_ok=True); tmp=p.with_suffix(p.suffix+'.tmp')
    tmp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8'); tmp.replace(p)

def market_open(now): return now.weekday() in (6,0,1,2,3) and OPEN<=now.timetz().replace(tzinfo=None)<=CLOSE

def sync(mapping):
    ok=0
    for rel,src in mapping.items():
        try: save(rel,fetch(src)); ok+=1
        except Exception as e: print('WARN',src,e,flush=True)
    return ok

def meta(mode,ok):
    save('meta.json',{'updated_at':datetime.now(timezone.utc).isoformat(),'timezone':'Asia/Kathmandu','mode':mode,'interval_seconds':INTERVAL,'files_updated':ok,'structured_source':BASE,'official_reference':'https://www.nepalstock.com.np/','accuracy_note':'Source values only; missing values are not fabricated.'})

def main():
    ROOT.mkdir(parents=True,exist_ok=True); last_slow=0
    while True:
        now=datetime.now(TZ)
        if market_open(now):
            ok=sync(FAST)
            if time.time()-last_slow>=900: ok+=sync(SLOW); last_slow=time.time()
            meta('market-open',ok); print(now.isoformat(),'updated',ok,flush=True)
        elif time.time()-last_slow>=900:
            ok=sync(SLOW); last_slow=time.time(); meta('market-closed-reference',ok); print(now.isoformat(),'reference',ok,flush=True)
        time.sleep(INTERVAL)

if __name__=='__main__': main()

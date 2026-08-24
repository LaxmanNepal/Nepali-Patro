import json, os, pathlib, urllib.request, datetime

BASE='https://shubhamnpk.github.io/yonepse/data/'
ROOT=pathlib.Path('data/nepse')
URLS={
 'nepse_data.json':'nepse_data.json',
 'market/live.json':'market/live.json',
 'market/status.json':'market/status.json',
 'market/indices.json':'market/indices.json',
 'market/sector_indices.json':'market/sector_indices.json',
 'market/top_stocks.json':'market/top_stocks.json',
 'market/summary.json':'market/summary.json',
 'market/history.json':'market/history.json',
 'market/supply_demand.json':'market/supply_demand.json',
 'other/securities.json':'other/securities.json',
 'other/sector_codes.json':'other/sector_codes.json',
 'company/profiles.json':'company/profiles.json',
 'company/financials.json':'company/financials.json',
 'company/metadata.json':'company/metadata.json',
 'company/field_descriptions.json':'company/field_descriptions.json',
 'notify/notices.json':'notify/notices.json',
 'notify/disclosures.json':'notify/disclosures.json',
 'notify/exchange_messages.json':'notify/exchange_messages.json',
 'proposed_dividend/latest_1y.json':'proposed_dividend/latest_1y.json',
 'proposed_dividend/history_all_years.json':'proposed_dividend/history_all_years.json',
 'proposed_dividend/meta.json':'proposed_dividend/meta.json',
 'ipo/upcoming.json':'ipo/upcoming.json',
 'ipo/old.json':'ipo/old.json',
 'other/brokers.json':'other/brokers.json',
}

def fetch(path):
    req=urllib.request.Request(BASE+path,headers={'User-Agent':'NepaliPatro-NEPSE-Sync/1.0'})
    with urllib.request.urlopen(req,timeout=45) as r:
        raw=r.read()
    data=json.loads(raw)
    if data is None: raise ValueError(f'Empty JSON: {path}')
    return data

def write(rel,data):
    p=ROOT/rel; p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')

ROOT.mkdir(parents=True,exist_ok=True)
count=0
for rel,src in URLS.items():
    try:
        data=fetch(src)
        write(rel,data); count+=1
        print(f'OK {src}')
    except Exception as e:
        print(f'WARN {src}: {e}')

# Keep the LTP history lightweight: copy the current manifest and the latest
# monthly/daily shards advertised by it, when available.
try:
    manifest=fetch('ltp/manifest.json'); write('ltp/manifest.json',manifest)
    months=manifest.get('availableMonths',[]) if isinstance(manifest,dict) else []
    days=manifest.get('availableDays',[]) if isinstance(manifest,dict) else []
    for m in months[-12:]:
        try: write(f'ltp/monthly/{m}.json',fetch(f'ltp/monthly/{m}.json')); count+=1
        except Exception as e: print(f'WARN monthly {m}: {e}')
    for d in days[-14:]:
        try: write(f'ltp/daily/{d}.json',fetch(f'ltp/daily/{d}.json')); count+=1
        except Exception as e: print(f'WARN daily {d}: {e}')
except Exception as e: print(f'WARN LTP manifest: {e}')

meta={'source':BASE,'synced_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files_synced':count}
write('meta.json',meta)
# Hard fail only if the core live dataset was not produced.
if not (ROOT/'nepse_data.json').exists(): raise SystemExit('Core NEPSE dataset was not downloaded')
print(f'Synced {count} NEPSE JSON datasets')

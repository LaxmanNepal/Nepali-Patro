import json, os, pathlib, urllib.request, datetime
BASE='https://shubhamnpk.github.io/yonepse/data/'
ROOT=pathlib.Path('data/nepse')
URLS={'nepse_data.json':'nepse_data.json','market/live.json':'market/live.json','market/status.json':'market/status.json','market/indices.json':'market/indices.json','market/sector_indices.json':'market/sector_indices.json','market/top_stocks.json':'market/top_stocks.json','market/summary.json':'market/summary.json','market/history.json':'market/history.json','market/supply_demand.json':'market/supply_demand.json','other/securities.json':'other/securities.json','other/sector_codes.json':'other/sector_codes.json','company/profiles.json':'company/profiles.json','company/financials.json':'company/financials.json','company/metadata.json':'company/metadata.json','notify/notices.json':'notify/notices.json','notify/disclosures.json':'notify/disclosures.json','notify/exchange_messages.json':'notify/exchange_messages.json','proposed_dividend/latest_1y.json':'proposed_dividend/latest_1y.json','proposed_dividend/history_all_years.json':'proposed_dividend/history_all_years.json','proposed_dividend/meta.json':'proposed_dividend/meta.json','ipo/upcoming.json':'ipo/upcoming.json','ipo/old.json':'ipo/old.json','other/brokers.json':'other/brokers.json'}
def fetch(path):
 req=urllib.request.Request(BASE+path,headers={'User-Agent':'NepaliPatro-NEPSE-Sync/1.1'})
 with urllib.request.urlopen(req,timeout=45) as r:return json.loads(r.read().decode('utf-8'))
def write(rel,data):
 p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
ROOT.mkdir(parents=True,exist_ok=True);count=0;failed=[];started=datetime.datetime.now(datetime.timezone.utc).isoformat()
for rel,src in URLS.items():
 try:write(rel,fetch(src));count+=1;print('OK',src)
 except Exception as e:failed.append(src);print('WARN',src,e)
try:
 manifest=fetch('ltp/manifest.json');write('ltp/manifest.json',manifest)
 for m in (manifest.get('availableMonths',[]) if isinstance(manifest,dict) else [])[-12:]:
  try:write(f'ltp/monthly/{m}.json',fetch(f'ltp/monthly/{m}.json'));count+=1
  except Exception as e:print('WARN monthly',m,e)
 for d in (manifest.get('availableDays',[]) if isinstance(manifest,dict) else [])[-14:]:
  try:write(f'ltp/daily/{d}.json',fetch(f'ltp/daily/{d}.json'));count+=1
  except Exception as e:print('WARN daily',d,e)
except Exception as e:print('WARN LTP manifest',e)
write('meta.json',{'source':BASE,'synced_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'started_at':started,'files_synced':count,'failed_sources':failed,'source_status':'partial' if failed else 'ok'})
if not (ROOT/'nepse_data.json').exists():raise SystemExit('Core NEPSE dataset was not downloaded')
print(f'Synced {count} NEPSE JSON datasets')
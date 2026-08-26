#!/usr/bin/env python3
import json,os,datetime
ROOT='data/nepse'

def load(p):
 try:
  with open(os.path.join(ROOT,p),encoding='utf-8') as f:return json.load(f)
 except:return None

def unwrap(x):
 if isinstance(x,list):return x
 if isinstance(x,dict):
  for k in ('data','results','items','securities','stocks','records','rows','content'):
   if isinstance(x.get(k),list):return x[k]
 return []
def pick(x,keys):
 if isinstance(x,dict):
  for k,v in x.items():
   if k in keys:return v
  for v in x.values():
   z=pick(v,keys)
   if z is not None:return z
 if isinstance(x,list):
  for v in x:
   z=pick(v,keys)
   if z is not None:return z

def main():
 files=['nepse_data.json','market/summary.json','market/live.json','market/indices.json']
 docs={p:load(p) for p in files}
 stocks=unwrap(docs['nepse_data.json'])
 checks={}
 checks['company_records']=len(stocks)
 checks['company_records_ok']=len(stocks)>0
 checks['summary_present']=docs['market/summary.json'] is not None
 checks['indices_present']=docs['market/indices.json'] is not None
 checks['live_present']=docs['market/live.json'] is not None
 checks['turnover_present']=pick(docs['market/summary.json'],{'turnover','totalTurnover','totalTurnoverValue','totalValue','totalTurnoverAmount'}) is not None
 checks['transactions_present']=pick(docs['market/summary.json'],{'transactions','totalTransactions','totalTrades','totalTradeCount','transactionCount'}) is not None
 checks['traded_scrips_present']=pick(docs['market/summary.json'],{'tradedScrips','tradedScrip','totalScrips','totalTradedScrips','tradedCompanies','tradedStocks'}) is not None
 checks['validation_passed']=all(v for k,v in checks.items() if k.endswith('_present') or k=='company_records_ok')
 out={'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'status':'PASS' if checks['validation_passed'] else 'FAIL'}
 with open(os.path.join(ROOT,'verification.json'),'w',encoding='utf-8') as f:json.dump(out,f,ensure_ascii=False,indent=2)
 print(json.dumps(out,ensure_ascii=False,indent=2))
 if not checks['validation_passed']:raise SystemExit(1)
if __name__=='__main__':main()

import datetime as dt
import json, pathlib, re, urllib.error, urllib.parse, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
CATALOG_URL='https://raw.githubusercontent.com/LaxmanNepal/LaxmanNepalApps/refs/heads/main/TV/list.json'
OUT=ROOT/'data/live-tv-health.json'; HISTORY=ROOT/'data/live-tv-history.json'; UA='Nepali-Patro-LiveTV-HealthCheck/6.0'
def fetch(url,timeout=12,accept='*/*'):
 req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':accept})
 with urllib.request.urlopen(req,timeout=timeout) as x:return x.read(),x.status,x.headers
def load_catalog():
 b,_,_=fetch(CATALOG_URL,20,'application/json,*/*'); d=json.loads(b.decode('utf-8-sig'))
 if isinstance(d,list):return d
 if isinstance(d,dict):
  for k in ('channels','data','items','content'):
   v=d.get(k)
   if isinstance(v,str):
    try:v=json.loads(v)
    except:continue
   if isinstance(v,list):return v
 raise ValueError('Unsupported TV catalog format')
def urls(c):
 a=[]
 for k in ('m3u8','stream','url'):
  v=c.get(k)
  if isinstance(v,str) and v.startswith(('http://','https://')):a.append(v.strip())
 for s in c.get('sources',[]) if isinstance(c.get('sources'),list) else []:
  v=s if isinstance(s,str) else s.get('url') if isinstance(s,dict) else None
  if isinstance(v,str) and v.startswith(('http://','https://')):a.append(v.strip())
 return list(dict.fromkeys(a))
def err(e):
 t=str(e).lower();return 'timeout' if 'timeout' in t else 'dns_error' if 'getaddrinfo' in t or 'name or service' in t else 'ssl_error' if 'ssl' in t or 'certificate' in t else type(e).__name__
def playlist(base,b):
 t=b.decode('utf-8','ignore');valid=t.lstrip().startswith('#EXTM3U')
 if not valid:return {'valid':False,'kind':'invalid','variants':[],'segmentCount':0,'firstSegment':None}
 master='#EXT-X-STREAM-INF' in t;media=bool(re.search(r'#EXTINF:|#EXT-X-TARGETDURATION|#EXT-X-MEDIA-SEQUENCE',t));seg=[];variants=[]
 for line in t.splitlines():
  line=line.strip()
  if line and not line.startswith('#'):seg.append(urllib.parse.urljoin(base,line))
  if line.startswith('#EXT-X-STREAM-INF'):
   m=re.search(r'RESOLUTION=(\d+x\d+)',line);variants.append(m.group(1) if m else None)
 return {'valid':True,'kind':'master' if master else 'media' if media else 'playlist','master':master,'media':media,'variants':variants,'segmentCount':len(seg),'firstSegment':seg[0] if seg else None}
def stream(url):
 st=dt.datetime.now(dt.timezone.utc)
 try:
  b,code,h=fetch(url,12,'application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*');p=playlist(url,b[:300000]);state='online';reason='playlist_valid'
  if code!=200:state='offline';reason='http_error'
  elif not p['valid']:state='invalid';reason='invalid_hls_playlist'
  elif p['master'] and not p['variants']:state='degraded';reason='master_without_variants'
  elif not p['media'] and not p['master']:state='degraded';reason='empty_hls_playlist'
  seg=None
  if state=='online' and p['firstSegment']:
   try:
    sb,sc,sh=fetch(p['firstSegment'],8,'*/*');seg={'status':'online' if sc==200 and sb else 'offline','http':sc,'bytes':len(sb)}
    if seg['status']!='online':state='degraded';reason='first_segment_failed'
   except urllib.error.HTTPError as e:seg={'status':'offline','http':e.code};state='degraded';reason='first_segment_failed'
   except Exception as e:seg={'status':'offline','error':err(e)};state='degraded';reason='first_segment_failed'
  return {'url':url,'status':state,'reason':reason,'http':code,'content_type':h.get('Content-Type','')[:160],'hls':p,'segment':seg,'latencyMs':int((dt.datetime.now(dt.timezone.utc)-st).total_seconds()*1000)}
 except urllib.error.HTTPError as e:return {'url':url,'status':'geo_blocked' if e.code in (401,403) else 'offline','reason':'access_denied' if e.code in (401,403) else 'http_error','http':e.code}
 except Exception as e:return {'url':url,'status':'offline','reason':err(e)}
def logo(url):
 if not isinstance(url,str) or not url.startswith(('http://','https://')):return {'status':'missing'}
 try:
  _,c,h=fetch(url,8,'image/avif,image/webp,image/png,image/jpeg,*/*');ct=h.get('Content-Type','').lower();return {'status':'online' if c==200 and ct.startswith('image/') else 'invalid','http':c,'content_type':ct[:120]}
 except urllib.error.HTTPError as e:return {'status':'offline','http':e.code}
 except Exception as e:return {'status':'offline','error':err(e)}
def load_history():
 try:return json.loads(HISTORY.read_text(encoding='utf-8'))
 except:return {'version':1,'channels':{}}
results=[];history=load_history();now=dt.datetime.now(dt.timezone.utc).isoformat()
for c in load_catalog():
 cid=str(c.get('id') or c.get('slug') or c.get('name') or c.get('title') or '').strip();name=str(c.get('name') or c.get('title') or cid).strip();us=urls(c);checks=[stream(u) for u in us];good=next((i for i,x in enumerate(checks) if x.get('status')=='online'),None)
 state='online' if good is not None else 'degraded' if any(x.get('status')=='degraded' for x in checks) else 'geo_blocked' if any(x.get('status')=='geo_blocked' for x in checks) else 'invalid' if any(x.get('status')=='invalid' for x in checks) else 'offline'
 h=history.setdefault('channels',{}).setdefault(cid,{'checks':0,'successes':0,'failures':0,'consecutiveFailures':0,'latencies':[],'sources':{}});h['checks']+=1
 if state=='online':h['successes']+=1;h['consecutiveFailures']=0
 else:h['failures']+=1;h['consecutiveFailures']+=1
 lat=[x['latencyMs'] for x in checks if isinstance(x.get('latencyMs'),int)];h['latencies']=(h.get('latencies',[])+lat)[-50:]
 for i,x in enumerate(checks):
  sh=h.setdefault('sources',{}).setdefault(us[i],{'checks':0,'successes':0,'failures':0,'latencies':[]});sh['checks']+=1
  if x.get('status')=='online':sh['successes']+=1
  else:sh['failures']+=1
  if isinstance(x.get('latencyMs'),int):sh['latencies']=(sh.get('latencies',[])+[x['latencyMs']])[-30:]
 uptime=round(100*h['successes']/h['checks'],1) if h['checks'] else 0;avg=round(sum(h['latencies'])/len(h['latencies'])) if h['latencies'] else None
 source_scores=[]
 for u in us:
  sh=h['sources'][u];rate=100*sh['successes']/sh['checks'] if sh['checks'] else 0;la=sum(sh['latencies'])/len(sh['latencies']) if sh['latencies'] else 99999;score=rate-(la/1000);source_scores.append((score,u))
 ranked=sorted(source_scores,reverse=True);best=ranked[0][1] if ranked else None
 lu=c.get('image') or c.get('logo') or c.get('thumbnail');results.append({'id':cid,'name':name,'title':c.get('title'),'status':state,'sourceCount':len(us),'workingSource':good,'workingUrl':us[good] if good is not None else best,'bestSource':best,'uptimePercent':uptime,'checks':h['checks'],'consecutiveFailures':h['consecutiveFailures'],'avgLatencyMs':avg,'logo':lu,'logoStatus':logo(lu),'streamChecks':checks})
HISTORY.write_text(json.dumps({'version':1,'updatedAt':now,'channels':history.get('channels',{})},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
out={'version':6,'generatedAt':now,'catalog':CATALOG_URL,'channelCount':len(results),'onlineCount':sum(x['status']=='online' for x in results),'degradedCount':sum(x['status']=='degraded' for x in results),'offlineCount':sum(x['status']=='offline' for x in results),'geoBlockedCount':sum(x['status']=='geo_blocked' for x in results),'invalidCount':sum(x['status']=='invalid' for x in results),'results':results};OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({k:out[k] for k in ('generatedAt','channelCount','onlineCount','degradedCount','offlineCount','geoBlockedCount','invalidCount')}))
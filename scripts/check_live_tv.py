import datetime as dt
import json, pathlib, re, urllib.error, urllib.parse, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]; CATALOG_URL='https://raw.githubusercontent.com/LaxmanNepal/LaxmanNepalApps/refs/heads/main/TV/list.json'; OUT=ROOT/'data/live-tv-health.json'; UA='Nepali-Patro-LiveTV-HealthCheck/5.0'
def fetch(url,timeout=12,accept='*/*'):
 r=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':accept});
 with urllib.request.urlopen(r,timeout=timeout) as x:return x.read(),x.status,x.headers
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
 t=str(e).lower(); return 'timeout' if 'timeout' in t else 'dns_error' if 'getaddrinfo' in t or 'name or service' in t else 'ssl_error' if 'ssl' in t or 'certificate' in t else type(e).__name__
def playlist(base,b):
 t=b.decode('utf-8','ignore'); valid=t.lstrip().startswith('#EXTM3U')
 if not valid:return {'valid':False,'kind':'invalid','variants':[],'segments':[]}
 master='#EXT-X-STREAM-INF' in t; media=bool(re.search(r'#EXTINF:|#EXT-X-TARGETDURATION|#EXT-X-MEDIA-SEQUENCE',t)); seg=[]
 for line in t.splitlines():
  line=line.strip()
  if line and not line.startswith('#'):seg.append(urllib.parse.urljoin(base,line))
 variants=[]
 for line in t.splitlines():
  if line.startswith('#EXT-X-STREAM-INF'):
   r=re.search(r'RESOLUTION=(\d+x\d+)',line); variants.append(r.group(1) if r else None)
 return {'valid':True,'kind':'master' if master else 'media' if media else 'playlist','master':master,'media':media,'variants':variants,'segmentCount':len(seg),'firstSegment':seg[0] if seg else None}
def stream(url):
 st=dt.datetime.now(dt.timezone.utc)
 try:
  b,code,h=fetch(url,12,'application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*'); p=playlist(url,b[:300000]); reason='playlist_valid'; state='online'
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
results=[]
for c in load_catalog():
 cid=str(c.get('id') or c.get('slug') or c.get('name') or c.get('title') or '').strip(); name=str(c.get('name') or c.get('title') or cid).strip(); us=urls(c); checks=[stream(u) for u in us]; good=next((i for i,x in enumerate(checks) if x.get('status')=='online'),None)
 if good is not None:state='online'
 elif any(x.get('status')=='degraded' for x in checks):state='degraded'
 elif any(x.get('status')=='geo_blocked' for x in checks):state='geo_blocked'
 elif any(x.get('status')=='invalid' for x in checks):state='invalid'
 else:state='offline'
 lu=c.get('image') or c.get('logo') or c.get('thumbnail');results.append({'id':cid,'name':name,'title':c.get('title'),'status':state,'sourceCount':len(us),'workingSource':good,'workingUrl':us[good] if good is not None else None,'logo':lu,'logoStatus':logo(lu),'checks':checks})
now=dt.datetime.now(dt.timezone.utc).isoformat();out={'version':5,'generatedAt':now,'catalog':CATALOG_URL,'channelCount':len(results),'onlineCount':sum(x['status']=='online' for x in results),'degradedCount':sum(x['status']=='degraded' for x in results),'offlineCount':sum(x['status']=='offline' for x in results),'geoBlockedCount':sum(x['status']=='geo_blocked' for x in results),'invalidCount':sum(x['status']=='invalid' for x in results),'results':results};OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({k:out[k] for k in ('generatedAt','channelCount','onlineCount','degradedCount','offlineCount','geoBlockedCount','invalidCount')}))
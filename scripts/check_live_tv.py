import json, pathlib, urllib.request, datetime

root = pathlib.Path(__file__).resolve().parents[1]
data = json.loads((root / 'data/live-tv.json').read_text(encoding='utf-8'))
results = []
for c in data.get('channels', []):
    status = 'offline'
    detail = ''
    try:
        req = urllib.request.Request(c['stream'], headers={'User-Agent':'Nepali-Patro-LiveTV-HealthCheck/1.0','Accept':'application/vnd.apple.mpegurl,*/*'})
        with urllib.request.urlopen(req, timeout=8) as r:
            body = r.read(4096).decode('utf-8','ignore')
            status = 'online' if r.status == 200 and '#EXTM3U' in body else 'offline'
            detail = f'HTTP {r.status}'
    except Exception as e:
        detail = type(e).__name__
    results.append({'id':c['id'],'name':c['name'],'status':status,'detail':detail})

out = {'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'results': results}
(root / 'data/live-tv-status.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(out, ensure_ascii=False, indent=2))

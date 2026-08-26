import datetime as dt
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG_URL = "https://raw.githubusercontent.com/LaxmanNepal/LaxmanNepalApps/refs/heads/main/TV/list.json"
OUT = ROOT / "data/live-tv-health.json"
UA = "Nepali-Patro-LiveTV-HealthCheck/2.0"


def get_json(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json,*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8")), r.status


def check_stream(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/vnd.apple.mpegurl,application/x-mpegURL,*/*"})
        with urllib.request.urlopen(req, timeout=10) as r:
            body = r.read(8192).decode("utf-8", "ignore")
            content_type = r.headers.get("Content-Type", "")
            ok = r.status == 200 and ("#EXTM3U" in body or "mpegurl" in content_type.lower())
            return {"status": "online" if ok else "offline", "http": r.status, "content_type": content_type[:120]}
    except Exception as exc:
        return {"status": "offline", "error": type(exc).__name__}


try:
    catalog, http_status = get_json(CATALOG_URL)
    channels = catalog.get("channels", []) if isinstance(catalog, dict) else []
except Exception as exc:
    OUT.write_text(json.dumps({"version": 1, "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(), "catalog": CATALOG_URL, "error": type(exc).__name__, "results": []}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    raise

results = []
for channel in channels:
    cid = str(channel.get("id") or channel.get("name") or channel.get("title") or "").strip()
    name = str(channel.get("name") or channel.get("title") or cid).strip()
    urls = []
    primary = channel.get("stream") or channel.get("url")
    if isinstance(primary, str) and primary.startswith(("http://", "https://")):
        urls.append(primary)
    for source in channel.get("sources", []) if isinstance(channel.get("sources"), list) else []:
        if isinstance(source, str):
            urls.append(source)
        elif isinstance(source, dict) and isinstance(source.get("url"), str):
            urls.append(source["url"])
    seen = set(); urls = [u for u in urls if not (u in seen or seen.add(u))]
    checks = [check_stream(url) for url in urls]
    online = next((i for i, x in enumerate(checks) if x.get("status") == "online"), None)
    results.append({"id": cid, "name": name, "status": "online" if online is not None else "offline", "sourceCount": len(urls), "workingSource": online, "checks": checks})

now = dt.datetime.now(dt.timezone.utc).isoformat()
out = {"version": 2, "generatedAt": now, "catalog": CATALOG_URL, "channelCount": len(results), "onlineCount": sum(r["status"] == "online" for r in results), "results": results}
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"generatedAt": now, "channelCount": len(results), "onlineCount": out["onlineCount"]}, ensure_ascii=False))

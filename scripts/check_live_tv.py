import datetime as dt
import json
import pathlib
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG_URL = "https://raw.githubusercontent.com/LaxmanNepal/LaxmanNepalApps/refs/heads/main/TV/list.json"
OUT = ROOT / "data/live-tv-health.json"
UA = "Nepali-Patro-LiveTV-HealthCheck/3.0"


def fetch(url, timeout=20, accept="*/*"):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.status, r.headers


def load_catalog():
    body, status, _ = fetch(CATALOG_URL, 20, "application/json,*/*")
    data = json.loads(body.decode("utf-8-sig"))
    # list.json is currently a top-level array. Also accept common wrapper shapes.
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("channels", "data", "items", "content"):
            value = data.get(key)
            if isinstance(value, str):
                try:
                    value = json.loads(value)
                except json.JSONDecodeError:
                    continue
            if isinstance(value, list):
                return value
    raise ValueError("Unsupported TV catalog format")


def urls_for(channel):
    urls = []
    for key in ("m3u8", "stream", "url"):
        value = channel.get(key)
        if isinstance(value, str) and value.startswith(("http://", "https://")):
            urls.append(value.strip())
    for source in channel.get("sources", []) if isinstance(channel.get("sources"), list) else []:
        value = source if isinstance(source, str) else source.get("url") if isinstance(source, dict) else None
        if isinstance(value, str) and value.startswith(("http://", "https://")):
            urls.append(value.strip())
    return list(dict.fromkeys(urls))


def check_stream(url):
    started = dt.datetime.now(dt.timezone.utc)
    try:
        body, status, headers = fetch(url, 12, "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*")
        sample = body[:32768].decode("utf-8", "ignore")
        content_type = headers.get("Content-Type", "")
        is_hls = "#EXTM3U" in sample or "mpegurl" in content_type.lower() or url.lower().split("?", 1)[0].endswith((".m3u8", ".m3u"))
        ok = status == 200 and is_hls
        return {
            "url": url,
            "status": "online" if ok else "offline",
            "http": status,
            "content_type": content_type[:160],
            "hls": bool(is_hls),
            "latencyMs": int((dt.datetime.now(dt.timezone.utc) - started).total_seconds() * 1000),
            "error": None if ok else "not_a_valid_hls_response",
        }
    except urllib.error.HTTPError as exc:
        return {"url": url, "status": "offline", "http": exc.code, "error": "HTTPError"}
    except Exception as exc:
        return {"url": url, "status": "offline", "error": type(exc).__name__}


def check_logo(url):
    if not isinstance(url, str) or not url.startswith(("http://", "https://")):
        return {"status": "missing"}
    try:
        _, status, headers = fetch(url, 10, "image/avif,image/webp,image/png,image/jpeg,*/*")
        return {"status": "online" if status == 200 else "offline", "http": status, "content_type": headers.get("Content-Type", "")[:120]}
    except urllib.error.HTTPError as exc:
        return {"status": "offline", "http": exc.code}
    except Exception as exc:
        return {"status": "offline", "error": type(exc).__name__}


try:
    channels = load_catalog()
except Exception as exc:
    OUT.write_text(json.dumps({
        "version": 3,
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "catalog": CATALOG_URL,
        "error": type(exc).__name__,
        "results": []
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    raise

results = []
for channel in channels:
    cid = str(channel.get("id") or channel.get("slug") or channel.get("name") or channel.get("title") or "").strip()
    name = str(channel.get("name") or channel.get("title") or cid).strip()
    urls = urls_for(channel)
    checks = [check_stream(url) for url in urls]
    working = next((i for i, check in enumerate(checks) if check.get("status") == "online"), None)
    logo_url = channel.get("image") or channel.get("logo") or channel.get("thumbnail")
    results.append({
        "id": cid,
        "name": name,
        "title": channel.get("title"),
        "status": "online" if working is not None else "offline",
        "sourceCount": len(urls),
        "workingSource": working,
        "workingUrl": urls[working] if working is not None else None,
        "logo": logo_url,
        "logoStatus": check_logo(logo_url),
        "checks": checks,
    })

now = dt.datetime.now(dt.timezone.utc).isoformat()
out = {
    "version": 3,
    "generatedAt": now,
    "catalog": CATALOG_URL,
    "channelCount": len(results),
    "onlineCount": sum(r["status"] == "online" for r in results),
    "offlineCount": sum(r["status"] == "offline" for r in results),
    "results": results,
}
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"generatedAt": now, "channelCount": len(results), "onlineCount": out["onlineCount"], "offlineCount": out["offlineCount"]}, ensure_ascii=False))

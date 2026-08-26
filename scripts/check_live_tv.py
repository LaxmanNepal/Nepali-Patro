import datetime as dt
import json
import pathlib
import re
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG_URL = "https://raw.githubusercontent.com/LaxmanNepal/LaxmanNepalApps/refs/heads/main/TV/list.json"
OUT = ROOT / "data/live-tv-health.json"
UA = "Nepali-Patro-LiveTV-HealthCheck/4.0"


def fetch(url, timeout=15, accept="*/*"):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.status, r.headers


def load_catalog():
    body, _, _ = fetch(CATALOG_URL, 20, "application/json,*/*")
    data = json.loads(body.decode("utf-8-sig"))
    if isinstance(data, list): return data
    if isinstance(data, dict):
        for key in ("channels", "data", "items", "content"):
            value = data.get(key)
            if isinstance(value, str):
                try: value = json.loads(value)
                except json.JSONDecodeError: continue
            if isinstance(value, list): return value
    raise ValueError("Unsupported TV catalog format")


def urls_for(channel):
    urls=[]
    for key in ("m3u8","stream","url"):
        value=channel.get(key)
        if isinstance(value,str) and value.startswith(("http://","https://")): urls.append(value.strip())
    for source in channel.get("sources",[]) if isinstance(channel.get("sources"),list) else []:
        value=source if isinstance(source,str) else source.get("url") if isinstance(source,dict) else None
        if isinstance(value,str) and value.startswith(("http://","https://")): urls.append(value.strip())
    return list(dict.fromkeys(urls))


def classify_error(exc):
    text=str(exc).lower()
    if "timed out" in text or "timeout" in text: return "timeout"
    if "name or service" in text or "nodename" in text or "getaddrinfo" in text: return "dns_error"
    if "ssl" in text or "certificate" in text: return "ssl_error"
    return type(exc).__name__


def absolute_url(base, value):
    return urllib.parse.urljoin(base, value.strip())


def playlist_info(url, body):
    text=body.decode("utf-8","ignore")
    if not text.lstrip().startswith("#EXTM3U"): return {"valid":False,"kind":"invalid"}
    media=bool(re.search(r"#EXTINF:|#EXT-X-TARGETDURATION|#EXT-X-MEDIA-SEQUENCE",text))
    master=bool(re.search(r"#EXT-X-STREAM-INF",text))
    variants=[]
    for line in text.splitlines():
        if line.startswith("#EXT-X-STREAM-INF"):
            m=re.search(r"RESOLUTION=(\d+x\d+)",line)
            variants.append(m.group(1) if m else None)
    targets=re.findall(r"#EXT-X-TARGETDURATION:(\d+)",text)
    segments=[]
    for line in text.splitlines():
        line=line.strip()
        if line and not line.startswith("#"):
            segments.append(absolute_url(url,line))
    return {"valid":True,"kind":"master" if master else "media" if media else "playlist","master":master,"media":media,"variants":variants,"segmentCount":len(segments),"firstSegment":segments[0] if segments else None}


def check_stream(url):
    started=dt.datetime.now(dt.timezone.utc)
    try:
        body,status,headers=fetch(url,12,"application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*")
        ctype=headers.get("Content-Type","")
        info=playlist_info(url,body[:256000])
        if status!=200: state="offline"; reason="http_error"
        elif not info["valid"]: state="invalid"; reason="invalid_hls_playlist"
        elif info["master"] and not info["variants"]: state="degraded"; reason="master_without_variants"
        elif not info["media"] and not info["master"]: state="degraded"; reason="empty_hls_playlist"
        else: state="online"; reason="playlist_valid"
        segment=None
        if state=="online" and info.get("firstSegment"):
            try:
                sb,ss,sh=fetch(info["firstSegment"],8,"*/*")
                segment={"status":"online" if ss==200 and len(sb)>0 else "offline","http":ss,"bytes":len(sb),"content_type":sh.get("Content-Type","")[:120]}
                if segment["status"]!="online": state="degraded"; reason="first_segment_failed"
            except urllib.error.HTTPError as exc:
                segment={"status":"offline","http":exc.code}; state="degraded"; reason="first_segment_failed"
            except Exception as exc:
                segment={"status":"offline","error":classify_error(exc)}; state="degraded"; reason="first_segment_failed"
        return {"url":url,"status":state,"reason":reason,"http":status,"content_type":ctype[:160],"hls":info,"segment":segment,"latencyMs":int((dt.datetime.now(dt.timezone.utc)-started).total_seconds()*1000)}
    except urllib.error.HTTPError as exc:
        status="geo_blocked" if exc.code in (401,403) else "offline"
        return {"url":url,"status":status,"reason":"access_denied" if status=="geo_blocked" else "http_error","http":exc.code}
    except Exception as exc:
        return {"url":url,"status":"offline","reason":classify_error(exc)}


def check_logo(url):
    if not isinstance(url,str) or not url.startswith(("http://","https://")): return {"status":"missing"}
    try:
        _,status,headers=fetch(url,10,"image/avif,image/webp,image/png,image/jpeg,*/*")
        ctype=headers.get("Content-Type","").lower()
        return {"status":"online" if status==200 and ctype.startswith("image/") else "invalid","http":status,"content_type":ctype[:120]}
    except urllib.error.HTTPError as exc: return {"status":"offline","http":exc.code}
    except Exception as exc: return {"status":"offline","error":classify_error(exc)}

channels=load_catalog()
results=[]
for channel in channels:
    cid=str(channel.get("id") or channel.get("slug") or channel.get("name") or channel.get("title") or "").strip()
    name=str(channel.get("name") or channel.get("title") or cid).strip()
    urls=urls_for(channel)
    checks=[check_stream(u) for u in urls]
    working=next((i for i,x in enumerate(checks) if x.get("status")=="online"),None)
    if working is None and any(x.get("status")=="degraded" for x in checks): overall="degraded"
    elif working is not None: overall="online"
    elif any(x.get("status")=="geo_blocked" for x in checks): overall="geo_blocked"
    elif any(x.get("status")=="invalid" for x in checks): overall="invalid"
    else: overall="offline"
    logo_url=channel.get("image") or channel.get("logo") or channel.get("thumbnail")
    results.append({"id":cid,"name":name,"title":channel.get("title"),"status":overall,"sourceCount":len(urls),"workingSource":working,"workingUrl":urls[working] if working is not None else None,"logo":logo_url,"logoStatus":check_logo(logo_url),"checks":checks})

now=dt.datetime.now(dt.timezone.utc).isoformat()
out={"version":4,"generatedAt":now,"catalog":CATALOG_URL,"channelCount":len(results),"onlineCount":sum(r["status"]=="online" for r in results),"degradedCount":sum(r["status"]=="degraded" for r in results),"offlineCount":sum(r["status"]=="offline" for r in results),"geoBlockedCount":sum(r["status"]=="geo_blocked" for r in results),"invalidCount":sum(r["status"]=="invalid" for r in results),"results":results}
OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"generatedAt":now,"channelCount":len(results),"onlineCount":out["onlineCount"],"degradedCount":out["degradedCount"],"offlineCount":out["offlineCount"]},ensure_ascii=False))

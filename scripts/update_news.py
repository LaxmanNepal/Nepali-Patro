import concurrent.futures
import difflib
import gzip
import html
import json
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

CONFIG_PATH = Path("feeds/feeds.js")
OUT = Path("feeds/news.json")
LEGACY_OUT = Path("data/news.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; Nepali-Patro-News/4.0; +https://apps.laxmannepal.com.np/Nepali-Patro/news/)",
    "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, text/html;q=0.8, */*;q=0.5",
    "Accept-Language": "ne-NP,ne;q=0.9,en;q=0.7",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "close",
}
DEV = re.compile(r"[\u0900-\u097F]")
BAD_XML_CHARS = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F]")
CATEGORY_MAP = {
    "all": "national",
    "sports": "sports",
    "finance": "business",
    "tech": "technology",
    "entertainment": "entertainment",
}
SOURCE_NAMES = {
    "onlinekhabar.com": "अनलाइनखबर", "nagariknetwork.com": "नागरिक", "ratopati.com": "रातोपाटी",
    "setopati.com": "सेतोपाटी", "gorkhapatraonline.com": "गोरखापत्र", "bbc.co.uk": "बीबीसी नेपाली",
    "annapurnapost.com": "अन्नपूर्ण पोस्ट", "rajdhanidaily.com": "राजधानी", "ujyaaloonline.com": "उज्यालो अनलाइन",
    "news24nepal.com": "न्यूज २४ नेपाल", "nepallive.com": "नेपाल लाइभ", "myrepublica.nagariknetwork.com": "माइ रिपब्लिका",
    "lokaantar.com": "लोकान्तर", "dainiknepal.com": "दैनिक नेपाल", "nepalsamaya.com": "नेपाल समय",
    "pahilopost.com": "पहिलोपोस्ट", "nepalheadlines.com": "नेपाल हेडलाइन्स", "nepalpress.com": "नेपाल प्रेस",
    "himalkhabar.com": "हिमालखबर", "nepalnews.com": "नेपालन्युज", "hamrokhelkud.com": "हाम्रो खेलकुद",
    "goalnepal.com": "गोल नेपाल", "khelpati.com": "खेलपाटी", "nepalsportz.com": "नेपाल स्पोर्ट्स",
    "cricnepal.com": "क्रिक नेपाल", "newsofnepal.com": "न्युज अफ नेपाल", "cricketnepal.org.np": "क्रिकेट नेपाल",
    "sharesansar.com": "सेयरसंसार", "abhiyandaily.com": "अभियान", "clickmandu.com": "क्लिकमाण्डु",
    "arthasarokar.com": "अर्थ सरोकार", "bankingkhabar.com": "बैंकिङ खबर", "vikasnews.com": "विकास न्यूज",
    "aarthiknews.com": "आर्थिक न्यूज", "techpana.com": "टेकपाना", "nepalitelecom.com": "नेपाली टेलिकम",
    "techmandu.com": "टेकमाण्डु", "ictframe.com": "आईसीटी फ्रेम", "techsathi.com": "टेक साथी",
    "clicknepal.com": "क्लिक नेपाल", "merofilm.com": "मेरो फिल्म", "lensnepal.com": "लेन्स नेपाल",
    "filmykhabar.com": "फिल्मी खबर", "dcnepal.com": "डीसी नेपाल", "lexlimbu.com": "लेक्स लिम्बु",
    "khabarhub.com": "खबरहब",
}


def clean(value):
    return re.sub(r"\s+", " ", html.unescape(value or "")).strip()


def tagname(el):
    return el.tag.split("}")[-1].lower()


def first(el, names):
    wanted = {n.lower() for n in names}
    for child in list(el):
        if tagname(child) in wanted:
            value = clean(" ".join(child.itertext()))
            if value:
                return value
    return ""


def parse_date(value):
    if not value:
        return ""
    for parser in ("email", "iso"):
        try:
            if parser == "email":
                dt = parsedate_to_datetime(value)
            else:
                dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat()
        except Exception:
            pass
    return ""


def source_name(url):
    host = re.sub(r"^www\.", "", urllib.parse.urlparse(url).netloc.lower())
    return SOURCE_NAMES.get(host, host or "समाचार")


def source_logo(url):
    parsed = urllib.parse.urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}/favicon.ico" if parsed.netloc else ""


def load_feed_config():
    js = CONFIG_PATH.read_text(encoding="utf-8")
    result = {}
    for category, body in re.findall(r"([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\[(.*?)\]", js, re.S):
        for url in re.findall(r"[\"'](https?://[^\"']+)[\"']", body):
            result[url] = CATEGORY_MAP.get(category, "national")
    if not result:
        raise RuntimeError("No RSS feeds found in feeds/feeds.js")
    return result


def image_from_item(item):
    for child in item.iter():
        tag = tagname(child)
        url = child.attrib.get("url") or child.attrib.get("href") or clean("".join(child.itertext()))
        media_tag = tag in ("content", "thumbnail", "enclosure", "image", "media:content", "media:thumbnail") or tag.endswith("content") or tag.endswith("thumbnail")
        if media_tag and url and re.match(r"^https?://", url, re.I):
            typ = (child.attrib.get("type") or "").lower()
            if typ.startswith("image/") or re.search(r"\.(?:jpg|jpeg|png|gif|webp|avif)(?:[?#].*)?$", url, re.I):
                return url
    return ""


def fetch_bytes(url):
    last_error = None
    for attempt in range(1, 4):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as response:
                raw = response.read(6_000_000)
                encoding = (response.headers.get("Content-Encoding") or "").lower()
                if encoding == "gzip" or raw[:2] == b"\x1f\x8b":
                    raw = gzip.decompress(raw)
                return raw
        except Exception as exc:
            last_error = exc
            if attempt < 3:
                time.sleep(2 ** (attempt - 1))
    raise last_error


def parse_feed(url, category):
    raw = fetch_bytes(url)
    # Some legacy feeds contain illegal XML control characters or HTML entities.
    text = raw.decode("utf-8", errors="replace")
    text = BAD_XML_CHARS.sub(" ", text)
    try:
        root = ET.fromstring(text)
    except ET.ParseError:
        # A second pass fixes common undeclared HTML entities without touching valid XML.
        text = re.sub(r"&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9A-Fa-f]+;)", "&amp;", text)
        root = ET.fromstring(text)

    out = []
    items = [e for e in root.iter() if tagname(e) in ("item", "entry")][:80]
    for item in items:
        title = first(item, ["title"])
        link = first(item, ["link"])
        if not link:
            for child in list(item):
                if tagname(child) == "link" and child.attrib.get("href"):
                    link = child.attrib["href"]
                    break
        if not title or not link:
            continue
        description = first(item, ["description", "summary", "content", "encoded"])
        published = first(item, ["pubDate", "published", "updated", "date"])
        title = clean(title)
        description = clean(re.sub(r"<[^>]+>", " ", description))[:360]
        if len(DEV.findall(title)) < 2:
            continue
        if len(DEV.findall(description)) < 8:
            description = ""
        political = category == "national" and re.search(
            r"(सरकार|मन्त्री|प्रधानमन्त्री|संसद|सांसद|निर्वाचन|चुनाव|दल|पार्टी|कांग्रेस|एमाले|माओवादी|राष्ट्रपति|राजनीति|प्रतिनिधिसभा|प्रदेशसभा|राजदूत|कूटनीति)",
            title,
        )
        out.append({
            "title": title,
            "description": description,
            "imageUrl": image_from_item(item),
            "sourceLogo": source_logo(url),
            "sourceName": source_name(url),
            "publishedTime": parse_date(published),
            "articleUrl": link.strip(),
            "category": "politics" if political else category,
        })
    return out


def duplicate_key(item):
    return re.sub(r"[^\u0900-\u097Fa-zA-Z0-9]", "", item.get("title", "")).lower()


def deduplicate(items):
    chosen, keys, urls = [], [], set()
    for item in sorted(items, key=lambda x: x.get("publishedTime", ""), reverse=True):
        url = item.get("articleUrl", "").strip()
        key = duplicate_key(item)
        if not key or not url or url in urls:
            continue
        if any(key == old or difflib.SequenceMatcher(None, key, old).ratio() >= 0.90 for old in keys[-500:]):
            continue
        urls.add(url)
        keys.append(key)
        chosen.append(item)
    return chosen


def read_previous():
    try:
        payload = json.loads(OUT.read_text(encoding="utf-8"))
        items = payload.get("items", []) if isinstance(payload, dict) else payload
        return payload if isinstance(payload, dict) else {"items": items}, items if isinstance(items, list) else []
    except Exception:
        return {}, []


def write_payload(payload, items):
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    legacy_items = [
        {"title": x["title"], "summary": x.get("description", ""), "link": x["articleUrl"], "source": x.get("sourceName", "समाचार"), "category": x.get("category", "national"), "published": x.get("publishedTime", "")}
        for x in items
    ]
    LEGACY_OUT.parent.mkdir(parents=True, exist_ok=True)
    LEGACY_OUT.write_text(json.dumps({"updatedAt": payload["updatedAt"], "items": legacy_items}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    feed_map = load_feed_config()
    previous_payload, previous_items = read_previous()
    fresh_articles, failures = [], []

    def worker(pair):
        url, category = pair
        try:
            return url, parse_feed(url, category), None
        except Exception as exc:
            return url, [], f"{type(exc).__name__}: {exc}"

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for url, items, error in pool.map(worker, feed_map.items()):
            if error:
                failures.append({"url": url, "error": error})
            else:
                fresh_articles.extend(items)

    fresh_items = deduplicate(fresh_articles)
    now = datetime.now(timezone.utc)
    previous_newest = previous_payload.get("newestPublishedTime", "")
    newest = max((x.get("publishedTime", "") for x in fresh_items if x.get("publishedTime")), default=previous_newest)

    # Never destroy a good feed because every upstream source failed.
    if not fresh_items:
        if not previous_items:
            raise RuntimeError(f"All {len(feed_map)} news feeds failed and no previous feed exists")
        items = deduplicate(previous_items)[:500]
        last_success = previous_payload.get("lastSuccessfulUpdate", previous_payload.get("updatedAt", ""))
        successful = 0
        status = "stale"
    else:
        # Keep a small amount of history so temporary source outages do not make the site look empty.
        cutoff = now - timedelta(days=3)
        historical = []
        for item in previous_items:
            published = parse_date(item.get("publishedTime", ""))
            if published and datetime.fromisoformat(published.replace("Z", "+00:00")) >= cutoff:
                historical.append(item)
        items = deduplicate(fresh_items + historical)[:500]
        last_success = now.isoformat()
        successful = len(feed_map) - len(failures)
        status = "fresh" if successful else "partial"

    payload = {
        "updatedAt": now.isoformat(),
        "lastSuccessfulUpdate": last_success,
        "newestPublishedTime": newest,
        "status": status,
        "source": "feeds/feeds.js",
        "feedCount": len(feed_map),
        "successfulFeeds": successful,
        "failedFeeds": len(failures),
        "failedFeedDetails": failures[:50],
        "items": items,
    }
    write_payload(payload, items)
    print(f"News sync: {len(fresh_items)} fresh articles, {len(items)} stored, {successful}/{len(feed_map)} feeds OK, {len(failures)} failed, status={status}, newest={newest}")


if __name__ == "__main__":
    main()

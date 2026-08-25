#!/usr/bin/env python3
import html
import json
import os
import re
from datetime import datetime
from urllib.parse import quote
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET
from zoneinfo import ZoneInfo

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CAL_DIR = os.path.join(ROOT, "data", "calendar")
HISTORY_DIR = os.path.join(ROOT, "data", "itihas")
MONTHS = {1:("baishakh","बैशाख"),2:("jestha","जेठ"),3:("ashar","असार"),4:("shrawan","साउन"),5:("bhadra","भदौ"),6:("ashoj","असोज"),7:("kartik","कात्तिक"),8:("mangsir","मंसिर"),9:("poush","पुष"),10:("magh","माघ"),11:("fagun","फागुन"),12:("chaitra","चैत")}


def fetch(url):
    req = Request(url, headers={"User-Agent": "Nepali-Patro-HistoryBot/2.0"})
    with urlopen(req, timeout=25) as response:
        return response.read().decode("utf-8", "replace")


def fetch_json(url):
    return json.loads(fetch(url))


def today_bs():
    iso = datetime.now(ZoneInfo("Asia/Kathmandu")).strftime("%Y-%m-%d")
    for name in sorted(os.listdir(CAL_DIR)):
        if not name.endswith(".json"):
            continue
        try:
            data = json.load(open(os.path.join(CAL_DIR, name), encoding="utf-8"))
        except Exception:
            continue
        for day in data.get("days", []):
            if day.get("ad", {}).get("date") == iso:
                return day
    raise RuntimeError(f"BS date not found for {iso}")


def ensure_structure():
    os.makedirs(HISTORY_DIR, exist_ok=True)
    for name in os.listdir(CAL_DIR):
        if not name.endswith(".json"):
            continue
        try:
            data = json.load(open(os.path.join(CAL_DIR, name), encoding="utf-8"))
        except Exception:
            continue
        for day in data.get("days", []):
            bs = day.get("bs", {})
            month, number = bs.get("month"), bs.get("day")
            if month not in MONTHS or not number:
                continue
            slug, nepali = MONTHS[month]
            folder = os.path.join(HISTORY_DIR, slug)
            os.makedirs(folder, exist_ok=True)
            path = os.path.join(folder, f"{int(number)}.json")
            if not os.path.exists(path):
                payload = {"version":3,"bs_year":int(bs.get("year")),"bs_month":int(month),"bs_month_ne":nepali,"bs_day":int(number),"events":[],"births":[],"deaths":[],"research_leads":[],"sources":[],"last_researched":None}
                with open(path, "w", encoding="utf-8") as handle:
                    json.dump(payload, handle, ensure_ascii=False, indent=2)
                    handle.write("\n")


def wikipedia_on_this_day(month, day):
    results = []
    for kind, result_key, item_type in (("events","events","event"),("births","births","birth"),("deaths","deaths","death")):
        url = f"https://en.wikipedia.org/api/rest_v1/feed/onthisday/{kind}/{month:02d}/{day:02d}"
        try:
            payload = fetch_json(url)
        except Exception as exc:
            print(f"Wikipedia {kind} unavailable: {exc}")
            continue
        for item in payload.get(result_key) or payload.get("events") or []:
            pages = item.get("pages") or []
            page = pages[0] if pages else {}
            text = (item.get("text") or "").strip()
            if not text:
                continue
            results.append({"year":item.get("year"),"title":page.get("normalizedtitle") or page.get("title") or text[:100],"summary":text,"type":item_type,"source":"Wikipedia On This Day","url":page.get("content_urls",{}).get("desktop",{}).get("page", ""),"source_tier":"reference"})
    return results


def google_news_leads(queries):
    leads = []
    for query in queries:
        url = "https://news.google.com/rss/search?q=" + quote(query) + "&hl=ne&gl=NP&ceid=NP:ne"
        try:
            root = ET.fromstring(fetch(url))
        except Exception as exc:
            print(f"Google News unavailable for {query!r}: {exc}")
            continue
        for item in root.findall(".//item")[:10]:
            title = html.unescape((item.findtext("title") or "").strip())
            link = (item.findtext("link") or "").strip()
            description = html.unescape(re.sub(r"<[^>]+>", " ", item.findtext("description") or "")).strip()
            if title:
                leads.append({"title":title,"summary":description,"type":"research-lead","source":"Google News search","url":link,"query":query,"source_tier":"discovery"})
    return leads


def normalize_title(value):
    return re.sub(r"[^\w\u0900-\u097F]+", "", str(value or "").casefold())


def classify(item):
    text = (str(item.get("title", "")) + " " + str(item.get("summary", ""))).casefold()
    if item.get("type") == "birth": category = "जन्म"
    elif item.get("type") == "death": category = "निधन"
    elif any(x in text for x in ["युद्ध","सेना","फौज","battle","war"]): category = "युद्ध तथा सैन्य इतिहास"
    elif any(x in text for x in ["भूकम्प","बाढी","पहिरो","दुर्घटना","earthquake","flood"]): category = "प्राकृतिक विपत्ति"
    elif any(x in text for x in ["राजा","राणा","शाह","सरकार","राष्ट्रपति","संविधान","राजनीति"]): category = "राजनीति"
    elif any(x in text for x in ["मन्दिर","पर्व","संस्कृति","heritage","temple"]): category = "संस्कृति तथा सम्पदा"
    elif any(x in text for x in ["विज्ञान","प्रविधि","technology","science"]): category = "विज्ञान तथा प्रविधि"
    elif item.get("type") == "nepal-history": category = "नेपाल इतिहास"
    else: category = "विश्व इतिहास"
    item["category"] = item.get("category") or category
    item["importance"] = item.get("importance") or (5 if category in ("नेपाल इतिहास","युद्ध तथा सैन्य इतिहास") else 3)
    item["confidence"] = item.get("confidence") or ("medium" if item.get("type") == "research-lead" else "high")
    item["sources"] = item.get("sources") or ([{"name":item.get("source"),"url":item.get("url", ""),"tier":item.get("source_tier", "reference")}] if item.get("source") else [])
    return item


def main():
    ensure_structure()
    day = today_bs()
    bs = day["bs"]
    ad_date = day["ad"]["date"]
    ad_month, ad_day = map(int, ad_date.split("-")[1:])
    slug, month_ne = MONTHS[int(bs["month"])]
    path = os.path.join(HISTORY_DIR, slug, f"{int(bs['day'])}.json")
    data = json.load(open(path, encoding="utf-8"))

    events = [classify(x) for x in data.get("events", []) if isinstance(x, dict)]
    seen = {normalize_title(x.get("title")) for x in events if x.get("title")}

    reference_events = wikipedia_on_this_day(ad_month, ad_day)
    for item in reference_events:
        key = normalize_title(item.get("title"))
        if key and key not in seen:
            events.append(classify(item))
            seen.add(key)

    queries = [f"{month_ne} {int(bs['day'])} इतिहास नेपाल",f"{month_ne} {int(bs['day'])} ऐतिहासिक घटना नेपाल",f"{ad_date} Nepal history",f"{ad_month:02d}/{ad_day:02d} Nepal historical event",f"{month_ne} {int(bs['day'])} युद्ध नेपाल",f"{month_ne} {int(bs['day'])} व्यक्तित्व जन्म निधन"]
    leads = google_news_leads(queries)
    unique_leads, lead_seen = [], set()
    for lead in leads:
        key = normalize_title(lead.get("title"))
        if key and key not in lead_seen:
            lead_seen.add(key)
            unique_leads.append(lead)

    now = datetime.now(ZoneInfo("UTC")).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    sources = [
        {"name":"Wikipedia On This Day — events","url":f"https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/{ad_month:02d}/{ad_day:02d}","tier":"reference"},
        {"name":"Wikipedia On This Day — births","url":f"https://en.wikipedia.org/api/rest_v1/feed/onthisday/births/{ad_month:02d}/{ad_day:02d}","tier":"reference"},
        {"name":"Wikipedia On This Day — deaths","url":f"https://en.wikipedia.org/api/rest_v1/feed/onthisday/deaths/{ad_month:02d}/{ad_day:02d}","tier":"reference"},
        {"name":"Google News — Nepal history discovery","url":f"https://news.google.com/rss/search?q={quote(month_ne + ' ' + str(int(bs['day'])) + ' इतिहास नेपाल')}&hl=ne&gl=NP&ceid=NP:ne","tier":"discovery"}
    ]

    data.update({"version":3,"bs_year":int(bs["year"]),"bs_month":int(bs["month"]),"bs_month_ne":month_ne,"bs_day":int(bs["day"]),"bs_date":bs.get("display"),"ad_date":ad_date,"last_researched":now,"events":events[:100],"births":[x for x in events if x.get("type")=="birth"][:50],"deaths":[x for x in events if x.get("type")=="death"][:50],"research_leads":unique_leads[:60],"research":{"status":"automated daily research","method":"Wikipedia On This Day reference data + Google News discovery leads + existing curated events","reference_sources_checked":3,"discovery_queries":len(queries),"reference_candidates":len(reference_events),"research_leads":len(unique_leads),"events_published":len(events),"note":"Google News results are discovery leads and are not automatically promoted to historical facts."},"sources":sources})

    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"Updated {path} for {ad_date} with {len(events)} events, {len(unique_leads)} research leads")


if __name__ == "__main__":
    main()

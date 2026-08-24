#!/usr/bin/env python3
import json, os, re
from datetime import datetime
from urllib.parse import quote
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
CAL_DIR=os.path.join(ROOT,"data","calendar")
HISTORY_DIR=os.path.join(ROOT,"data","itihas")
MONTHS={1:("baishakh","बैशाख"),2:("jestha","जेठ"),3:("ashar","असार"),4:("shrawan","साउन"),5:("bhadra","भदौ"),6:("ashoj","असोज"),7:("kartik","कात्तिक"),8:("mangsir","मंसिर"),9:("poush","पुष"),10:("magh","माघ"),11:("fagun","फागुन"),12:("chaitra","चैत")}

def fetch(url):
    req=Request(url,headers={"User-Agent":"Nepali-Patro-HistoryBot/1.0"})
    with urlopen(req,timeout=25) as r:return r.read().decode("utf-8","replace")
def fetch_json(url):return json.loads(fetch(url))

def today_bs():
    iso=datetime.now(ZoneInfo("Asia/Kathmandu")).strftime("%Y-%m-%d")
    for name in os.listdir(CAL_DIR):
        if not name.endswith(".json"):continue
        try:data=json.load(open(os.path.join(CAL_DIR,name),encoding="utf-8"))
        except Exception:continue
        for d in data.get("days",[]):
            if d.get("ad",{}).get("date")==iso:return d
    raise RuntimeError("BS date not found for "+iso)

def ensure_structure():
    os.makedirs(HISTORY_DIR,exist_ok=True)
    for name in os.listdir(CAL_DIR):
        if not name.endswith(".json"):continue
        try:data=json.load(open(os.path.join(CAL_DIR,name),encoding="utf-8"))
        except Exception:continue
        for d in data.get("days",[]):
            bs=d.get("bs",{});m,day=bs.get("month"),bs.get("day")
            if m not in MONTHS or not day:continue
            slug,nep=MONTHS[m];folder=os.path.join(HISTORY_DIR,slug);os.makedirs(folder,exist_ok=True)
            path=os.path.join(folder,str(int(day))+".json")
            if not os.path.exists(path):
                with open(path,"w",encoding="utf-8") as f:
                    json.dump({"version":2,"bs_month":m,"bs_month_ne":nep,"bs_day":int(day),"events":[],"births":[],"deaths":[],"sources":[],"last_researched":None},f,ensure_ascii=False,indent=2);f.write("\n")

def wikipedia(month,day):
    out=[]
    for kind in ("events","births","deaths"):
        try:p=fetch_json(f"https://en.wikipedia.org/api/rest_v1/feed/onthisday/{kind}/{month:02d}/{day:02d}")
        except Exception as e:print("Wikipedia unavailable:",e);continue
        for item in p.get("events",[]):
            pages=item.get("pages") or [];page=pages[0] if pages else {};text=(item.get("text") or "").strip()
            if text:out.append({"year":item.get("year"),"title":page.get("normalizedtitle") or page.get("title") or text[:100],"summary":text,"type":kind[:-1],"source":"Wikipedia On This Day","url":page.get("content_urls",{}).get("desktop",{}).get("page","")})
    return out

def google_news(month_ne,day):
    q=quote(f"{month_ne} {day} इतिहास नेपाल");url=f"https://news.google.com/rss/search?q={q}&hl=ne&gl=NP&ceid=NP:ne"
    try:xml=fetch(url)
    except Exception as e:print("Google News unavailable:",e);return []
    clean=lambda s:re.sub(r"<[^>]+>"," ",s or "").replace("&amp;","&").strip()
    out=[]
    for block in re.findall(r"<item>(.*?)</item>",xml,re.S|re.I)[:12]:
        t=re.search(r"<title>(.*?)</title>",block,re.S|re.I)
        if not t:continue
        l=re.search(r"<link>(.*?)</link>",block,re.S|re.I);d=re.search(r"<description>(.*?)</description>",block,re.S|re.I)
        out.append({"title":clean(t.group(1)),"summary":clean(d.group(1) if d else ""),"type":"research-lead","source":"Google News search","url":clean(l.group(1) if l else "")})
    return out



def classify(item):
    text=(str(item.get("title",""))+" "+str(item.get("summary",""))).lower()
    if item.get("type")=="birth": cat="जन्म"
    elif item.get("type")=="death": cat="निधन"
    elif any(x in text for x in ["युद्ध","सेना","फौज","battle","war"]): cat="युद्ध तथा सैन्य इतिहास"
    elif any(x in text for x in ["भूकम्प","बाढी","पहिरो","दुर्घटना","earthquake","flood"]): cat="प्राकृतिक विपत्ति"
    elif any(x in text for x in ["राजा","राणा","शाह","सरकार","राष्ट्रपति","संविधान","राजनीति"]): cat="राजनीति"
    elif any(x in text for x in ["मन्दिर","पर्व","संस्कृति","heritage","temple"]): cat="संस्कृति तथा सम्पदा"
    elif any(x in text for x in ["विज्ञान","प्रविधि","technology","science"]): cat="विज्ञान तथा प्रविधि"
    elif item.get("type")=="nepal-history": cat="नेपाल इतिहास"
    else: cat="विश्व इतिहास"
    item["category"]=item.get("category") or cat
    item["importance"]=item.get("importance") or (5 if item["category"] in ("नेपाल इतिहास","युद्ध तथा सैन्य इतिहास") else 3)
    item["confidence"]=item.get("confidence") or ("medium" if item.get("type")=="research-lead" else "high")
    item["sources"]=item.get("sources") or ([{"name":item.get("source"),"url":item.get("url",""),"tier":"discovery"}] if item.get("source") else [])
    return item
def main():
    ensure_structure();d=today_bs();bs=d["bs"];ad=d["ad"]["date"];am,aday=map(int,ad.split("-")[1:]);slug,month_ne=MONTHS[int(bs["month"])]
    path=os.path.join(HISTORY_DIR,slug,str(int(bs["day"]))+".json");data=json.load(open(path,encoding="utf-8"))
    items=[classify(x) for x in data.get("events",[])];seen={re.sub(r"\W+","",str(x.get("title","")).lower()) for x in items}
    verified_candidates=wikipedia(am,aday)\n    research_leads=google_news(month_ne,int(bs["day"]))+source_searches(month_ne,int(bs["day"]))\n    for item in verified_candidates:
        k=re.sub(r"\W+","",str(item.get("title","")).lower())
        if k and k not in seen:items.append(classify(item));seen.add(k)
    data["research_leads"]=research_leads[:30]\n    data.update({"version":2,"bs_year":int(bs["year"]),"bs_month":int(bs["month"]),"bs_month_ne":month_ne,"bs_day":int(bs["day"]),"bs_date":bs.get("display"),"ad_date":ad,"last_researched":datetime.now(ZoneInfo("UTC")).isoformat(),"events":items[:40],"births":[x for x in items if x.get("type")=="birth"][:20],"deaths":[x for x in items if x.get("type")=="death"][:20],"research":{"sources_checked":6,"method":"Wikipedia + Nepal news discovery + source-specific searches","status":"automated review","verified_candidates":len(verified_candidates),"research_leads":len(research_leads)},"sources":[{"name":"Wikipedia On This Day","url":f"https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/{am:02d}/{aday:02d}"},{"name":"Google News","url":f"https://news.google.com/rss/search?q={quote(month_ne+' '+str(bs['day'])+' इतिहास नेपाल')}&hl=ne&gl=NP&ceid=NP:ne"}]})
    with open(path,"w",encoding="utf-8") as f:json.dump(data,f,ensure_ascii=False,indent=2);f.write("\n")
    print("Updated",path,"with",len(items),"items")
if __name__=="__main__":main()

#!/usr/bin/env python3
"""Validate every publishable Nepali Patro dataset before deployment."""
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
NOW = datetime.now(ZoneInfo("Asia/Kathmandu"))
TODAY = NOW.date().isoformat()
ERRORS = []
WARNINGS = []


def load(rel):
    p = ROOT / rel
    if not p.exists():
        ERRORS.append(f"missing: {rel}")
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        ERRORS.append(f"invalid JSON {rel}: {e}")
        return None


def positive(v):
    try:
        return float(v) > 0
    except Exception:
        return False


def check_freshness(label, value, max_age):
    if not value:
        WARNINGS.append(f"{label} fetchedAt is missing")
        return
    try:
        stamp = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if stamp.tzinfo is None:
            stamp = stamp.replace(tzinfo=ZoneInfo("Asia/Kathmandu"))
        age = NOW.astimezone(stamp.tzinfo) - stamp
        if age < timedelta(0):
            WARNINGS.append(f"{label} fetchedAt is in the future")
        elif age > max_age:
            ERRORS.append(f"{label} is stale ({age.total_seconds() / 3600:.1f}h old)")
    except Exception as e:
        ERRORS.append(f"invalid {label} fetchedAt: {e}")


# Daily Rashifal
r = load(f"data/rashifal/{TODAY}.json")
if r:
    if r.get("source") != "Nepali Patro": ERRORS.append("today's Rashifal source is not Nepali Patro")
    signs = r.get("signs") or []
    if len(signs) != 12: ERRORS.append("today's Rashifal does not contain 12 signs")
    if len({x.get("id") for x in signs}) != len(signs): ERRORS.append("duplicate Rashifal sign")
    if any(len(str(x.get("prediction", "")).strip()) < 40 for x in signs): ERRORS.append("short Rashifal prediction")
    check_freshness("daily Rashifal", r.get("fetchedAt"), timedelta(hours=36))

# Weekly Rashifal
weekly_dir = ROOT / "data" / "rashifal-weekly"
if not weekly_dir.exists():
    ERRORS.append("weekly Rashifal dataset directory is missing")
else:
    weekly_files = sorted(weekly_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not weekly_files:
        ERRORS.append("weekly Rashifal dataset contains no JSON")
    else:
        weekly_path = weekly_files[0]
        w = load(str(weekly_path.relative_to(ROOT)))
        if w:
            signs = w.get("signs") or []
            if w.get("schemaVersion") != 2: ERRORS.append("weekly Rashifal schemaVersion must be 2")
            if w.get("source") != "Nepali Patro": ERRORS.append("weekly Rashifal source is not Nepali Patro")
            if len(signs) != 12: ERRORS.append("weekly Rashifal does not contain 12 signs")
            if len({x.get("id") for x in signs}) != 12: ERRORS.append("weekly Rashifal sign IDs are not unique")
            if any(len(str(x.get("prediction", "")).strip()) < 60 for x in signs): ERRORS.append("short weekly Rashifal prediction")
            if not w.get("weekStart") or not w.get("weekEnd"): ERRORS.append("weekly Rashifal week bounds missing")
            try:
                week_start = datetime.fromisoformat(str(w.get("weekStart"))).date()
                week_end = datetime.fromisoformat(str(w.get("weekEnd"))).date()
                if week_end - week_start != timedelta(days=6): ERRORS.append("weekly Rashifal week bounds must span 7 days")
                if NOW.date() < week_start or NOW.date() > week_end + timedelta(days=1):
                    WARNINGS.append(f"weekly Rashifal file is outside the active week: {week_start}..{week_end}")
            except Exception as e:
                ERRORS.append(f"invalid weekly Rashifal week bounds: {e}")
            check_freshness("weekly Rashifal", w.get("fetchedAt"), timedelta(days=10))

# Forex
f = load("feeds/forex.json")
if f:
    if f.get("source") != "Nepal Rastra Bank": ERRORS.append("Forex source mismatch")
    if not f.get("date_ad") or not f.get("date_bs"): ERRORS.append("Forex publication date missing")
    if len(f.get("rates") or []) < 5: ERRORS.append("Forex has fewer than 5 rates")
    for x in f.get("rates") or []:
        if not positive(x.get("buy")) or not positive(x.get("sell")): ERRORS.append(f"invalid Forex rate: {x.get('currency')}")
    check_freshness("Forex", f.get("fetchedAt"), timedelta(days=4))

# Gold/silver
g = load("feeds/gold_silver.json")
if g:
    if not g.get("source"): ERRORS.append("Gold source missing")
    for key in ("fine_gold_tola", "gold_22k_tola", "silver_tola", "fine_gold_10g", "gold_22k_10g", "silver_10g"):
        if not positive((g.get("details") or {}).get(key)): ERRORS.append(f"invalid gold field: {key}")
    check_freshness("Gold/silver", g.get("fetchedAt"), timedelta(days=4))

# Interest rates
i = load("feeds/interest_rates/current.json")
if i:
    banks = i.get("banks") or []
    if not banks: ERRORS.append("bank interest-rate dataset is empty")
    verified = [b for b in banks if b.get("status") == "verified"]
    if not verified: WARNINGS.append("no bank records currently marked verified")

# Itihas
hist = list((ROOT / "data" / "itihas").glob("*/*.json"))
if not hist:
    ERRORS.append("Itihas dataset is empty")
else:
    today_hist = []
    for p in hist:
        try: d=json.loads(p.read_text(encoding="utf-8"))
        except Exception as e: ERRORS.append(f"invalid Itihas JSON {p}: {e}"); continue
        if d.get("ad_date") == TODAY: today_hist.append(d)
        for key in ("events", "births", "deaths", "research_leads"):
            if not isinstance(d.get(key), list): ERRORS.append(f"{p}: {key} must be a list")
    if len(today_hist) != 1: ERRORS.append(f"expected exactly one Itihas record for {TODAY}, found {len(today_hist)}")

if WARNINGS:
    print("WARNINGS:")
    print("\n".join(f"- {x}" for x in WARNINGS))
if ERRORS:
    print("ERRORS:")
    print("\n".join(f"- {x}" for x in ERRORS))
    sys.exit(1)
print(f"ALL DATASETS HEALTHY for {TODAY}")

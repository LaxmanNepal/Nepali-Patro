#!/usr/bin/env python3
"""Validate every publishable Nepali Patro dataset before deployment."""
import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
TODAY = datetime.now(ZoneInfo("Asia/Kathmandu")).date().isoformat()
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

# Rashifal
r = load(f"data/rashifal/{TODAY}.json")
if r:
    if r.get("source") != "Nepali Patro": ERRORS.append("today's Rashifal source is not Nepali Patro")
    signs = r.get("signs") or []
    if len(signs) != 12: ERRORS.append("today's Rashifal does not contain 12 signs")
    if len({x.get("id") for x in signs}) != len(signs): ERRORS.append("duplicate Rashifal sign")
    if any(len(str(x.get("prediction", "")).strip()) < 40 for x in signs): ERRORS.append("short Rashifal prediction")

# Forex
f = load("feeds/forex.json")
if f:
    if f.get("source") != "Nepal Rastra Bank": ERRORS.append("Forex source mismatch")
    if not f.get("date_ad") or not f.get("date_bs"): ERRORS.append("Forex publication date missing")
    if len(f.get("rates") or []) < 5: ERRORS.append("Forex has fewer than 5 rates")
    for x in f.get("rates") or []:
        if not positive(x.get("buy")) or not positive(x.get("sell")): ERRORS.append(f"invalid Forex rate: {x.get('currency')}")

# Gold/silver
g = load("feeds/gold_silver.json")
if g:
    if not g.get("source"): ERRORS.append("Gold source missing")
    for key in ("fine_gold_tola", "gold_22k_tola", "silver_tola", "fine_gold_10g", "gold_22k_10g", "silver_10g"):
        if not positive((g.get("details") or {}).get(key)): ERRORS.append(f"invalid gold field: {key}")

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

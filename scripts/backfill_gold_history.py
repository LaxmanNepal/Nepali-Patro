import json
import re
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta
from pathlib import Path

from update_gold_rates import parse_official

OUT = Path("data/gold-price-history.json")
FIELDS = ("fine_gold_tola", "gold_22k_tola", "silver_tola", "fine_gold_10g", "gold_22k_10g", "silver_10g")
CDX = "https://web.archive.org/cdx/search/cdx"
TARGET = "https://negosida.org/"
MAX_DAYS = 365
MAX_WORKERS = 8


def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": "Nepali-Patro-GoldBackfill/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def snapshot_list(start, end):
    params = {
        "url": "negosida.org/",
        "output": "json",
        "fl": "timestamp,original,digest,statuscode,mimetype",
        "filter": "statuscode:200",
        "collapse": "digest",
        "from": start.strftime("%Y%m%d"),
        "to": end.strftime("%Y%m%d"),
        "limit": "1000",
    }
    raw = fetch(CDX + "?" + urllib.parse.urlencode(params))
    rows = json.loads(raw)
    if not rows:
        return []
    header = rows[0]
    return [dict(zip(header, row)) for row in rows[1:] if len(row) == len(header) and row[0].isdigit()]


def parse_snapshot(row):
    timestamp = row["timestamp"]
    url = f"https://web.archive.org/web/{timestamp}id_/{row['original']}"
    try:
        html = fetch(url)
        details, ad_date, bs_date = parse_official(html)
    except Exception as exc:
        return None, f"{timestamp}: {exc}"

    snap_day = datetime.strptime(timestamp[:8], "%Y%m%d").date()
    parsed_day = date.fromisoformat(ad_date)
    if abs((parsed_day - snap_day).days) > 3:
        return None, f"{timestamp}: date mismatch snapshot={snap_day} source={parsed_day}"

    record = {
        "date_ad": ad_date,
        "date_bs": bs_date,
        "prices": details,
        "availability": {k: True for k in FIELDS},
        "source": "NEGOSIDA",
        "provenance": {
            "type": "archived-official-source",
            "sourceUrl": TARGET,
            "archiveUrl": url,
            "snapshot": timestamp,
        },
    }
    return record, None


def merge(records):
    existing = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    by_date = {r["date_ad"]: r for r in existing.get("records", []) if r.get("date_ad")}
    added = 0
    replaced = 0
    for record in records:
        old = by_date.get(record["date_ad"])
        if old is None:
            by_date[record["date_ad"]] = record
            added += 1
        elif any(old.get("prices", {}).get(k) is None for k in FIELDS):
            by_date[record["date_ad"]] = record
            replaced += 1
    rows = [by_date[k] for k in sorted(by_date)][-365:]
    payload = {
        "schema": "gold-price-history/v1",
        "source": existing.get("source", "Nepal Gold and Silver Dealers Association (NEGOSIDA)"),
        "sourceUrl": existing.get("sourceUrl", TARGET),
        "generatedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "recordCount": len(rows),
        "fields": list(FIELDS),
        "records": rows,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return added, replaced, len(rows)


def main():
    end = date.today()
    start = end - timedelta(days=MAX_DAYS - 1)
    rows = snapshot_list(start, end)
    print(f"Wayback candidates: {len(rows)}")
    records, failures = [], []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = [pool.submit(parse_snapshot, row) for row in rows]
        for future in as_completed(futures):
            record, error = future.result()
            if record:
                records.append(record)
            elif error:
                failures.append(error)
    added, replaced, total = merge(records)
    print(f"Backfill complete: candidates={len(rows)} accepted={len(records)} added={added} repaired={replaced} total={total}")
    if failures:
        print(f"Skipped snapshots: {len(failures)}")


if __name__ == "__main__":
    main()

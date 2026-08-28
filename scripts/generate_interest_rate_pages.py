"""Generate static, search-friendly Nepal bank interest-rate pages from JSON data."""
from __future__ import annotations

import html
import json
from datetime import datetime
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, tostring

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "feeds" / "interest_rates" / "current.json"
REGISTRY = ROOT / "feeds" / "interest_rates" / "banks.json"
OUT = ROOT / "interest-rate"
BASE = "https://apps.laxmannepal.com.np/Nepali-Patro"


def esc(value) -> str:
    return html.escape(str(value))


def table(rows: list[dict]) -> str:
    if not rows:
        return '<p class="notice">अहिले प्रमाणित दर उपलब्ध छैन। आधिकारिक स्रोतबाट दैनिक जाँच भइरहेको छ।</p>'
    out = ['<table><thead><tr><th>Category</th><th>Product / Description</th><th>Tenure</th><th>Rate</th><th>Source</th></tr></thead><tbody>']
    for r in rows:
        out.append('<tr><td>{}</td><td>{}</td><td>{}</td><td><strong>{}%</strong></td><td>Official</td></tr>'.format(
            esc(r.get("category", "Other")).replace("_", " ").title(),
            esc(r.get("label", "")), esc(r.get("tenure") or "—"), esc(r.get("rate", "—"))))
    return "".join(out) + "</tbody></table>"


def page(title: str, description: str, body: str, canonical: str) -> str:
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title><meta name="description" content="{esc(description)}"><link rel="canonical" href="{esc(canonical)}"><style>body{{font-family:system-ui,-apple-system,sans-serif;max-width:1100px;margin:auto;padding:24px;line-height:1.6;color:#202020}}a{{color:#a00}}table{{border-collapse:collapse;width:100%;overflow:hidden}}th,td{{border:1px solid #ddd;padding:10px;text-align:left}}th{{background:#f5f5f5}}.notice{{padding:16px;background:#fff7ed;border-left:4px solid #f59e0b}}.meta{{color:#666}}.verified{{color:#087f23;font-weight:700}}.cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}}.card{{border:1px solid #ddd;border-radius:12px;padding:14px}}footer{{margin-top:40px;color:#666}}</style></head><body><header><a href="{BASE}/">नेपाली पात्रो</a> · <a href="{BASE}/interest-rate/">Interest Rates</a></header><main>{body}</main><footer>Data is collected from official bank sources. Always verify the rate with the bank before making a financial decision.</footer></body></html>'''


def main() -> int:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    banks_by_id = {b["id"]: b for b in registry["banks"]}

    bank_items = {b["bankId"]: b for b in data.get("banks", [])}
    cards = []
    sitemap_urls = [f"{BASE}/interest-rate/"]
    for bank in registry["banks"]:
        bid = bank["id"]
        item = bank_items.get(bid, {})
        rates = item.get("rates", [])
        status = item.get("status", "source_to_verify")
        href = f"{BASE}/interest-rate/bank/{bid}.html"
        sitemap_urls.append(href)
        cards.append(f'<div class="card"><h2><a href="{href}">{esc(bank["name"])}</a></h2><p class="meta">{esc(bank["category"])}</p><p>Status: <strong>{esc(status)}</strong></p><a href="{href}">View rates →</a></div>')
        body = f'''<h1>{esc(bank["name"])} Interest Rate in Nepal</h1><p class="meta">Current interest rates, savings and fixed deposit information. Last fetched: {esc(item.get("fetchedAt", "Not yet fetched"))}</p><p class="meta">Official source: <a href="{esc(bank.get("rateSourceUrl", bank.get("officialUrl")))}" rel="nofollow noopener">{esc(bank.get("rateSourceUrl", bank.get("officialUrl")))}</a></p><p class="{'verified' if status == 'verified' else ''}">Data status: {esc(status)}</p>{table(rates)}<h2>About {esc(bank["name"])} interest rates</h2><p>This page tracks publicly published interest-rate information from the bank's official source. Rates can change during the month; the effective date published by the bank is authoritative.</p>'''
        (OUT / "bank").mkdir(exist_ok=True)
        (OUT / "bank" / f"{bid}.html").write_text(page(f"{bank['name']} Interest Rate Nepal 2026", f"Latest {bank['name']} interest rates in Nepal, including savings and fixed deposit rates, verified from the official source.", body, href), encoding="utf-8")

    updated = data.get("updatedAt") or "Not yet fetched"
    body = f'''<h1>Nepal Bank Interest Rates – Latest Interest Rates of Nepali Banks</h1><p>Compare published interest rates of Nepali banks, including savings and fixed deposit rates. Data is checked automatically against official bank sources.</p><p class="meta">Dataset updated: {esc(updated)} · Timezone: Nepal (Asia/Kathmandu)</p><div class="cards">{"".join(cards)}</div><h2>How we verify interest rates</h2><p>We prioritize each bank's official published interest-rate page. Extracted values are normalized and checked before they are eligible for comparison. When a source cannot be safely parsed, the page shows a review status instead of inventing a number.</p><h2>Search Nepal bank interest rates</h2><p>Use this page to compare Nepal bank interest rates, Nepali bank FD rates, fixed deposit interest rates in Nepal and savings account interest rates.</p>'''
    (OUT / "index.html").write_text(page("Nepal Bank Interest Rates 2026 – Nepali Banks FD & Savings Rates", "Latest Nepal bank interest rates, Nepali bank fixed deposit rates, savings rates and bank-by-bank comparisons from official sources.", body, f"{BASE}/interest-rate/"), encoding="utf-8")

    # Dedicated sitemap for the interest-rate section.
    urlset = Element("urlset", {"xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9"})
    for url in sitemap_urls:
        u = SubElement(urlset, "url")
        SubElement(u, "loc").text = url
        SubElement(u, "changefreq").text = "daily"
        SubElement(u, "priority").text = "0.8" if url.endswith("interest-rate/") else "0.7"
    (OUT / "sitemap-interest-rates.xml").write_bytes(b'<?xml version="1.0" encoding="UTF-8"?>' + tostring(urlset, encoding="utf-8"))
    print(f"Generated interest-rate hub and {len(registry['banks'])} bank pages")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

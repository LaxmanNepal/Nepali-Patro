"""Generate static, search-friendly bank interest-rate pages.

The hand-designed interest-rate/index.html is intentionally never overwritten.
Only individual bank pages and the dedicated sitemap are generated here.
"""
from __future__ import annotations

import html
import json
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, tostring

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "feeds" / "interest_rates" / "current.json"
REGISTRY = ROOT / "feeds" / "interest_rates" / "banks.json"
OUT = ROOT / "interest-rate"
BASE = "https://apps.laxmannepal.com.np/Nepali-Patro"


def esc(value) -> str:
    return html.escape(str(value))


def jsonld(obj: dict) -> str:
    return (
        '<script type="application/ld+json">'
        + json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        + "</script>"
    )


def table(rows: list[dict]) -> str:
    if not rows:
        return (
            '<p class="notice">अहिले प्रमाणित दर उपलब्ध छैन। '
            "आधिकारिक स्रोतबाट दैनिक जाँच भइरहेको छ।</p>"
        )

    out = [
        "<table><thead><tr>"
        "<th>Category</th><th>Product / Description</th>"
        "<th>Tenure</th><th>Rate</th><th>Source</th>"
        "</tr></thead><tbody>"
    ]
    for r in rows:
        out.append(
            "<tr><td>{}</td><td>{}</td><td>{}</td>"
            "<td><strong>{}%</strong></td><td>Official</td></tr>".format(
                esc(r.get("category", "Other")).replace("_", " ").title(),
                esc(r.get("label", "")),
                esc(r.get("tenure") or "—"),
                esc(r.get("rate", "—")),
            )
        )
    return "".join(out) + "</tbody></table>"


def page(
    title: str,
    description: str,
    body: str,
    canonical: str,
    structured: dict | None = None,
) -> str:
    ld = jsonld(structured) if structured else ""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<link rel="canonical" href="{esc(canonical)}">
{ld}
<style>
body{{font-family:system-ui,-apple-system,sans-serif;max-width:1100px;margin:auto;padding:24px;line-height:1.6;color:#202020}}
a{{color:#a00}}
table{{border-collapse:collapse;width:100%;overflow:hidden}}
th,td{{border:1px solid #ddd;padding:10px;text-align:left}}
th{{background:#f5f5f5}}
.notice{{padding:16px;background:#fff7ed;border-left:4px solid #f59e0b}}
.meta{{color:#666}}
.verified{{color:#087f23;font-weight:700}}
footer{{margin-top:40px;color:#666}}
</style>
</head>
<body>
<header><a href="{BASE}/">नेपाली पात्रो</a> · <a href="{BASE}/interest-rate/">Interest Rates</a></header>
<main>{body}</main>
<footer>Data is collected from official bank sources. Always verify the rate with the bank before making a financial decision.</footer>
</body>
</html>"""


def main() -> int:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)

    bank_items = {b["bankId"]: b for b in data.get("banks", [])}
    sitemap_urls = [f"{BASE}/interest-rate/"]
    bank_dir = OUT / "bank"
    bank_dir.mkdir(exist_ok=True)

    for bank in registry["banks"]:
        bid = bank["id"]
        item = bank_items.get(bid, {})
        rates = item.get("rates", [])
        status = item.get("status", "source_to_verify")
        href = f"{BASE}/interest-rate/bank/{bid}.html"
        sitemap_urls.append(href)

        structured = {
            "@context": "https://schema.org",
            "@type": "Dataset",
            "name": f"{bank['name']} Interest Rates Nepal",
            "description": (
                f"Published interest-rate information for {bank['name']} "
                "from its official source."
            ),
            "url": href,
            "inLanguage": ["en", "ne"],
            "publisher": {"@type": "Organization", "name": "Nepali Patro"},
            "isBasedOn": bank.get(
                "rateSourceUrl",
                bank.get("officialUrl"),
            ),
        }

        body = f"""<h1>{esc(bank["name"])} Interest Rate in Nepal</h1>
<p class="meta">Current interest rates, savings and fixed deposit information. Last fetched: {esc(item.get("fetchedAt", "Not yet fetched"))}</p>
<p class="meta">Official source: <a href="{esc(bank.get("rateSourceUrl", bank.get("officialUrl")))}" rel="nofollow noopener">Official bank rate page</a></p>
<p class="{'verified' if status == 'verified' else ''}">Data status: {esc(status)}</p>
{table(rates)}
<h2>About {esc(bank["name"])} interest rates</h2>
<p>This page tracks publicly published interest-rate information from the bank's official source. The bank's effective date is authoritative.</p>"""

        (bank_dir / f"{bid}.html").write_text(
            page(
                f"{bank['name']} Interest Rate Nepal 2026",
                (
                    f"Latest {bank['name']} interest rates in Nepal, including "
                    "savings and fixed deposit rates, verified from the official source."
                ),
                body,
                href,
                structured,
            ),
            encoding="utf-8",
        )

    urlset = Element(
        "urlset",
        {"xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9"},
    )
    for url in sitemap_urls:
        u = SubElement(urlset, "url")
        SubElement(u, "loc").text = url
        SubElement(u, "changefreq").text = "daily"
        SubElement(u, "priority").text = (
            "0.8" if url.endswith("interest-rate/") else "0.7"
        )

    (OUT / "sitemap-interest-rates.xml").write_bytes(
        b'<?xml version="1.0" encoding="UTF-8"?>'
        + tostring(urlset, encoding="utf-8")
    )

    print(
        "Generated "
        f"{len(registry['banks'])} bank pages without overwriting the hub UI"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

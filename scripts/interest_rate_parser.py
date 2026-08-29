"""Robust HTML-table parser for Nepal bank interest-rate pages."""
import re
from bs4 import BeautifulSoup

RATE_RE = re.compile(r"(?<!\d)(\d+(?:\.\d+)?)\s*%")

def parse_rate(value: str):
    m = RATE_RE.search(value.replace(",", ""))
    return float(m.group(1)) if m else None

def parse_html_tables(html: str):
    soup = BeautifulSoup(html, "html.parser")
    records = []
    for ti, table in enumerate(soup.find_all("table")):
        rows = table.find_all("tr")
        headers = [c.get_text(" ", strip=True) for c in rows[0].find_all(["th", "td"])] if rows else []
        for ri, row in enumerate(rows):
            cells = [c.get_text(" ", strip=True) for c in row.find_all(["th", "td"])]
            if not cells:
                continue
            for ci, cell in enumerate(cells):
                rate = parse_rate(cell)
                if rate is None or not 0 <= rate <= 100:
                    continue
                records.append({"tableIndex":ti,"rowIndex":ri,"columnIndex":ci,"label":cells[0],"columnLabel":headers[ci] if ci < len(headers) else None,"cells":cells,"rate":rate,"raw":" | ".join(cells)})
    return records

def validate_rates(records):
    return [r for r in records if isinstance(r.get("rate"),(int,float)) and 0 <= r["rate"] <= 100]

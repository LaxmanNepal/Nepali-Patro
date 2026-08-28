"""Conservative parser for bank interest-rate HTML tables.

The parser extracts only rows that contain an explicit rate percentage and
keeps the original label for auditability. It does not infer missing tenures
or convert ambiguous numbers into rates.
"""
import re
from bs4 import BeautifulSoup

RATE_RE = re.compile(r"(?<!\d)(\d+(?:\.\d+)?)\s*%")


def parse_rate(value: str):
    match = RATE_RE.search(value.replace(",", ""))
    return float(match.group(1)) if match else None


def parse_html_tables(html: str):
    soup = BeautifulSoup(html, "html.parser")
    records = []
    for table_index, table in enumerate(soup.find_all("table")):
        rows = table.find_all("tr")
        for row_index, row in enumerate(rows):
            cells = [c.get_text(" ", strip=True) for c in row.find_all(["th", "td"])]
            if not cells:
                continue
            joined = " | ".join(cells)
            rate = parse_rate(joined)
            if rate is None:
                continue
            records.append({
                "tableIndex": table_index,
                "rowIndex": row_index,
                "label": cells[0],
                "cells": cells,
                "rate": rate,
                "raw": joined,
            })
    return records


def validate_rates(records):
    """Reject impossible values; preserve ambiguous rows for review."""
    valid = []
    for record in records:
        rate = record["rate"]
        if 0 <= rate <= 100:
            valid.append(record)
    return valid

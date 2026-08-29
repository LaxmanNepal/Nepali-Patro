"""Bank-specific parsers for official interest-rate pages.

These parsers use the rendered text returned by each official page and label
rates only when the surrounding section identifies the account type. They are
kept separate from fetching so source-layout changes can be fixed safely.
"""
import re

PCT = re.compile(r"(?<![\d.])\d{1,2}(?:\.\d{1,4})?\s*%")


def pct(value):
    return f"{float(value.replace('%', '').strip()):g}%"


def nabil(text):
    rates = []
    section = ""
    for raw in text.splitlines():
        line = " ".join(raw.split())
        if not line:
            continue
        upper = line.upper()
        if "SAVINGS DEPOSITS" in upper:
            section = "savings"
        elif "FIXED DEPOSIT-NPR" in upper:
            section = "fixed-deposit"
        elif "SAVINGS DEPOSIT-FCY" in upper:
            section = "fcy-savings"
        elif "FIXED DEPOSIT-FCY" in upper:
            section = "fcy-fixed-deposit"
        elif "CALL DEPOSIT-FCY" in upper:
            section = "call-deposit"
        matches = PCT.findall(line)
        if matches and section in {"savings", "fixed-deposit", "fcy-savings", "fcy-fixed-deposit", "call-deposit"}:
            for m in matches:
                rates.append({"accountType": section, "label": line[:140], "rate": pct(m), "unit": "per-annum"})
    return rates


def nmb(text):
    rates = []
    section = ""
    for raw in text.splitlines():
        line = " ".join(raw.split())
        upper = line.upper()
        if "SAVING DEPOSIT (LCY)" in upper:
            section = "savings"
        elif "FIXED DEPOSIT (NPR)" in upper:
            section = "fixed-deposit"
        elif "INTEREST RATE OF FOREIGN CURRENCY" in upper:
            section = "fcy"
        elif "INTEREST RATE ON LOAN" in upper:
            section = "loan"
        matches = PCT.findall(line)
        if matches and section:
            for m in matches:
                rates.append({"accountType": section, "label": line[:140], "rate": pct(m), "unit": "per-annum"})
    return rates


def global_ime(text):
    rates = []
    section = ""
    for raw in text.splitlines():
        line = " ".join(raw.split())
        upper = line.upper()
        if "NPR SAVING DEPOSIT" in upper:
            section = "savings"
        elif "FIXED DEPOSIT" in upper:
            section = "fixed-deposit"
        elif "LOAN" in upper and "INTEREST" in upper:
            section = "loan"
        matches = PCT.findall(line)
        if matches and section:
            for m in matches:
                rates.append({"accountType": section, "label": line[:140], "rate": pct(m), "unit": "per-annum"})
    return rates

PARSERS = {
    "nabil-bank": nabil,
    "nmb-bank": nmb,
    "global-ime-bank": global_ime,
}

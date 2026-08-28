from scripts.interest_rate_adapters import parse_nabil, parse_global_ime


NABIL_FIXTURE = """
<html><body>
<h2>A. SAVINGS DEPOSITS - NPR</h2>
<table><tr><th>Product</th><th>Rate</th></tr>
<tr><td>Nabil General Savings Account</td><td>2.75</td></tr>
<tr><td>Nabil Premium Remittance Savings Account</td><td>3.80</td></tr>
</table>
<h2>B FIXED DEPOSIT-NPR</h2>
<table><tr><th>Tenor</th><th>Rate</th></tr>
<tr><td>Above 5 to 10 years</td><td>4.00%</td></tr>
<tr><td>Above 10 years</td><td>4.55%</td></tr>
</table>
<div>Effective From : 1st Bhadra 2083</div>
</body></html>
"""

GLOBAL_IME_FIXTURE = """
<html><body>
<h2>Interest Rates on Deposits</h2>
<table><tr><th>NPR Saving Deposit</th><th>Rates Per Annum</th></tr>
<tr><td>Global Normal Savings</td><td>2.75%</td></tr>
</table>
<h2>Interest Rates on Fixed Deposits</h2>
<table><tr><th>NPR Fixed Deposit</th><th>Rates Per Annum</th></tr>
<tr><td>3 Months to 1 Year</td><td>2.76%</td></tr>
</table>
<div>Interest Rates effective from Srawan 1, 2083</div>
</body></html>
"""


def test_nabil_parser_extracts_savings_and_fd():
    result = parse_nabil(NABIL_FIXTURE)
    assert result["verification"]["hasInterestRateRows"]
    assert result["verification"]["ratesWithinBounds"]
    assert result["rowCount"] == 4
    assert any(row["section"] == "savings" and row["rate"] == 2.75 for row in result["rows"])
    assert any(row["section"] == "fixed_deposit" and row["rate"] == 4.55 for row in result["rows"])


def test_global_ime_parser_extracts_supported_rows():
    result = parse_global_ime(GLOBAL_IME_FIXTURE)
    assert result["rowCount"] == 2
    assert {row["section"] for row in result["rows"]} == {"savings", "fixed_deposit"}

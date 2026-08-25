"""Kundali calculation backend.

This module is deliberately dependency-light. In production, install the
`pyswisseph` package and expose calculate_kundali through the project's API
server. Swiss Ephemeris is initialized once at process startup and never per
request.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

try:
    import swisseph as swe
except ImportError:  # keep static/site builds importable
    swe = None

SIDEREAL = {
    "lahiri": getattr(swe, "SIDM_LAHIRI", 1) if swe else 1,
    "raman": getattr(swe, "SIDM_RAMAN", 3) if swe else 3,
    "krishnamurti": getattr(swe, "SIDM_KRISHNAMURTI", 5) if swe else 5,
}
PLANETS = {
    "Sun": 0, "Moon": 1, "Mars": 4, "Mercury": 2,
    "Jupiter": 5, "Venus": 3, "Saturn": 6,
}
SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
         "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
    "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
    "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana",
    "Dhanishtha", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]


def _require_engine() -> None:
    if swe is None:
        raise RuntimeError("Swiss Ephemeris backend is not installed")


def init_engine() -> None:
    """Initialize Swiss Ephemeris once at backend startup."""
    _require_engine()
    swe.set_ephe_path("")


def _sign(longitude: float) -> tuple[str, int, float]:
    longitude %= 360.0
    index = int(longitude // 30.0)
    return SIGNS[index], index + 1, longitude % 30.0


def _nakshatra(longitude: float) -> tuple[str, int]:
    span = 360.0 / 27.0
    n = int((longitude % 360.0) / span)
    pada = int(((longitude % 360.0) - n * span) / (span / 4.0)) + 1
    return NAKSHATRAS[min(n, 26)], min(pada, 4)


def calculate_kundali(date: str, time: str, latitude: float, longitude: float,
                      timezone_offset_hours: float = 5.75,
                      ayanamsa: str = "lahiri", node: str = "mean") -> dict[str, Any]:
    _require_engine()
    init_engine()
    swe.set_sid_mode(SIDEREAL.get(ayanamsa, SIDEREAL["lahiri"]))

    local = datetime.fromisoformat(f"{date}T{time}")
    utc = local.replace(tzinfo=timezone.utc).timestamp() - timezone_offset_hours * 3600
    utc_dt = datetime.fromtimestamp(utc, tz=timezone.utc)
    hour = utc_dt.hour + utc_dt.minute / 60 + utc_dt.second / 3600
    jd = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, hour)

    flags = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED
    planets: dict[str, Any] = {}
    for name, pid in PLANETS.items():
        values, _ = swe.calc_ut(jd, pid, flags)
        lon = values[0] % 360
        sign, sign_number, degree = _sign(lon)
        nak, pada = _nakshatra(lon)
        planets[name] = {
            "longitude": lon, "sign": sign, "signNumber": sign_number,
            "degree": degree, "retrograde": values[3] < 0,
            "nakshatra": nak, "pada": pada,
        }

    node_id = swe.TRUE_NODE if node == "true" else swe.MEAN_NODE
    node_values, _ = swe.calc_ut(jd, node_id, flags)
    rahu = node_values[0] % 360
    ketu = (rahu + 180) % 360
    for name, lon in (("Rahu", rahu), ("Ketu", ketu)):
        sign, sign_number, degree = _sign(lon)
        nak, pada = _nakshatra(lon)
        planets[name] = {
            "longitude": lon, "sign": sign, "signNumber": sign_number,
            "degree": degree, "retrograde": True,
            "nakshatra": nak, "pada": pada,
        }

    houses, ascmc = swe.houses_ex(jd, latitude, longitude, b'W', swe.FLG_SIDEREAL)
    asc = ascmc[0] % 360
    asc_sign, asc_num, asc_degree = _sign(asc)
    return {
        "engine": "Swiss Ephemeris",
        "engineVersion": getattr(swe, "version", "unknown"),
        "julianDay": jd,
        "utc": utc_dt.isoformat(),
        "ayanamsa": ayanamsa,
        "node": node,
        "ascendant": {"longitude": asc, "sign": asc_sign, "signNumber": asc_num, "degree": asc_degree},
        "houses": [float(x) for x in houses],
        "planets": planets,
    }

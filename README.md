# Nepali Patro 🇳🇵

A standalone static Nepali Bikram Sambat calendar application by Laxman Nepal.

## Product URL

`https://apps.laxmannepal.com.np/Nepali-Patro/`

## Canonical feature routes

- `/calendar/` — complete calendar, BS 2040–2100
- `/panchanga/` — detailed daily Panchanga
- `/parba/` — festivals and holidays
- `/saith/` — Saait / Shubh Din information
- `/rashifal/` — dedicated 12-sign daily and weekly Rashifal
- `/news/` — dedicated Nepali News Center with search/filter/sort
- `/converter/` — BS ↔ AD converter, using the package-supported 1970–2100 range
- `/itihas-aaja/` — today's history, culture and heritage
- `/gold-price/` — Nepal gold/silver rates and charts

The homepage `/` is the only all-in-one dashboard. Feature pages do not reuse the homepage renderer.

## Compatibility aliases

Legacy routes redirect to their canonical pages:

- `/patro/` → `/calendar/`
- `/panchang/` → `/panchanga/`
- `/festivals/` → `/parba/`
- `/saait/` → `/saith/`

## Calendar and Panchanga data

The detailed static calendar/Panchanga dataset is generated for **BS 2040 through BS 2100** inclusive using `nepali-calendar-panchang`.

Each generated day includes BS/AD dates, weekday, Nepal Sambat, tithi, paksha, nakshatra, yoga, karana, rashi, sunrise/sunset, moon information, Rahu Kaal data, festivals/events and holiday flags where supplied by the upstream dataset.

## Converter

A separate compact conversion index is generated for the full supported range of the underlying package (**BS 1970–2100**). The converter falls back to the detailed 2040–2100 index until the broader generated index is available.

## Principles

- No runtime calendar API dependency
- GitHub Actions generates static data
- Feature pages are isolated from the homepage
- Absolute CSS/JavaScript/data URLs on standalone pages
- Mobile-first responsive UI
- GitHub-hosted static news data; browsers do not fetch RSS feeds directly
- Gold data collected by GitHub Actions from the configured Nepal source
- Automated validation checks data integrity, route isolation, converter round trips, aliases and JavaScript syntax

## Deployment

GitHub Actions generates and validates the data, then deploys the static site to GitHub Pages. All repository-writing workflows share a concurrency group so generated-data, news and gold-price commits do not race each other.

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
- `/converter/` — BS ↔ AD converter
- `/itihas-aaja/` — today's history, culture and heritage
- `/gold-price/` — Nepal gold/silver rates and charts
- `/forex/` — Nepal Rastra Bank foreign-exchange rates
- `/nepal-government/` — Nepal government website directory

The homepage `/` is the all-in-one dashboard. Feature pages use isolated renderers and shared shell components rather than the homepage renderer.

## Data reliability

Live and generated datasets are treated as untrusted external input until validated.

- Daily and weekly Rashifal are schema-checked and freshness-checked.
- Forex and gold/silver feeds have freshness limits.
- Itihas requires exactly one record for the current AD date.
- Calendar data is validated for duplicate dates, required Panchanga fields and BS ↔ AD round trips.
- JavaScript syntax, JSON, HTML accessibility sanity and CSS structural integrity are checked in CI.
- Live refresh jobs isolate independent upstream failures and publish a GitHub Actions status summary.
- Automated repository writers use a shared concurrency queue to reduce `main` branch races.

## Calendar and Panchanga data

The detailed static calendar/Panchanga dataset is generated for **BS 2040 through BS 2100** inclusive using `nepali-calendar-panchang`.

Each generated day includes BS/AD dates, weekday, Nepal Sambat, tithi, paksha, nakshatra, yoga, karana, rashi, sunrise/sunset, moon information, Rahu Kaal data, festivals/events and holiday flags where supplied by the upstream dataset.

## Converter

The converter supports the range provided by the underlying calendar package and uses generated indexes for fast lookup where available.

## Principles

- No runtime calendar API dependency
- GitHub Actions generates and validates static data
- Feature pages are isolated from the homepage
- Absolute CSS/JavaScript/data URLs on standalone pages
- Mobile-first responsive UI
- GitHub-hosted static news data; browsers do not fetch RSS feeds directly
- External data is validated before publication
- Health metadata never suppresses the underlying catalog
- Generated files should be deterministic and disposable

## Deployment

GitHub Actions generates, validates and commits data, then GitHub Pages deploys the published static site. Data-writing workflows use a shared writer concurrency strategy to minimize concurrent `main` updates.

For the complete system/data-flow rules, see `docs/ARCHITECTURE.md`.

## Additional feature pages

- `/calculator/` — simple calculator
- `/namakaran/` — naming suggestions
- `/regional-time/` — world and regional time
- `/sankalpa/` — Sankalpa text helper
- `/timeline/` — personal date timeline
- `/tithi-finder/` — simple Tithi finder
- `/vedic-clock/` — traditional time display
- `/eclipse/` — eclipse information
- `/print-calendar/` — print-friendly monthly calendar
- `/personal-rashifal/` — personalised horoscope guidance
- `/dharma/` — religion and culture hub
- `/events/` — personal events organiser
- `/radio/` — radio/live audio section
- `/jyotish/` — Jyotish tools

Unit Converter was intentionally excluded.

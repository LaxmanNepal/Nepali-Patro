# Nepali Patro 🇳🇵

A standalone, static Nepali Bikram Sambat calendar application by Laxman Nepal.

## Product URL

`https://apps.laxmannepal.com.np/Nepali-Patro/`

## Feature routes

- `/patro/` — full Nepali Patro
- `/calendar/` — calendar alias
- `/panchanga/` — Panchanga
- `/parba/` — festivals and holidays
- `/saith/` — Saait / Shubh Din
- `/rashifal/` — 12-sign Rashifal
- `/news/` — Nepali News Center
- `/converter/` — BS ↔ AD converter

Aliases such as `/panchang/`, `/festivals/`, and `/saait/` are also generated for compatibility.

## Calendar range

The static data generator builds **BS 2040 through BS 2100** inclusive. The Panchang engine supports this range and the site creates a complete date/conversion index for the generated years.

## Principles

- No runtime calendar API dependency
- GitHub Actions builds and validates static data
- Mobile-first responsive UI
- Exact BS ↔ AD lookup from generated conversion data
- Panchang data is generated from the MIT-licensed `nepali-calendar-panchang` package during build
- News is collected into static JSON by GitHub Actions; the browser does not need to contact RSS feeds
- Nepali-only news filtering is applied before publication
- Local-only theme/reminder/note features can use browser storage
- Original UI and branding

## Validation

Every deployment validates:

- all 61 BS years
- every generated day
- duplicate BS dates
- duplicate AD dates
- conversion-index count
- required route pages
- JavaScript syntax
- news JSON structure

The deployment artifact excludes development dependencies, scripts, Git metadata, and package-manager files.

## Deployment

GitHub Actions deploys the generated static site to GitHub Pages on pushes to `main`.

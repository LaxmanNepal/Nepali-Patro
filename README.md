# Nepali Patro 🇳🇵

A standalone, static Nepali Bikram Sambat calendar application by Laxman Nepal.

## Product URL

`https://apps.laxmannepal.com.np/nepali-patro/`

## Principles

- No runtime weather/calendar/horoscope API dependency
- Static GitHub-hosted architecture
- Mobile-first responsive UI
- BS calendar and BS ↔ AD conversion
- Panchang/event data kept deterministic
- Local-only theme/reminder/note features can use browser storage
- Original UI and branding

## Current scope

The repository currently contains the production UI foundation and verified 2083 BS calendar mapping for the current year, with Panchang/event data structured for expansion. Astronomical values must only be added from a validated dataset; the frontend intentionally does not invent missing values.

## Deployment

GitHub Actions deploys the repository to GitHub Pages on pushes to `main`. Configure the repository's Pages/custom-domain settings as required for the `apps.laxmannepal.com.np/nepali-patro/` route.

## Data architecture

The long-term data model is year-based:

```text
data/calendar/2083.json
data/calendar/2084.json
data/panchang/2083.json
data/festivals/festivals.json
data/holidays/holidays.json
data/saait/saait.json
data/rashifal/2083.json
```

Do not replace missing astronomical values with guesses. Validate data before publishing.

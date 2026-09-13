# Architecture Inventory — Phase 5A

Baseline captured against the Phase 4 `main` state.

## Purpose

This document is the migration map for Architecture Consolidation & Reliability. It intentionally records duplication before anything is deleted.

## Current hotspots

| Area | Current state | Phase 5 direction |
|---|---|---|
| Homepage | `js/homepage-controller.js` injects multiple generations of CSS/JS | One feature-based homepage runtime |
| Data transport | `js/core/data-client.js` exists, but many feature scripts still call `fetch()` directly | Expand one stable data contract and migrate consumers incrementally |
| Calendar | `/calendar/` is backed by a large section-page implementation | Split data/date/render responsibilities without changing routes |
| Shared shell | Navigation, shell loading, search, menu and install behavior share one large module | Split by responsibility |
| Service worker | App shell contains historical homepage assets | Keep only proven runtime assets |
| CI | Strong static/data validation | Add browser smoke/route checks after architecture migration starts |

## Homepage dependency generations

The homepage controller currently acts as a compatibility loader for several generations, including:

- `homepage-runtime.js`
- `homepage-calendar-preview.js`
- `homepage-calendar-v7.js`
- `homepage-calendar-v8.js`
- `homepage-finance.js`
- `rashifal-home.js`
- `homepage-history.js`
- `homepage-converter.js`
- `homepage-ui-v2.js`
- `homepage-dashboard-v3.js`
- `homepage-ui-v4.js`
- `homepage-pwa-v5.js`
- `homepage-intelligence-v6.js`
- `homepage-news-v9.js`
- `homepage-finance-v10.js`
- `homepage-v2.js`

The controller also injects multiple historical stylesheet generations. These are **not deleted in Phase 5A**. They are first mapped and then removed only after the replacement runtime is proven.

## Migration rules

1. No route changes during the first consolidation pass.
2. No destructive deletion based only on filenames.
3. New feature code must use `NPData`/`NPDataClient` rather than introducing another transport helper.
4. Each migrated feature must keep its current loading/error behavior or improve it.
5. CI must be able to detect missing homepage dependencies and canonical route regressions.
6. Historical files are removed only after a dependency audit and validation pass.

## Target structure

```text
js/
  core/
    data-client.js
    date.js
    format.js
    routes.js
    state.js
  shell/
    loader.js
    navigation.js
    search.js
    menu.js
  features/
    homepage/
    calendar/
    panchanga/
    rashifal/
    news/
    finance/
```

Migration is incremental. The target structure is a destination, not a reason to rewrite working features in one commit.

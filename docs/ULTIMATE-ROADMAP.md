# Nepali Patro — Ultimate Delivery Roadmap

## Phase 1 — Foundation
- [x] Define calendar data contract
- [x] Add dataset manifest contract
- [x] Add contract validation to the local quality gate
- [x] Keep static-first architecture
- [ ] Add machine-readable freshness metadata to every external feed
- [ ] Consolidate duplicate data collectors

## Phase 2 — Product UX
- [x] Keep feature pages isolated from homepage renderer
- [x] Maintain mobile-first shell
- [ ] Canonicalize all navigation to `/calendar/` instead of legacy `/patro/`
- [ ] Standardize loading, empty and error states
- [ ] Add site-wide search
- [ ] Finish five-tab mobile navigation: Home, Calendar, Panchanga, Rashifal, More

## Phase 3 — SEO
- [x] Add static SEO audit command
- [ ] Enforce unique title/description/canonical on all indexable pages
- [ ] Generate daily calendar/Panchanga URLs where useful
- [ ] Generate festival/history landing pages
- [ ] Add BreadcrumbList/FAQ/Event structured data only where semantically valid
- [ ] Strengthen internal-link graph

## Phase 4 — Reliability
- [x] Validate calendar/conversion integrity
- [x] Validate JavaScript syntax
- [x] Validate canonical route markers
- [ ] Add browser smoke tests for critical routes
- [ ] Add accessibility checks
- [ ] Add performance budgets
- [ ] Add external-source health reporting

## Phase 5 — Expansion
- [ ] Offline-first PWA refinement
- [ ] Calendar install experience
- [ ] Advanced Kundali/Jyotish modules
- [ ] Personal events/reminders
- [ ] Only add new feature families when core UX, SEO and reliability gates remain green

## Release gate

A release is ready only when `npm run audit` passes, generated data is valid, canonical routes work, and critical mobile pages remain usable without relying on live external APIs.

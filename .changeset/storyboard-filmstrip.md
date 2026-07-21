---
"executable-stories-react": minor
"executable-stories-astro": minor
"executable-stories-formatters": minor
---

Stakeholder living docs: visual storyboards and persona views.

**Visual storyboards** — scenarios whose steps carry screenshots (e.g. Playwright `story.screenshot({ page, alt })` after each step) now render a horizontal filmstrip — Given → When → Then, each frame a thumbnail linking to its step — above the step list in the HTML report and on Astro story pages. Derived, not authored: `extractStoryboardFrames()` (new in `executable-stories-core/storyboard`) reads the step docs the tests already emit, and the new `<ReportStoryboard/>` component renders them. Appears automatically from 2 frames up; hydration-free, so it works in static Astro islands.

**Persona views** — `views: [{ base: '/for/product', include: { tags: ['audience:stakeholder'] }, groupBy: 'tag' }]` in `defineExecutableStories()` mounts filtered, re-grouped indexes at their own URLs, one per audience (product, design, support, QA). Each renders the same interactive index as `/stories` through its lens, appears in the sidebar under "Audiences" via `storiesSidebar()`, and explains itself when its tags match nothing yet. New exports: `resolveViews`, `matchView`, `viewReport`, `PersonaView`.

**Journeys** — tag scenarios `journey:<id>[:<order>]` and each id becomes an ordered multi-scenario walkthrough at `/journeys/<id>` (configurable via `journeysBase`/`injectJourneys`): member scenarios in tag order as full cards — storyboards included — under one aggregate status (`failed` if any member failed, `passed` only when all passed). A tag convention, not a new API, so it works in every adapter today. `extractJourneys()`/`parseJourneyTag()` are new in `executable-stories-core`; embed a journey in MDX with `<StoryJourney id="..."/>`.

**UI-state catalog** — `state:<name>` tags feed `/states` (configurable via `statesBase`/`injectStates`): a thumbnail grid of the UI states the product verifiably has, each card a scenario's first storyboard frame linking to its story page, with `viewport:mobile`/`viewport:desktop` variants side by side within their state.

**Traceability CSV** — new `traceability-csv` output format in `executable-stories-formatters`: the traceability matrix as flat RFC-4180 CSV for auditors and spreadsheets, one row per requirement-scenario pair plus a row per untraced scenario. Same derivation as `traceability-matrix`, so the two can never disagree.

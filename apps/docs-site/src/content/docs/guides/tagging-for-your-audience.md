---
title: Tagging for your audience
description: A small tag vocabulary that turns one test suite into persona views for product, design, support, and QA
---

The same run JSON can serve every audience — engineers get steps and traces,
product owners get capabilities, designers get storyboards, support gets a
behavior catalog. What routes a scenario to the right audience is nothing more
than tags your tests already support:

```ts
story.init(testInfo, {
  tags: ['audience:stakeholder', 'capability:checkout', 'storyboard'],
});
```

Tags cost one line, live next to the behavior they describe, and can never go
stale independently of the test. This guide names a small vocabulary and shows
how to surface it as persona views on your Astro site.

## The vocabulary

None of these are special-cased by the framework — they are conventions the
views filter and group on. Adopt the ones you need; skip the rest.

| Tag | Meaning | Who filters on it |
|---|---|---|
| `audience:stakeholder` | Readable by non-engineers: outcome-first title, no internals | Product, leadership |
| `capability:<name>` | The business capability this verifies (`capability:checkout`) | Product — group by capability, not by file |
| `journey:<id>:<n>` | Position `n` in an ordered walkthrough — becomes a page at `/journeys/<id>` | Product, design, support |
| `storyboard` | Carries per-step screenshots — renders as a [visual filmstrip](/guides/understanding-the-report/) | Design |
| `state:<name>` | A UI state the product can be in — appears on the `/states` thumbnail grid | Design — state catalog |
| `viewport:<name>` | Layout variant (`viewport:mobile`) — shown side by side within its state | Design — responsive review |
| `support` | Answers "when a customer does X, what should happen?" | Customer success |
| `known-issue` | A deliberate limitation, documented honestly (often with `story.but`) | Support, QA |
| `criticality:<level>` | Business criticality (`criticality:revenue`) | QA, leadership — risk weighting |

Two existing options complement the tags: `ticket` links a scenario to the
requirement it verifies (PM coverage questions), and `story.link({ label:
'Figma — Checkout v3', url })` attaches design references that render with the
scenario.

## Persona views

The `views` config in `executable-stories-astro` mounts one filtered,
re-grouped index per audience — same collection, different lens:

```js
// executable-stories.config.mjs
export default defineExecutableStories({
  source: 'reports/raw-run.json',
  views: [
    {
      base: '/for/product',
      label: 'Product',
      description: 'What the product verifiably does, by capability.',
      include: { tags: ['audience:stakeholder'] },
      groupBy: 'tag',
    },
    {
      base: '/for/design',
      description: 'Visual walkthroughs and UI states, straight from the tests.',
      include: { tags: ['storyboard'] },
    },
    {
      base: '/for/support',
      description: 'When a customer does X, what should happen?',
      include: { tags: ['support'] },
    },
    {
      base: '/for/qa',
      description: 'Everything, including planned and known-issue scenarios.',
      groupBy: 'status',
    },
  ],
});
```

Each view gets a page at its `base`, a sidebar group ("Audiences") via
`storiesSidebar(config)`, and the same interactive index the main `/stories`
page uses — search, filters, storyboard filmstrips, failure detail. A view
whose filters match nothing renders a getting-started note naming the tags it
expects, so an empty lens explains itself.

Views never hide failures: a red scenario in a stakeholder view is a feature,
not a leak. Honest living docs are the point.

## Journeys

Real user flows span several tests (isolation, parallelism, flake
containment), but stakeholders want one walkthrough. The `journey:<id>:<n>`
tag composes them:

```ts
test('Browse the catalog', async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ['journey:guest-checkout:1'] });
  // ...
});

test('Guest checkout walkthrough', async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ['journey:guest-checkout:2'] });
  // ...
});
```

Each journey id becomes a page at `/journeys/<id>` — the member scenarios in
order, rendered as full cards with their storyboards, under one aggregate
status (`failed` if any member failed; `passed` only when all passed). The
order suffix is optional; untagged order falls back to source order. Embed a
journey in prose with `<StoryJourney id="guest-checkout" />`.

Because journeys are a tag convention, they work in every adapter today —
Playwright journeys get filmstrips, Vitest/Jest journeys read as ordered
Given/When/Then text. Support teams can paste `/journeys/<id>` links straight
into tickets.

## The state catalog

`state:<name>` tags feed `/states`: a thumbnail grid of every UI state the
product verifiably has, each card a scenario's first screenshot linking to
its story page. Tag viewport variants (`viewport:mobile`,
`viewport:desktop`) and they sit side by side within their state — same
state, two layouts, compared at a glance. Designers browse what shipped, not
what a hand-maintained inventory claims.

## For auditors: the traceability CSV

QA and compliance get the same truth as a spreadsheet:

```bash
executable-stories format reports/raw-run.json --format traceability-csv
```

One row per requirement-scenario pair (ticket, requirement status, scenario,
source, covered code), plus a row per untraced scenario — the coverage gaps
listed explicitly, not hidden. It is a flat projection of the
`traceability-matrix` format, so the two can never disagree.

## Leadership

No separate dashboard is needed: a `/for/leadership` view grouped by
`capability:*` tags is the capability map, and the shipped
`<HealthDashboard />` and `<Trajectory />` components drop into any authored
page for run health and trend.

## Rules of thumb

- **Tag behaviors, not tests.** `capability:refunds` describes what the
  scenario proves. Tags like `slow` or `flaky` belong to CI, not personas.
- **Group by the audience's mental model.** Product thinks in capabilities
  (`groupBy: 'tag'`), QA in statuses, engineers in features/files.
- **Start with two views.** `/for/product` and one more. Add lenses when
  someone asks for them, not before.
- **Outcome-first titles do half the work.** "Refund lands within 5 days"
  reads in every view; "test_refund_worker_retry" reads in none.

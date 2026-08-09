---
name: audience-views
description: Use when non-engineers need to read the test suite — a product owner asking what the system does, a designer wanting the UI states, support needing "what happens when a customer does X", leadership wanting a capability map. Routes one run to several audiences with a small tag vocabulary and persona views, instead of maintaining a second set of documents.
---

# Audience Views

Every team eventually writes the same document twice: once as tests, once as a slide, a
Confluence page, or a spreadsheet for the people who cannot read tests. The second copy
is wrong within a sprint, and nobody can tell which copy is lying.

One run can serve all of them. What routes a scenario to an audience is a tag the test
already supports, so the routing cannot drift independently of the behaviour it routes.

```ts
story.init(testInfo, {
  tags: ['audience:stakeholder', 'capability:checkout', 'storyboard'],
});
```

None of these tags are special-cased by the framework. They are conventions the views
filter and group on, which means you can adopt three of them and ignore the rest.

## Agent guardrails

- **Never hide failures from a view.** A red scenario in the stakeholder view is the
  feature, not a leak. A view that shows only green is marketing, and the moment someone
  notices, every view loses its credibility.
- **Tag behaviours, not tests.** `capability:refunds` describes what the scenario proves.
  `slow` and `flaky` belong to CI, not to a persona.
- **Do not tag everything `audience:stakeholder`.** A view containing all 400 scenarios is
  the same unreadable list it was before, with a nicer URL.
- **Do not invent a parallel vocabulary.** Use the tags below so views, journeys, and
  states keep working. New tags are fine when a real audience asks for one.

## The vocabulary

| Tag | Meaning | Who reads it |
| --- | --- | --- |
| `audience:stakeholder` | Readable by non-engineers: outcome-first title, no internals | Product, leadership |
| `capability:<name>` | The business capability this verifies | Product, grouping by capability rather than by file |
| `journey:<id>:<n>` | Position `n` in an ordered walkthrough, becomes `/journeys/<id>` | Product, design, support |
| `storyboard` | Carries per-step screenshots, renders as a filmstrip | Design |
| `state:<name>` | A UI or data state the product can be in, appears on `/states` | Design |
| `viewport:<name>` | Layout variant, shown side by side within its state | Design |
| `support` | Answers "when a customer does X, what happens?" | Customer success |
| `known-issue` | A deliberate limitation, documented honestly | Support, QA |
| `criticality:<level>` | Business criticality, for risk weighting | QA, leadership |

Two story options complement them: `ticket` links a scenario to the requirement it
verifies, which answers the PM's coverage question, and `story.link({ label: 'Figma —
Checkout v3', url })` attaches a design reference. Links pointing at a design tool, or
whose label starts with "Design", surface as a Design strip at the top of the scenario
page and of every journey it belongs to.

## Mount the views

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
    { base: '/for/qa', description: 'Everything, including planned and known-issue.', groupBy: 'status' },
  ],
});
```

Each view gets a page at its `base`, a sidebar group, and the same interactive index the
main `/stories` page uses: search, filters, filmstrips, failure detail. A view whose
filters match nothing renders a note naming the tags it expects, so an empty lens explains
itself instead of looking broken.

**Start with two views.** `/for/product` and one other. Add lenses when someone asks, not
before: an unused view still has to be kept honest.

## Journeys, for the flow nobody can see in a test list

Real user flows are split across tests for isolation and parallelism, but a stakeholder
wants one walkthrough. The `journey:<id>:<n>` tag composes them back:

```ts
story.init(testInfo, { tags: ['journey:guest-checkout:1'] });
```

Each id becomes a page at `/journeys/<id>`: member scenarios in order, full cards with
their storyboards, under one aggregate status (failed if any member failed). The order
suffix is optional and falls back to source order. Embed one in prose with
`<StoryJourney id="guest-checkout" />`.

Journeys work in every adapter because they are only a tag convention. Playwright journeys
get filmstrips; scenarios that capture `story.state` snapshots end each chapter with a
data card, so a backend-only journey still shows what the world looked like at each step.
Support teams paste `/journeys/<id>` straight into tickets.

With `historyFile` configured, journey pages add a run-history badge ("7/10 recent runs
passed · flaky") aggregated from the members.

## The state catalog, for design

`state:<name>` feeds `/states`: a thumbnail grid of every state the product verifiably
has, each card a scenario's first screenshot, or a data card for non-UI scenarios. Tag
viewport variants and they sit side by side within their state.

The tag and the doc verb are the same idea at two granularities: `state:<name>` names the
state, `story.state()` shows the data that proves it.

## Auditors and leadership

Auditors want a spreadsheet, and it is one command:

```bash
executable-stories format reports/raw-run.json --format traceability-csv
```

One row per requirement-scenario pair with an `evidence_grade` column, plus a row per
untraced scenario so the gaps are listed rather than hidden.

Leadership needs no separate dashboard. A `/for/leadership` view grouped by `capability:*`
is the capability map, and the shipped `<HealthDashboard />` and `<Trajectory />`
components drop into any authored page for run health and trend.

## Retrofitting an existing suite

Do not tag everything in one pass. Pick the audience who complained most recently, ask
them which ten behaviours they care about, tag those, and mount their view. A view with
ten scenarios that the reader recognises beats one with four hundred they do not.

Outcome-first titles do half the work before any tag exists. "Refund lands within 5 days"
reads in every view; "test_refund_worker_retry" reads in none. If a scenario needs a tag
to be legible, fix the title first (`spec-refine-examples`).

## Relationship to neighbouring skills

- `living-docs-site` is where these views are mounted and published.
- `spec-living-documentation` covers writing scenarios that stay readable for these
  audiences over years.
- `spec-story-mapping` produces the capability and journey structure the tags express.
- `release-notes` reports the same data as a change over time rather than a current state.
- `coverage-audit` answers the auditor's question in depth.

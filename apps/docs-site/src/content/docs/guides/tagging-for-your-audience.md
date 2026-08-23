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
'Figma — Checkout v3', url })` attaches design references. Links pointing at a
design tool (Figma, Zeplin, Sketch) — or any link whose label starts with
"Design" — also surface as a **Design** strip at the top of the scenario's
story page and of every journey it belongs to, so designers land on the
mockup next to the proof.

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
Playwright journeys get filmstrips, and scenarios that capture
[state snapshots](/guides/understanding-the-report/#state-snapshots-storyboards-for-data)
show each chapter's final state card, so a data-only journey still ends every
chapter with what the world looked like. State diffs never cross scenario
boundaries: each chapter tells its own before-and-after. Support teams can
paste `/journeys/<id>` links straight into tickets.

If your CI runs the CLI with `--history-file`, point the site at the same
store and journey pages add a run-history badge — "7/10 recent runs passed ·
flaky" — aggregated from the member scenarios (a journey fails a run when any
member failed it):

```js
export default defineExecutableStories({
  source: 'reports/raw-run.json',
  historyFile: 'reports/history.json',
});
```

## The state catalog

`state:<name>` tags feed `/states`: a thumbnail grid of every state the
product verifiably has, each card a scenario's first screenshot — or, for
non-UI scenarios, a data-card thumbnail from its first
[state snapshot](/guides/understanding-the-report/#state-snapshots-storyboards-for-data) —
linking to its story page. Tag viewport variants (`viewport:mobile`,
`viewport:desktop`) and they sit side by side within their state — same
state, two layouts, compared at a glance. Designers browse what shipped, not
what a hand-maintained inventory claims.

The tag and the doc verb are one concept at two granularities: `state:<name>`
names a state the product can be in; `story.state()` shows the data that
proves it.

## For auditors: the traceability CSV

QA and compliance get the same truth as a spreadsheet:

```bash
executable-stories format reports/raw-run.json --format traceability-csv
```

One row per requirement-scenario pair (ticket, requirement status, scenario,
evidence grade, source, covered code), plus a row per untraced scenario — the
coverage gaps listed explicitly, not hidden. The `evidence_grade` column is
the same weak → strong grading the Evidence Review applies (screenshot, OTEL
trace, mutation score, failing-first verification), so the spreadsheet says
not just "passed" but how credible the proof is. It is a flat projection of
the `traceability-matrix` format, so the two can never disagree.

## Environment drift

When the site combines two or more `sources` (a staging run and a production
run, or one run per repo in a docs hub), a `/drift` page appears: every
scenario's status per source side by side, mismatches floated to the top.
Behavior verified in one environment but failing — or missing — in another is
exactly the gap a per-environment report hides. Force it on or off with
`injectDrift`, move it with `driftBase`.

## Leadership

No separate dashboard is needed: a `/for/leadership` view grouped by
`capability:*` tags is the capability map, and the shipped
`<HealthDashboard />` and `<Trajectory />` components drop into any authored
page for run health and trend.

## Linking in from a ticket or a wiki

Point external tools at a tag, not at a scenario. The Explorer reads its
filters from the query string, so `/explorer/?tag=capability:checkout` is a
stable address for "every scenario that verifies checkout", and
`?tag=BILL-402&status=failed` narrows it further. `q`, `status`, and `tag` all
work, and the URL updates as you filter, so any view you reach is a link you
can paste back into the ticket.

A per-scenario URL is the thing to avoid. Gojko Adzic makes the case in
*Specification by Example* (ch. 12):

> Avoid referring to a particular specification in the living documentation
> system directly, because that prevents you from reorganizing the
> documentation later.

Specifications get renamed, moved, split, and merged as the domain model
changes; that is the documentation working, not failing. A tag survives all
four, so a Jira ticket that links `?tag=BILL-402` still resolves after the
scenario it pointed at was split in two. A link to
`/stories/refund-a-part-used-subscription/` does not.

A tag with nothing behind it renders an empty result rather than the full
list, so a link that has gone stale says so instead of quietly reading as
green.

## Rules of thumb

- **Tag behaviors, not tests.** `capability:refunds` describes what the
  scenario proves. Tags like `slow` or `flaky` belong to CI, not personas.
- **Group by the audience's mental model.** Product thinks in capabilities
  (`groupBy: 'tag'`), QA in statuses, engineers in features/files.
- **Start with two views.** `/for/product` and one more. Add lenses when
  someone asks for them, not before.
- **Link by tag, never by scenario URL.** Tags survive the renames and merges
  that a healthy living documentation system goes through.
- **Outcome-first titles do half the work.** "Refund lands within 5 days"
  reads in every view; "test_refund_worker_retry" reads in none.

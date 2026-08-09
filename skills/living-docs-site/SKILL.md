---
name: living-docs-site
description: Use when a repo needs a documentation site that cannot go stale — onboarding docs, an internal reference, a stakeholder-facing product site, or a hub collating several repos. Builds it on the Astro integration so the pages describing behaviour are generated from the run, and only the pages that genuinely need a human author are authored.
---

# Living Docs Site

The default outcome of a documentation project is a site that was accurate on the day it
launched. Everything describing behaviour drifts, and nothing in the site can tell a
reader which parts have drifted.

The fix is a boundary, and it is the only real decision in this skill:

- **Behaviour is generated.** What the system does, in what order, under which rules, comes
  from the run. Never hand-write it.
- **Intent is authored.** Why it works this way, what we decided, how to operate it. A test
  cannot produce those, so a person writes them, and they are marked with provenance so
  staleness is detectable.

Anything hand-written that a run could have generated will be wrong within a quarter.

## Agent guardrails

- **Never transcribe scenarios into markdown.** If a page lists what the system does, it
  should be a generated view or an embedded component, not prose you copied.
- **Never hide failing scenarios from the site.** Red in the docs is the feature. A site
  that shows only green is a brochure.
- **Do not add a page nobody asked for.** Every page is a maintenance obligation, and the
  authored ones do not maintain themselves.
- **Check links in CI.** A living docs site with dead links teaches readers to distrust it
  faster than stale prose does.

## Scaffold

```bash
npx --package executable-stories-formatters executable-stories init-astro story-docs
cd story-docs && pnpm install
pnpm dev
```

You get a thin Starlight project: the framework lives in `executable-stories-astro`, so
the scaffold is a handful of files you own, chiefly one config. The loader watches the run
JSON, so a test re-run hot-reloads the open page and nothing is written to disk. The tests
stay the source of truth.

`executable-stories dev` runs the site and installs its dependencies on first use.
`init-astro --update` refreshes the framework files while keeping your content and config.

Already have an Astro site? Add the integration instead of scaffolding a second one; see
the `existing-astro-site` guide.

## One config drives everything

```js
import { defineExecutableStories } from 'executable-stories-astro';

export default defineExecutableStories({
  source: '../reports/raw-run.json',
  groupBy: 'tag',
  docs: [{ path: 'src/content/docs/runbooks', label: 'Runbooks', base: 'runbooks' }],
  views: [{ base: '/for/product', include: { tags: ['audience:stakeholder'] }, groupBy: 'tag' }],
  historyFile: '../reports/history.json',
  theme: { preset: 'terminal' },
});
```

| Field | What it does |
| --- | --- |
| `source` / `sources` | One run, or several named suites combined in one site |
| `include` / `exclude` | Select scenarios by `tags`, `status`, or `features` |
| `groupBy` | `feature`, `tag`, `source`, `status`, `none` |
| `docs` | Authored markdown folders surfaced in the nav |
| `views` | Persona views at their own URLs (`audience-views`) |
| `journeysBase` / `injectJourneys` | Journey walkthroughs from `journey:<id>:<n>` tags |
| `statesBase` / `injectStates` | The state catalog from `state:<name>` tags |
| `driftBase` / `injectDrift` | Status comparison across sources, auto-injected with two or more |
| `historyFile` | The CLI `--history-file` store; enables stability badges |
| `agentEndpoints` | `/llms.txt` and per-story Markdown twins (default on) |
| `theme` | `preset`, `accent`, per-token overrides |

Leave `agentEndpoints` on. It is what makes the site readable by the next agent without
scraping HTML, and it costs nothing.

## Choose the shape before writing anything

Four site shapes cover nearly everything. Pick one; do not blend them.

| Shape | Config that defines it | For |
| --- | --- | --- |
| **Engineering reference** | `groupBy: 'feature'`, runbooks and ADRs under `docs` | The team |
| **Stakeholder product site** | `views` per audience, `groupBy: 'tag'` | Product, support, leadership |
| **Multi-repo hub** | `sources: [...]`, one per repo, `/drift` on | A platform team across services |
| **Onboarding** | Authored explainers first, generated stories linked from them | New joiners |

## Authored pages, and only these

Four kinds of page earn their hand-written status, and three of them have templates:

```bash
executable-stories new adr "Use event sourcing for orders"
executable-stories new runbook "Restore a failed payment batch"
executable-stories new decision-log "Q3 architecture decisions"
executable-stories new incident "2026-08-01 checkout outage"
executable-stories new scenario-note "Why refunds take five days"
```

- **ADRs** record a decision and the alternatives. A test cannot hold "we considered
  Kafka".
- **Runbooks** are operator instructions. Nothing in a test run is a runbook.
- **Explainers** teach a change or an area, and they carry provenance frontmatter so
  staleness is machine-detectable (`explain-change`, `explain-system`).
- **Scenario notes** hold the reasoning behind one scenario that would bloat the test file.

Everything else on the site should be generated. If you are about to write a page called
"How checkout works", stop and embed the journey instead.

## Embed generated behaviour in authored prose

This is what keeps authored pages honest. Components import from
`executable-stories-astro/components/`:

```mdx
import StoryJourney from 'executable-stories-astro/components/StoryJourney.astro';
import VerifiedBy from 'executable-stories-astro/components/VerifiedBy.astro';
import HealthDashboard from 'executable-stories-astro/components/HealthDashboard.astro';

## How guest checkout works

<StoryJourney id="guest-checkout" />

The refund window is five days.
<VerifiedBy scenario="refund-lands-within-five-days" />
```

`StoryScenario`, `StoryStatus`, `VerifiedBy`, `StoryJourney`, `Trajectory`,
`HealthDashboard`, `ApiOperations`, and `DesignContext` are all available. `VerifiedBy` is
the one to reach for most: it turns a prose claim into a claim with a live status next to
it, so an out-of-date sentence announces itself.

For an HTTP surface, generate the pages rather than writing them:

```bash
executable-stories import-openapi openapi.yaml
```

Each operation page links to the stories that verify it.

## Keep it honest in CI

```bash
executable-stories check-links story-docs/src/content/docs
executable-stories check-explainers reports/raw-run.json --explainers-dir story-docs/src/content/docs/explainers
```

The first catches dead links, the second catches explainers citing scenarios that changed,
were renamed, or vanished (exit 5). Both belong on the same pipeline as the tests, because
documentation rot is a build failure that has learned to hide.

## Multi-repo hubs

```js
sources: [
  { name: 'checkout', source: '../artifacts/checkout/raw-run.json' },
  { name: 'payments', source: '../artifacts/payments/raw-run.json' },
]
```

Each repo publishes its raw run as a CI artifact; the hub reads them. With two or more
sources a `/drift` page appears automatically, showing each scenario's status per source
with mismatches floated to the top. That page answers "is staging behind production?" in
one glance, and it is invisible to any per-repo report.

## Relationship to neighbouring skills

- `audience-views` designs the tag vocabulary and views this site mounts.
- `explain-system` and `explain-change` write the authored explainers that live here.
- `ci-gates` wires `check-links` and `check-explainers`.
- `formatters-cli` covers the standalone HTML report, which is the right answer when a
  site is more than the repo needs.
- `executable-stories-init` gets a repo to a first run, which this site needs before it
  can render anything.

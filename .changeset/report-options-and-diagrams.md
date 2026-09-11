---
"executable-stories-core": minor
"executable-stories-react": minor
"executable-stories-formatters": minor
---

Project settings in the config file, ticket links everywhere, and a clearer architecture diagram

**Flag defaults in the config file.** `executable-stories.config.mjs` / `.js` /
`.json` now takes a `defaults` object keyed by flag name without the dashes, so
a project's report settings live in the repo rather than in each CI step:

```js
export default {
  defaults: {
    'output-dir': 'docs',
    'html-title': 'Checkout Stories',
    'html-architecture': true,
    'ticket-url-template': 'https://jira.example.com/browse/{ticket}',
  },
};
```

Anything typed on the command line wins. A key that is not a flag, or a value of
the wrong type, is reported by name. Numbers are accepted where a flag takes a
string, and repeatable flags take a list. The `.json` form gives the non-JS
adapters (Go, Ruby, Rust, pytest, JUnit 5, xUnit) the same settings, since they
reach the prebuilt binary rather than the library.

**Link templates for every format.** `--ticket-url-template`,
`--permalink-base-url` and `--trace-url-template` (and the matching top-level
generator options) say where tickets, sources and traces live, once. Ticket URLs
are resolved into the StoryReport itself — `toStoryReport` and
`toStoryReportWithIndex` take a `ticketUrlTemplate` — so the HTML report, the
Astro pages and `story-report-json` all link a ticket to the same place. A
per-format option of the same name still wins.

**"Architecture, as it ran" is opt-in.** `--html-architecture`
(`html.architecture`, or the `architecture` prop on `<Report>` /
`<ReportInteractive>`) draws the run's span graph in the HTML report. It stays
out of the report unless asked for, since only an instrumented run has anything
to draw. `--format span-graph` still writes the graph as its own file.

**Clearer diagrams.** The report's mermaid pin moves to 11, and light-theme
diagrams use mermaid's `neutral` palette — the same theme the static, no-JS
render already used, so a diagram keeps its colours when the interactive island
takes over. Node labels get the room they need, the architecture table picks up
the report's link colour, and Storybook gains `Drawn` stories that render real
diagrams in both palettes and check that every label fits its box.

**Table of contents.** The sidebar highlight now follows the scenario you are
reading all the way to the end of the page.

Story synthesis is one setting under two spellings: `--synthesize-stories` and
`--no-synthesize-stories` resolve together, the command line taking precedence
over the config file and the last spelling typed taking precedence between them.

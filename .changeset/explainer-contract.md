---
"executable-stories-formatters": minor
"executable-stories-astro": minor
"executable-stories-react": minor
"executable-stories-mcp": minor
"executable-stories-init": patch
---

Explainer contract v1 + typography-grade markdown rendering.

Explainers (output of the new `explain-change` skill) are markdown docs whose
frontmatter carries a machine-readable provenance block citing scenarios by id,
title, and content hash (hash is mandatory in v1 — id-only citations cannot
detect drift and are rejected as invalid).

- **core** (private, bundled into the packages above — no version bump of its
  own): new `executable-stories-core/explainer` module — `scenarioContentHash`
  (title + steps digest, status excluded), `checkExplainerRef` (fresh/changed/
  renamed/missing per citation), `explainerRefFromFrontmatter`.
- **formatters**: new `check-explainers` subcommand audits a directory of
  explainers against a run (exit 5 when stale/invalid, `--no-fail` to report
  only); `explainer-v1.json` schema; scenario-index items now carry `hash` so
  agents can stamp frontmatter without inventing values.
- **astro**: `authoredDocsLoader({ explainers: config })` injects a fresh/stale
  banner with story-page deep links into any doc carrying an `explainer` block;
  the init-astro template enables this by default.
- **Astro-first onboarding**: `init-astro --install` scaffolds AND installs in
  one command (package manager detected from your lockfile), and `format`
  prints a one-line stderr tip pointing at `init-astro` on first contact with
  an output directory (when it writes the artifacts README) if no docs site
  exists yet — never on later runs, and never for `--json-summary` agent
  pipelines.
- **DX**: the Vitest bootstrap template now uses the `createStoryReporter()`
  factory (no `createRequire`, no `as unknown as Reporter` cast) and the
  Playwright template uses the plain reporter module id; new
  `executable-stories dev` runs the docs site in one command
  (finds `./story-docs`, installs deps if missing, hands off to the dev
  server); `format` drops a write-once README into the output dir explaining
  each artifact; the CLI no longer misreads a docs-site
  `executable-stories.config.mjs` as plugin config.
- **Rename**: the scenario-index artifact now matches its format and schema
  name — files are `*.scenario-index.json` (was `*.scenarios-index.json`) and
  the MCP HTTP route is `/scenario-index` (was `/scenarios-index`). Update any
  pipeline that globs the old name.
- **react**: `story.section` markdown now renders through
  `@tailwindcss/typography` (`prose prose-sm`), with the prose palette mapped to
  the report theme tokens so it follows light/dark automatically.

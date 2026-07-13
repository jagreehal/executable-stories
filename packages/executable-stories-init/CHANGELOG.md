# executable-stories-init

## 0.1.6

### Patch Changes

- 393b095: Relicense from MIT to Apache-2.0.

  All packages are now published under the Apache License, Version 2.0, and
  every package tarball ships its own LICENSE file. Several packages
  (`executable-stories-astro`, `-cypress`, `-demo`, `-jest`, `-playwright`)
  previously published with no `license` field at all; that is fixed.

  Versions published before this change remain available under MIT. The
  Executable Stories name and logo are trademarks and are not granted by the
  code licence — see TRADEMARKS.md in the repository.

## 0.1.5

### Patch Changes

- af026d1: Explainer contract v1 + typography-grade markdown rendering.

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

## 0.1.4

### Patch Changes

- bed366d: chore: update dependencies

  Routine dependency refresh via npm-check-updates (3-day publish cooldown). Notable changes:
  - **executable-stories-init**: `commander` 14 → 15, `@clack/prompts` 1.3 → 1.5
  - **executable-stories-react**: `marked` 15 → 18, `zod` 4.0 → 4.4; `react`/`react-dom` peer raised to `>=19.2.7`
  - **executable-stories-mcp**: `zod` 4.0 → 4.4
  - **executable-stories-formatters**: `yaml` 2.8 → 2.9
  - Peer-minimum raises: `cypress >=15.16.0`, `jest >=30.4.2`, `@playwright/test >=1.60.0`, `autotel >=3.4.4`

  Also migrated the workspace build/test tooling to **vite 8** (`vite: ^8` pnpm override; `@vitejs/plugin-react` 4 → 6). vitest 4.1.8 and storybook-vite 10.4.2 already support vite 8, and the astro example/docs apps build cleanly on it. `@types/estree` is pinned to `1.0.9` via a pnpm override to dedupe with eslint 10.4.1 (a split `1.0.8`/`1.0.9` otherwise breaks the eslint-plugin type-checks).

  (Dev-tooling-only bumps — eslint, vitest, turbo, storybook, @types/node, vite — are not released as they don't affect consumers of the published packages.)

## 0.1.1

### Patch Changes

- 6c87c1f: Multi-framework bootstrap and Cypress parity.
  - **executable-stories-cypress**: bring Cypress in line with Jest and Playwright. Adds top-level step exports (`given`, `when`, `then`, `and`, `but`), step modifiers (`.skip`, `.only`, `.todo`, `.fails`), scenario-level `story.skip` / `story.only`, `doc.story()` for attaching story metadata to plain Cypress tests, and a `traceUrlTemplate` option for linking failures to traces.
  - **executable-stories-init**: detect and scaffold Jest and Cypress alongside Vitest and Playwright. New `--jest`, `--cypress`, `--all`, and `--both` flags route through `resolveFrameworks()`; the wizard now prompts for all four frameworks. Plan generation batches dependency installs, handles script-name collisions when multiple frameworks coexist (e.g. `test:stories:vitest` + `test:stories:jest`), and emits framework-specific config and sample templates.
  - **executable-stories-formatters**: add `--fail-on-added-failures` and `--max-regressions` compare gates for CI regression budgets. Gate failures exit with code 5.

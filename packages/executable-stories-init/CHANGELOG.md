# executable-stories-init

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

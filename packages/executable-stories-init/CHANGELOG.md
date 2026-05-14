# executable-stories-init

## 0.1.1

### Patch Changes

- 6c87c1f: Multi-framework bootstrap and Cypress parity.
  - **executable-stories-cypress**: bring Cypress in line with Jest and Playwright. Adds top-level step exports (`given`, `when`, `then`, `and`, `but`), step modifiers (`.skip`, `.only`, `.todo`, `.fails`), scenario-level `story.skip` / `story.only`, `doc.story()` for attaching story metadata to plain Cypress tests, and a `traceUrlTemplate` option for linking failures to traces.
  - **executable-stories-init**: detect and scaffold Jest and Cypress alongside Vitest and Playwright. New `--jest`, `--cypress`, `--all`, and `--both` flags route through `resolveFrameworks()`; the wizard now prompts for all four frameworks. Plan generation batches dependency installs, handles script-name collisions when multiple frameworks coexist (e.g. `test:stories:vitest` + `test:stories:jest`), and emits framework-specific config and sample templates.
  - **executable-stories-formatters**: add `--fail-on-added-failures` and `--max-regressions` compare gates for CI regression budgets. Gate failures exit with code 5.

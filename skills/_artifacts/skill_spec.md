# Skill Specification — executable-stories

## Overview

15 skills across 8 publishable packages. Framework-native BDD story testing — tests are source of truth, docs derived from test results.

## Skill List

### Framework Adapters (12 skills — 3 per adapter)

Each adapter gets three skills following the same pattern:

| Skill | Type | Description |
|---|---|---|
| `[fw]-story-api` | core | Step recording API, doc entries, init pattern |
| `[fw]-reporter-setup` | core | Reporter/plugin config for doc generation |
| `[fw]-converting-tests` | lifecycle | Incremental adoption in existing test suites |

**Vitest** — Callback-only API, `story.init(task)`, no top-level `then` export, StoryReporter from `/reporter` subpath.

**Jest** — Top-level exports (`import { given, when, then }`), `story.init()` no args, suite path from `expect.getState().currentTestName`.

**Playwright** — Top-level exports with TestInfo, `story.init(testInfo)`, async steps with fixtures, `.story.spec.ts` naming.

**Cypress** — Custom commands (`cy.given`, `cy.when`), `setupNodeEvents` plugin, `.story.cy.ts` naming.

### Formatters (1 skill)

| Skill | Type | Description |
|---|---|---|
| `formatters-cli` | core | CLI + programmatic API, pipeline architecture, 6 output formats |

### ESLint Plugins (3 skills — 1 per plugin)

| Skill | Type | Description |
|---|---|---|
| `eslint-vitest-rules` | core | 3 rules + flat config recommended setup |
| `eslint-jest-rules` | core | 2 rules + flat config recommended setup |
| `eslint-playwright-rules` | core | 2 rules + flat config recommended setup |

## Key Content Requirements

All skills MUST capture:

1. **Framework-native philosophy** — Not Cucumber, no Gherkin parser, no world object
2. **Auto-And keyword conversion** — First given() → "Given", subsequent → "And"; but() never auto-converts
3. **Correct file naming** — `.story.test.ts` (vitest/jest), `.story.spec.ts` (playwright), `.story.cy.ts` (cypress)
4. **Complete code examples** — Real imports, no placeholders, copy-pasteable

## Structure

All packages use **flat structure** (each has ≤3 skills, well under the 5-skill threshold for nested).

```
packages/
├── executable-stories-vitest/
│   └── skills/
│       ├── vitest-story-api/SKILL.md
│       ├── vitest-reporter-setup/SKILL.md
│       └── vitest-converting-tests/SKILL.md
├── executable-stories-jest/
│   └── skills/
│       ├── jest-story-api/SKILL.md
│       ├── jest-reporter-setup/SKILL.md
│       └── jest-converting-tests/SKILL.md
├── executable-stories-playwright/
│   └── skills/
│       ├── playwright-story-api/SKILL.md
│       ├── playwright-reporter-setup/SKILL.md
│       └── playwright-converting-tests/SKILL.md
├── executable-stories-cypress/
│   └── skills/
│       ├── cypress-story-api/SKILL.md
│       ├── cypress-reporter-setup/SKILL.md
│       └── cypress-converting-tests/SKILL.md
├── executable-stories-formatters/
│   └── skills/
│       └── formatters-cli/SKILL.md
├── eslint-plugin-executable-stories-vitest/
│   └── skills/
│       └── eslint-vitest-rules/SKILL.md
├── eslint-plugin-executable-stories-jest/
│   └── skills/
│       └── eslint-jest-rules/SKILL.md
└── eslint-plugin-executable-stories-playwright/
    └── skills/
        └── eslint-playwright-rules/SKILL.md
```

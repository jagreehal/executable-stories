# Skill Specification — executable-stories

## Overview

37 skills for framework-native BDD story testing, generated reports, ESLint rules, adoption workflows, living-documentation practices, and workflow receipts. Tests are source of truth; docs are derived from test results.

## Skill List

### JavaScript Framework Adapters (12 skills — 3 per adapter)

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

### Other Language Adapters (6 skills)

| Skill | Type | Description |
|---|---|---|
| `go-story-api` | core | Go `testing.T` story API and JSON output |
| `ruby-story-api` | core | Ruby/Minitest story API and JSON output |
| `junit5-story-api` | core | JUnit 5 Kotlin/Java story API and listener output |
| `rust-story-api` | core | Rust story builder and JSON output |
| `xunit-story-api` | core | xUnit C# story API and result recording |
| `pytest-story-api` | core | Python pytest story API and plugin output |

### Formatters (1 skill)

| Skill | Type | Description |
|---|---|---|
| `formatters-cli` | core | CLI + programmatic API, pipeline architecture, 8 output formats + Atlassian publish commands |

### Adoption (1 skill)

| Skill | Type | Description |
|---|---|---|
| `executable-stories-init` | lifecycle | Bootstrap executable-stories in a repo from zero |

### ESLint Plugins (3 skills — 1 per plugin)

| Skill | Type | Description |
|---|---|---|
| `eslint-vitest-rules` | core | 3 rules + flat config recommended setup |
| `eslint-jest-rules` | core | 2 rules + flat config recommended setup |
| `eslint-playwright-rules` | core | 2 rules + flat config recommended setup |

### Living Documentation (11 skills)

| Skill | Type | Description |
|---|---|---|
| `spec-discovery-oopsi` | practice | Shape specs with OOPSI before writing Given/When/Then |
| `spec-example-mapping` | practice | Mine examples, rules, and open questions |
| `spec-rules-decision-tables` | practice | Specify business rules and decision tables |
| `spec-workflow-state` | practice | Specify workflows and state transitions |
| `spec-review` | practice | Review executable specifications for quality |
| `spec-convert-tests` | practice | Convert existing tests into executable stories |
| `spec-refine-examples` | practice | Refine raw examples into precise specifications |
| `spec-outside-in-behaviour` | practice | Discover behaviour from user goals outside-in |
| `spec-living-documentation` | practice | Write specs as durable living documentation |
| `spec-evidence-review` | practice | Author changes for Evidence Review reports |
| `spec-plan-to-stories` | practice | Turn an agreed plan into planned `it.todo` scenarios |

### Understanding (2 skills)

| Skill | Type | Description |
|---|---|---|
| `explain-change` | practice | Explain a diff as living documentation, cited to scenarios that ran |
| `executable-lessons` | practice | Author coding lessons as runnable story tests |

### Workflow Receipts (1 skill)

| Skill | Type | Description |
|---|---|---|
| `linear-evidence-review` | workflow | Post idempotent Evidence Review receipts to linked Linear issues via MCP |

## Key Content Requirements

All skills MUST capture:

1. **Framework-native philosophy** — Not Cucumber, no Gherkin parser, no world object
2. **Auto-And keyword conversion** — First given() → "Given", subsequent → "And"; but() never auto-converts
3. **Correct file naming** — `.story.test.ts` (vitest/jest), `.story.spec.ts` (playwright), `.story.cy.ts` (cypress)
4. **Complete code examples** — Real imports, no placeholders, copy-pasteable

## Structure

Skills use a repository-root **flat structure** for skills.sh and cross-agent discovery. Each skill is a directory containing `SKILL.md`.

```
skills/
├── vitest-story-api/SKILL.md
├── vitest-reporter-setup/SKILL.md
├── vitest-converting-tests/SKILL.md
├── jest-story-api/SKILL.md
├── jest-reporter-setup/SKILL.md
├── jest-converting-tests/SKILL.md
├── playwright-story-api/SKILL.md
├── playwright-reporter-setup/SKILL.md
├── playwright-converting-tests/SKILL.md
├── cypress-story-api/SKILL.md
├── cypress-reporter-setup/SKILL.md
├── cypress-converting-tests/SKILL.md
├── formatters-cli/SKILL.md
├── eslint-vitest-rules/SKILL.md
├── eslint-jest-rules/SKILL.md
├── eslint-playwright-rules/SKILL.md
├── spec-living-documentation/SKILL.md
└── linear-evidence-review/SKILL.md
```

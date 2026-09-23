# Skill Specification — executable-stories

## Overview

Skills for framework-native BDD story testing, generated reports, ESLint rules, adoption, discovery, the build loop, delivery, and workflow receipts. Tests are source of truth; docs are derived from test results.

The grouped list of every skill lives in `skills.sh.json` at the repository root. The reader-facing version, with when to load each one, is `apps/docs-site/src/content/docs/ai-skills/catalogue.md`. Keep this file to the rules that span skills, so it has no list to fall out of date.

## Adapter pattern

### JavaScript framework adapters

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

## Key Content Requirements

All skills MUST capture:

1. **Framework-native philosophy** — Not Cucumber, no Gherkin parser, no world object
2. **Auto-And keyword conversion** — First given() → "Given", subsequent → "And"; but() never auto-converts
3. **Correct file naming** — `.story.test.ts` (vitest/jest), `.story.spec.ts` (playwright), `.story.cy.ts` (cypress)
4. **Complete code examples** — Real imports, no placeholders, copy-pasteable

## Structure

Skills use a repository-root **flat structure** for skills.sh and cross-agent discovery. Each skill is a directory containing `SKILL.md`: `skills/<name>/SKILL.md`. Shared reference that several skills point at lives in `skills/spec-shared/`.

## Invocation

A skill is model-invoked by default: its `description` stays in the agent's context so the agent can load it on its own, and other skills can route to it. Set `disable-model-invocation: true` only when a human should start the skill by name and no model-invoked skill routes to it. Skills that write to an external tracker are the main case (`tracker-receipts`, `scenarios-to-tickets`, `linear-evidence-review`), along with deliberate one-offs (`demo-video`) and routers (`stories-guide`, `stories-propose`). A user-invoked skill's `description` is a one-line summary for humans, with no trigger list.

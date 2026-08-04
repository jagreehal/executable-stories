---
title: Skill catalogue
description: All 37 shipped skills by group, what each one covers, and when your agent should load it.
---

Every skill lives at `skills/<name>/SKILL.md` in the [repository](https://github.com/jagreehal/executable-stories/tree/main/skills). See [Agent skills](/ai-skills/) for installation.

## Framework APIs

The story API for each language. Load the one matching the suite you are writing.

| Skill                   | Covers                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `vitest-story-api`      | Callback-only `story.init(task)`, steps, doc entries, and why no top-level `then`   |
| `jest-story-api`        | `story.init()` plus the top-level `given`/`when`/`then` imports                     |
| `playwright-story-api`  | `story.init(testInfo)`, async steps that receive fixtures, screenshots and video    |
| `cypress-story-api`     | `story.init()`, `doc.story()`, and the browser-to-Node bridge                       |
| `go-story-api`          | `Init(t, scenario, opts...)`, `RunAnd`, JSON output                                 |
| `ruby-story-api`        | `ExecutableStories.init` in Minitest                                                |
| `junit5-story-api`      | The static `Story.init` API in Kotlin and Java, with wrapped steps                  |
| `rust-story-api`        | The `Story::new()` builder and `write_results()`                                    |
| `xunit-story-api`       | The static `Story.Init` API in C#                                                   |
| `pytest-story-api`      | The module-singleton `story` API, including `and_` and `assert_`                    |

## Reporter setup

Getting a run to produce artifacts.

| Skill                       | Covers                                                                         |
| --------------------------- | ------------------------------------------------------------------------------ |
| `vitest-reporter-setup`     | `StoryReporter` in `vitest.config.ts`, aggregated against colocated output      |
| `jest-reporter-setup`       | The reporters array plus `setupFilesAfterEnv` for story flushing                |
| `playwright-reporter-setup` | The reporter array in `playwright.config.ts`, formats and output paths          |
| `cypress-reporter-setup`    | The Mocha reporter, by flag or config, and the module API                       |
| `formatters-cli`            | Turning a raw run into HTML, Markdown, JUnit, Cucumber, Confluence, or an Astro site |

## Adoption

Getting from an existing codebase to a working setup.

| Skill                          | Covers                                                              |
| ------------------------------ | ------------------------------------------------------------------- |
| `executable-stories-init`      | Bootstrapping from zero: install, wire the reporter, first story test |
| `vitest-converting-tests`      | Converting an existing Vitest suite incrementally                    |
| `jest-converting-tests`        | The same for Jest                                                    |
| `playwright-converting-tests`  | The same for Playwright                                              |
| `cypress-converting-tests`     | The same for Cypress                                                 |

Conversion skills work file by file, so your suite keeps running through the migration.

## Living docs

Shaping what the scenarios say, before and after they exist.

| Skill                        | Load it when                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `spec-living-documentation`  | Writing specs meant to stay readable long after the feature ships (Gojko Adzic)  |
| `spec-example-mapping`       | Turning a fuzzy conversation into rules, examples, and open questions            |
| `spec-discovery-oopsi`       | Shaping a specification with OOPSI decomposition                                 |
| `spec-outside-in-behaviour`  | Driving design from user goals inward (Dan North)                                |
| `spec-refine-examples`       | Sharpening raw notes or acceptance criteria into precise scenarios               |
| `spec-rules-decision-tables` | Specifying policy, eligibility, or calculation rules without scenario sprawl     |
| `spec-workflow-state`        | Specifying multi-step workflows, approvals, and state transitions                |
| `spec-convert-tests`         | Lifting low-level tests into business-facing specifications                      |
| `spec-plan-to-stories`       | A plan exists and the work has not started: convert it into planned `it.todo` scenarios |
| `spec-review`                | Critiquing existing scenarios for clarity, coverage, and rule separation         |
| `spec-evidence-review`       | Authoring a change as a claim plus typed evidence for the Evidence Review report |

## Understanding

Explaining work that already ran.

| Skill                | Load it when                                                                          |
| -------------------- | ------------------------------------------------------------------------------------- |
| `explain-change`     | Explaining a diff, branch, or PR as living documentation, with citations and a quiz    |
| `executable-lessons` | Teaching a topic as runnable lessons that stay correct because they execute            |

Both refuse to assert behaviour without a scenario behind it. `explain-change` writes "not covered by a scenario" where the run cannot back a claim, and marks anything it drew from the diff as agent-authored.

## Workflow receipts

| Skill                    | Load it when                                                              |
| ------------------------ | ------------------------------------------------------------------------- |
| `linear-evidence-review` | Stamping a Linear issue with an evidence receipt that points at the report |

The receipt links back to the report. Your tracker never becomes the source of truth.

## ESLint

Mechanical enforcement of the rules the API skills describe.

| Skill                      | Covers                                                                   |
| -------------------------- | ------------------------------------------------------------------------ |
| `eslint-vitest-rules`      | `story.init(task)` argument and test-context scoping, init before steps   |
| `eslint-jest-rules`        | Init before steps, story-context scoping, guards for older patterns       |
| `eslint-playwright-rules`  | The same for Playwright specs                                             |

See [ESLint plugins](/reference/eslint-plugins/) for rule-level detail and config.

## Shared reference

`skills/spec-shared/AGENT-GUARDRAILS.md` holds the guardrails the specification skills share. It is not a skill your agent loads on its own; the spec skills point at it.

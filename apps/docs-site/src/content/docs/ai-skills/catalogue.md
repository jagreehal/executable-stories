---
title: Skill catalogue
description: All 63 shipped skills by group, what each one covers, and when your agent should load it.
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
| `rust-story-api`        | The `Story::new()` builder and raw-run output                                       |
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
| `formatters-cli`            | Turning a raw run into HTML, Markdown, JUnit, Cucumber, or Confluence |

## Adoption

Getting from an existing codebase to a working setup.

| Skill                          | Covers                                                              |
| ------------------------------ | ------------------------------------------------------------------- |
| `executable-stories-init`      | Bootstrapping from zero: install, wire the reporter, first story test |
| `vitest-converting-tests`      | Converting an existing Vitest suite incrementally                    |
| `jest-converting-tests`        | The same for Jest                                                    |
| `playwright-converting-tests`  | The same for Playwright                                              |
| `cypress-converting-tests`     | The same for Cypress                                                 |
| `cucumber-converting-tests`    | Migrating a CucumberJS suite: feature files, step definitions, World |

Conversion skills work file by file, so your suite keeps running through the migration.

## Discovery

Turning a vague request into specification material, before any test exists.

| Skill                        | Load it when                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `stories-guide`              | Not sure which skill fits: a router over all of them. Type `/stories-guide` |
| `stories-propose`            | Start here for new work: idea to planned scenarios, then green one at a time. Type `/stories-propose` |
| `spec-grilling`              | One person holds the answers: interrogate them in rounds until the tree is settled |
| `spec-example-mapping`       | Turning a fuzzy conversation into rules, examples, and open questions            |
| `spec-questionnaire`         | The answers belong to someone who is not in the room                             |
| `spec-story-mapping`         | Planning a release as a backbone, journeys, and slices that ship                 |
| `spec-domain-language`       | Three names for one concept, or a scenario nobody outside the team can read      |
| `spec-discovery-oopsi`       | Shaping a specification with OOPSI decomposition                                 |
| `spec-outside-in-behaviour`  | Driving design from user goals inward (Dan North)                                |
| `spec-refine-examples`       | Sharpening raw notes or acceptance criteria into precise scenarios               |
| `spec-rules-decision-tables` | Specifying policy, eligibility, or calculation rules without scenario sprawl     |
| `spec-workflow-state`        | Specifying multi-step workflows, approvals, and state transitions                |

## Living docs

Shaping what the scenarios say, and who gets to read them.

| Skill                        | Load it when                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `spec-living-documentation`  | Writing specs meant to stay readable long after the feature ships (Gojko Adzic)  |
| `spec-convert-tests`         | Lifting low-level tests into business-facing specifications                      |
| `spec-plan-to-stories`       | A plan exists and the work has not started: convert it into planned `it.todo` scenarios |
| `spec-review`                | Critiquing existing scenarios for clarity, coverage, and rule separation         |
| `spec-evidence-review`       | Authoring a change as a claim plus typed evidence for the Evidence Review report |

## Build loop

The daily loop, driven by run artifacts rather than by reading the suite.

| Skill              | Load it when                                                                       |
| ------------------ | ------------------------------------------------------------------------------------ |
| `story-tdd`        | Building a behaviour test-first, with the red step as a published promise             |
| `bug-to-scenario`  | A bug is reported: reproduce it as a failing scenario, fix, keep the reproduction     |
| `failure-triage`   | A run is red or flaky and you need the routed worklist, not the raw list              |
| `agent-loop`       | An agent works unattended and needs a stopping condition it does not control          |

## Delivery

Gating, auditing, and reporting what a run proves.

| Skill                     | Load it when                                                                  |
| ------------------------- | ------------------------------------------------------------------------------- |
| `ci-gates`                | Deciding what blocks a merge, what blocks a release, and what only reports       |
| `coverage-audit`          | Answering "is it covered?" by requirement, by code, and by evidence strength     |
| `release-notes`           | Writing notes from the behavioural diff, including what quietly disappeared      |
| `test-management-bridge`  | TestRail or Xray runs alongside the suite and has to stay a mirror, not a source |
| `report-webmcp`           | A non-developer needs to ask a published report questions from their browser    |

## Understanding

Explaining work that already ran.

| Skill                | Load it when                                                                          |
| -------------------- | ------------------------------------------------------------------------------------- |
| `explain-change`     | Explaining a diff, branch, or PR as living documentation, with citations and a quiz    |
| `explain-system`     | Explaining a whole area for onboarding or handover, grounded in what the suite proves  |
| `executable-lessons` | Teaching a topic as runnable lessons that stay correct because they execute            |
| `show-me`            | "Show me" mid-conversation: the smallest view that makes the point, from the run       |
| `demo-video`         | A narrated demo built from storyboard frames a passing run produced. Type `/demo-video` |

`explain-change`, `explain-system`, and `executable-lessons` refuse to assert behaviour without a scenario behind it. They write "not covered by a scenario" where the run cannot back a claim, and mark anything drawn from reading code as agent-authored.

## Workflow receipts

| Skill                    | Load it when                                                                   |
| ------------------------ | ------------------------------------------------------------------------------ |
| `tracker-to-scenarios`   | Work arrives as a Jira, GitHub, or Linear ticket and has to become scenarios    |
| `tracker-receipts`       | A tracker and the suite have drifted, or a ticket should carry proof it passes  |
| `scenarios-to-tickets`   | A run found work the board does not know about, and it should become tickets    |
| `linear-evidence-review` | Stamping a Linear issue with an evidence receipt that points at the report      |

All three run over MCP, so the tracker can be Jira, GitHub Issues, Linear, or anything
else with a server. The receipt links back to the report. Your tracker never
becomes the source of truth.

`tracker-receipts`, `scenarios-to-tickets`, and `linear-evidence-review` write to your
tracker, so they run only when you type their name (`/tracker-receipts`). Your agent
will not start them on its own. `stories-guide`, `stories-propose`, and `demo-video` work the same way.

## Cloud

Executable Stories Cloud puts every run, manual case and release on one page. These skills need an `es_` API key (or an OAuth session) and do nothing without one.

| Skill                          | Covers                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `executable-stories-cloud`     | Pushing a run from any framework, asking the release gate, export and restore            |
| `cloud-change-aware-testing`   | `push --base` for the recommended scope, `--gate`, the GitHub Action's ingest mode        |
| `cloud-migrate`                | TestRail importer, CSV import from any tool with header synonyms, idempotent re-runs     |
| `cloud-mcp`                    | Connecting an agent by key or OAuth, the read-only profile, the tools, the ESQ query language |

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

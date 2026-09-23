---
name: stories-guide
description:
  Ask which executable-stories skill or flow fits your situation. A router over every
  skill in this repo.
disable-model-invocation: true
---

# Stories Guide

There are more skills here than anyone remembers, so ask. Read the situation, pick the
one path below that fits, and name the skill to load next. When two paths fit, pick the
one earlier on the page.

A **flow** is a path through the skills. Most work travels one **main flow**. Several
**on-ramps** merge onto it, and the rest are setup, delivery, or standalone.

## Setup: nothing is wired yet

- No executable-stories in the repo → `executable-stories-init`.
- The package is installed but no docs appear → the reporter skill for the framework:
  `vitest-reporter-setup`, `jest-reporter-setup`, `playwright-reporter-setup`,
  `cypress-reporter-setup`.
- Writing the first story in a given framework → `vitest-story-api`, `jest-story-api`,
  `playwright-story-api`, `cypress-story-api`, `go-story-api`, `ruby-story-api`,
  `rust-story-api`, `pytest-story-api`, `junit5-story-api`, `xunit-story-api`.
- Lint rules that catch a missing `story.init` → `eslint-vitest-rules`,
  `eslint-jest-rules`, `eslint-playwright-rules`.
- Anything the CLI does (formats, `list`, `check`, `goal`, `compare`) →
  `formatters-cli`.

## The main flow: idea → green

**`/stories-propose`**. It reads what exists, routes the shaping to the right discovery
skill, agrees the test seams, declares planned scenarios, then drives each one green
with `story-tdd`. Start there for any new behaviour, whatever its size.

## On-ramps

A starting situation that produces work, then joins the main flow.

- **A ticket** → `tracker-to-scenarios`. It lands planned scenarios carrying the ticket
  id, then `story-tdd` per scenario.
- **A plan already written** (a PRD, a chat plan, another agent's plan) →
  `spec-plan-to-stories`, then `story-tdd` per scenario.
- **A bug** → `bug-to-scenario`. The reproduction is the red step.
- **A red or flaky run** → `failure-triage`. It routes each failure to its owner.
- **An existing test suite** → `vitest-converting-tests`, `jest-converting-tests`,
  `playwright-converting-tests`, `cypress-converting-tests`, or
  `cucumber-converting-tests`. `spec-convert-tests` rewrites the converted titles as
  behaviour.
- **An agent working unattended** → `agent-loop`. It gives the agent a stopping
  condition it does not control.

## Words and quality, underneath

Reach for these when the words are the problem rather than the process. The flows above
pull them in too.

- Three names for one concept, or a scenario nobody outside the team can read →
  `spec-domain-language`.
- A scenario title that reads like a task → `spec-refine-examples`.
- Not sure which behaviour to build at all → `spec-outside-in-behaviour` (from the
  user's goal inward) or `spec-discovery-oopsi` (outcomes, outputs, process, scenarios,
  inputs).
- Scenarios that exist and need critique → `spec-review`.
- Specs that must stay readable after the feature ships → `spec-living-documentation`.

## Delivery

- What blocks a merge or a release → `ci-gates`.
- "Is it covered?" → `coverage-audit`.
- What shipped, for people who are not engineers → `release-notes`.
- A PR written by an AI that needs reviewing by behaviour and proof →
  `spec-evidence-review`.
- A non-developer querying a published report from their browser → `report-webmcp`.
- TestRail or Xray mirroring the suite → `test-management-bridge`.

## Trackers

These write to the tracker, so you start them by name.

- Stamp tickets with proof from a run → `/tracker-receipts` (Linear only:
  `/linear-evidence-review`).
- File tickets for work the run found and the board is missing →
  `/scenarios-to-tickets`.

## Understanding

- Explain a diff or PR → `explain-change`. A whole area, for onboarding →
  `explain-system`.
- "Show me" in the middle of a conversation → `show-me`.
- A narrated demo from a run's storyboard → `/demo-video`.
- Teach a topic as runnable lessons → `executable-lessons`.

## Cloud

Needs an `es_` API key or an OAuth session.

- Push a run, ask the release gate, export or restore → `executable-stories-cloud`.
- Run only what a change can break, gate the merge → `cloud-change-aware-testing`.
- Import cases from TestRail or a spreadsheet → `cloud-migrate`.
- Connect an agent over MCP, ESQ queries → `cloud-mcp`.

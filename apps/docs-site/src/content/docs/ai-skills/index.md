---
title: Agent skills
description: The 37 skills shipped with executable-stories, what each one covers, and how to install them into Claude Code, Cursor, or any agent that reads project files.
---

A skill is a markdown file that tells your coding agent how to do one job in this codebase. Your agent reads it when the job comes up and follows it instead of guessing.

This repo ships 37 of them. They cover writing story tests in ten languages, wiring reporters, running the CLI, converting an existing suite, shaping specifications, and explaining a change once it ships. Browse them in the [catalogue](/ai-skills/catalogue/) or on [GitHub](https://github.com/jagreehal/executable-stories/tree/main/skills).

## Why they exist

An agent that has never seen this project will write Gherkin feature files, invent a step-matching layer, and put `then` at the top level of a Vitest module where it breaks `await import()`. Each of those mistakes costs a human review cycle to catch.

A skill front-loads the answer. `vitest-story-api` states the callback-only `story.init(task)` rule. `spec-rules-decision-tables` gives you a decision table instead of nine near-identical scenarios. `explain-change` refuses to make a claim about behaviour without citing a scenario that ran.

## Install

### Claude Code

Copy the skill directory into your project. The agent finds it with no further setup:

```bash
npx degit jagreehal/executable-stories/skills/vitest-story-api .claude/skills/vitest-story-api
```

Use `~/.claude/skills/` instead when you want a skill available in every project on your machine.

### Any agent that reads a project file

Cursor, Copilot, Codex, and anything else that loads `AGENTS.md` or `CLAUDE.md` can use the same files. Vendor the directory and point at it:

```bash
git clone --depth 1 https://github.com/jagreehal/executable-stories /tmp/es
cp -R /tmp/es/skills/vitest-story-api docs/skills/vitest-story-api
```

Then add a row to your `AGENTS.md` so the agent knows when to load it:

```markdown
| Task                       | Skill                                   |
| -------------------------- | --------------------------------------- |
| Writing Vitest story tests | `docs/skills/vitest-story-api/SKILL.md` |
```

This repo does exactly that in its own [AGENTS.md](https://github.com/jagreehal/executable-stories/blob/main/AGENTS.md).

### Which ones to start with

Install the few that match your stack rather than all 37:

| You are                          | Install                                     |
| -------------------------------- | ------------------------------------------- |
| Starting from nothing            | `executable-stories-init`                   |
| Writing tests in Vitest          | `vitest-story-api`, `vitest-reporter-setup` |
| Adopting in an existing suite    | `<framework>-converting-tests`              |
| Generating reports in CI         | `formatters-cli`                            |
| Working with product or QA input | `spec-example-mapping`, `spec-review`       |

Add more when you hit the problem they solve. A skill your agent never loads costs you nothing but a directory.

## Where skills stop

A skill shapes what your agent writes. It cannot check the result, so pair it with something that can:

- **ESLint plugins** enforce the structural rules mechanically. `require-init-before-steps` catches a missing `story.init()` whether or not the agent read the skill. See [ESLint plugins](/reference/eslint-plugins/).
- **The report** shows what ran. An agent can claim a scenario passes. The run says whether it did.

`explain-change` and `spec-evidence-review` build on that split. They let an agent narrate a change, and they mark narration as narration, so a reader never mistakes a drawn diagram for a passing test.

## Write your own

A skill needs frontmatter with a name and a description, then the instructions. Your agent matches against the description, so write it as the situation rather than the topic:

```markdown
---
name: regulatory-auditor
description: Use when writing story tests for a regulated feature that needs test case IDs and requirement traceability.
---

# Writing for regulatory auditors

- Give every scenario a test case ID in the format `TC-<AREA>-<NNN>`, in `story.tag`.
- List preconditions as `given` steps before any `when`.
- Add a `story.kv({ label: 'Traceability', value: 'REQ-AUTH-001, SOC2-CC6.1' })` entry.
- Write boundary conditions as separate scenarios, never as an extra assertion.
- Use formal language. No contractions.
```

Two habits keep a custom skill useful. State what to do rather than what to avoid, because a list of prohibitions leaves your agent to invent the positive case. Include a worked example: your agent will copy a pattern it can see, and may reinterpret a rule it has to imagine.

Skills stack. Keep one for your audience and one for your framework, and your agent loads whichever descriptions match the task in front of it.

## Same tests, different readers

Skills change how one run reads for different audiences. Here is a single scenario in three treatments.

**Product owner.** Outcomes and business rules, no implementation.

```
Scenario: User logs in successfully
  A registered user reaches their dashboard with valid credentials.
  Business rule: the session expires after 30 minutes.
```

**Developer.** Endpoints, payloads, storage.

```
Given a registered user exists
When POST /api/auth/login { email, password }
Then the response is 200 with { token, expiresIn: 1800 }
And the session is stored in Redis with TTL 1800s
```

**QA and compliance.** Preconditions, numbered checks, traceability.

```
TC-AUTH-001
Preconditions: account active, fewer than 5 failed attempts
1. Submit valid credentials
2. Verify 200 with JWT
3. Verify the audit log entry
Traceability: REQ-AUTH-001, SOC2-CC6.1
```

The tests underneath do not change. Only the writing does, which is the point: your QA lead and your platform engineer read the same verified behaviour without either of them wading through the other's version.

---
title: AI Writing Skills
description: Teach your AI coding agent to write documentation for your specific audience — product owners, developers, QA teams, or anyone else
---

Your test suite is the single source of truth. But a product owner, a developer, and a QA lead all need different things from the same tests. **AI writing skills** let you control how your coding agent writes documentation — the audience, the tone, the level of detail.

Skills are markdown files you drop into your project. Your AI agent (Claude Code, Cursor, Copilot, or any tool that reads project-level instructions) picks them up and follows them when writing executable stories.

## How it works

1. **Copy a skill file** into your project's `.claude/skills/` directory (or your agent's equivalent)
2. **Tell your agent** to use the skill when writing stories — or it picks it up automatically
3. **The same test suite** produces documentation tuned for your audience

No config. No build step. Just a markdown file that shapes how your agent writes.

## Example: three audiences, one scenario

The same "User logs in successfully" scenario, written for three different readers:

### Product Owner

Outcomes-focused. Business language. No implementation details.

```
Feature: User Authentication

Scenario: User logs in successfully
  A registered user can access their dashboard
  by entering valid credentials.

  Outcome: User sees personalised dashboard
  Business rule: Session expires after 30 minutes
```

### Developer

Technical and concise. Shows endpoints, payloads, and storage.

```
## User logs in successfully

Given a registered user exists in the database
When POST /api/auth/login { email, password }
Then response status is 200
And body contains { token, expiresIn: 1800 }
And session is stored in Redis with TTL 1800s
```

### QA / Compliance

Structured and exhaustive. Preconditions, numbered steps, traceability.

```
TC-AUTH-001: User logs in successfully

Preconditions:
- User account exists and is active
- Account is not locked (< 5 failed attempts)

Steps:
1. Submit valid credentials
2. Verify 200 response with JWT token
3. Verify session created with correct TTL
4. Verify audit log entry created

Traceability: REQ-AUTH-001, SOC2-CC6.1
```

## Available skills

Executable Stories ships 9 specification skills you can use out of the box:

| Skill | Purpose | When to use |
|-------|---------|-------------|
| `spec-discovery-oopsi` | Structure discovery with the OOPSI mapping technique | Collaborative 3 Amigos sessions to explore requirements and avoid analysis paralysis |
| `spec-example-mapping` | Turn conversations into rules, examples, questions | Refining requirements with stakeholders |
| `spec-outside-in-behaviour` | Discover behaviour from user goals (Dan North) | Designing from the outside in |
| `spec-refine-examples` | Refine raw notes into precise specs (Gojko Adzic) | Cleaning up acceptance criteria |
| `spec-rules-decision-tables` | Decision tables for policy/calculation rules | Complex business logic with many conditions |
| `spec-workflow-state` | Workflows, state transitions, approvals | Multi-step processes with branching |
| `spec-living-documentation` | Write specs as lasting documentation | Ensuring docs stay useful over time |
| `spec-convert-tests` | Convert existing tests to business-facing specs | Migrating legacy test suites |
| `spec-review` | Review scenarios for clarity and coverage | Before merging or after writing |

Each skill file lives in `.claude/skills/` and can be used as-is or as a starting point for your own.

## Create your own

Write a markdown file that tells your agent how to write for your audience:

```markdown
# Skill: Write for regulatory auditors

When writing executable stories, follow these rules:

- Every scenario must have a unique test case ID (format: TC-AREA-NNN)
- List all preconditions before steps
- Number each verification step
- Include a Traceability line mapping to requirement IDs
- Use formal language — no contractions, no shorthand
- Include boundary conditions as separate scenarios
```

Drop it into `.claude/skills/` and your agent will follow it when writing stories in this project.

You can combine multiple skills — one for audience, one for methodology. The agent reads all skill files in the directory.

## Links

- [Skills on GitHub](https://github.com/jagreehal/executable-stories/tree/main/.claude/skills) — browse and copy the shipped skill files
- [Executable Stories homepage](/) — see the full feature set

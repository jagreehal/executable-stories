---
name: coverage-audit
description: Use when someone asks what the suite actually proves — before a release, during an audit, when inheriting a codebase, or when a stakeholder asks "is this covered?". Answers coverage from the run artifacts along three axes (requirements, code, evidence strength) instead of quoting a line-coverage percentage that measures execution rather than proof.
---

# Coverage Audit

Line coverage measures which lines ran. It cannot tell you whether anything was asserted,
whether the behaviour a stakeholder cares about is verified, or whether the requirement in
the ticket was ever tested. A codebase at 94% line coverage can have no scenario at all
covering refunds.

This audit answers the three questions people actually mean when they ask about coverage:

1. **Requirements** — is every requirement backed by a scenario? (traceability)
2. **Code** — does the code that changed have a scenario behind it? (evidence)
3. **Proof** — do the scenarios that exist actually prove anything? (strength)

Different people ask different ones. An auditor means the first, a reviewer means the
second, a tech lead who has read the suite means the third.

## Agent guardrails

- **Never present a gap as covered.** An uncovered requirement is the finding. Softening
  it defeats the entire exercise.
- **Do not fix gaps during the audit.** Produce the list first. A half-audited suite with
  three new scenarios in it is worse than an honest list.
- **Say what you could not check.** A requirement with no ticket reference is invisible to
  traceability, and that invisibility is itself a finding, not an omission.
- **Do not confuse a passing scenario with a strong one.** Both axes matter and the report
  keeps them separate for a reason.

## Axis 1: requirements

```bash
executable-stories format reports/raw-run.json \
  --format traceability-matrix,traceability-csv --output-dir reports --output-name audit
```

The matrix is requirement-first: ticket → scenarios → covered code → status. The CSV is
the same data flat, one row per requirement-scenario pair, for auditors and spreadsheets.
Every row carries an `evidence_grade`, and when a requirement has several scenarios the
grade shown is the **weakest** of them, because an audit column that averages overstates.

Two rows types matter more than the rest:

- **A ticket with no scenarios.** The requirement is unverified. This is the headline
  finding of most audits.
- **`requirement_status: untraced`.** A scenario nobody linked to a requirement. Not
  always wrong (plenty of good scenarios have no ticket) but a large untraced block means
  the traceability answer is unreliable rather than good.

To make it a gate instead of a report:

```bash
executable-stories goal reports/raw-run.json --require-tickets PAY-1042,PAY-1043 --goal-format json
```

Exit 5 means at least one required requirement is not passing.

## Axis 2: code

```bash
git diff --name-status "$BASE"..."$HEAD" > changed.txt
executable-stories review reports/raw-run.json --changed-files changed.txt --format html,markdown
```

The Evidence Review correlates changed code to the scenarios that exercise it and grades
each claim. Changed files with no covering scenario surface as uncovered, which is the
question a reviewer of an AI-authored diff is really asking.

The correlation runs on the `covers` field on each story:

```ts
story.init(task, { covers: ['src/checkout/guard.ts', 'src/checkout/policy.ts'] });
```

A suite with no `covers` anywhere can still be audited on axis 1, but axis 2 will be
mostly empty, and the honest reporting of that is "this suite does not declare what it
covers" rather than "the code is uncovered".

## Axis 3: proof

Scenario count is not proof. Read the manifest for structural weakness:

```bash
executable-stories format reports/raw-run.json --format behavior-manifest-json \
  --output-dir reports --output-name audit --minify
```

It carries source files, tags, doc coverage, and debugger warnings. Then read the index
for the scenarios that need a human eye:

```bash
executable-stories list reports/by-file --list-format json
```

For an exact machine count, run `format --json-summary` and read `unasserted`. It is
present only when at least one adapter could observe or declare assertion counts; absent
means unknown. Evidence Review also grades an observably assertion-free passing claim
`none`, which is stronger evidence than inferring from prose structure alone.

Look for these, in rough order of how often they turn out to be real:

| Pattern | Why it fails as proof |
| --- | --- |
| `unasserted` claim | The host observed claim steps but none asserted anything |
| No `then` step | Nothing was claimed, so nothing was verified |
| Planned scenarios | Honest, but they are a promise, not coverage. Count them separately |
| `known-issue` tagged | Documents a limitation. Do not count it as covering the behaviour |
| Skipped or disabled | Coverage on paper only. Ask when it was last run |
| Title names a function, not an outcome | Verifies an implementation detail; will vanish in the next refactor |
| One scenario, six assertions | Six rules, one report line. Five of them are invisible |

The last two are quality findings rather than coverage findings. Route them to
`spec-review` rather than trying to settle them here.

## Reporting the audit

Give the three axes separately and never blend them into a single number. A single
percentage will be quoted out of context within a day.

> **Requirements**: 41 tickets, 34 with a passing scenario, 5 with none (PAY-1101,
> PAY-1140, …), 2 failing. 63 scenarios untraced.
> **Code**: 18 changed files, 14 with covering scenarios, 4 uncovered (all in
> `src/reporting/`).
> **Proof**: 6 scenarios assert nothing, 11 planned, 3 known-issue.

Then the recommendation, which should be a short list of specific scenarios to write, not
a target number. "Write scenarios for PAY-1101 and PAY-1140 before the release" is
actionable. "Raise coverage to 85%" is not.

## Making the audit repeatable

An audit run once is a document. Run it every release and the delta becomes the useful
part:

```bash
executable-stories compare last-release/raw-run.json reports/raw-run.json --format changelog
```

Scenarios that disappeared between releases are the finding auditors care about most, and
they are invisible to every coverage tool that looks at one run.

## Relationship to neighbouring skills

- `spec-review` critiques scenario quality in depth; this skill only flags the structural
  cases it can detect from artifacts.
- `spec-evidence-review` is the authoring side of axis 2: how to write changes so the
  evidence exists to be found.
- `test-management-bridge` answers coverage against an external test-management system
  rather than against tickets.
- `ci-gates` turns any of these three axes into something that blocks a merge.
- `release-notes` reports the same data forwards (what shipped) rather than as a gap list.

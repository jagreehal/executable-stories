---
name: bug-bash
description: Use when someone asks for a bug bash, an exploratory sweep, or "go find what's broken in X" in a repo that uses executable-stories. Fans exploration out over areas of the app, one charter and one posture each, triages out what the environment, the design, or the seed data explain, and counts a finding as a bug only once a scenario reproduces it by failing for the reported reason.
---

# Bug Bash

An explorer that clicks around for twenty minutes comes back with fifteen findings. Four
trace to a missing API key in the local stack, three describe intended design, two come
from seed data, one misreads the page, and five might be real. This skill sorts them
before a person reads the list.

**A finding counts as a bug once a scenario fails for the reported reason.** The report
lists every other finding as a hypothesis.

## Agent guardrails

- **Report a bug only with a failing scenario.** A finding without one goes under
  unverified risks or rejected.
- **The repro must fail on the assertion that encodes the bug.** A scenario that fails at
  its `given`, on a missing selector, or on a timeout points at the test. Fix the test and
  rerun.
- **Triage before you write tests.** Read the source to sort each finding. A repro for an
  environment gap fails on every run and proves nothing about the product.
- **One charter, one area.** Keep each charter to one part of the app so the explorer
  goes deep.
- **Do not fix during the bash.** The output is a verified list. Fixing starts after the
  report, through `bug-to-scenario`.
- **A shared, deployed site is read-only.** No signups, submissions, or injection-shaped
  URLs against an environment other people use. Treat a WAF block as expected.

## 1. Prepare

- Start the app once, from a production build where you can. A dev server that compiles a route
  on first visit reads to an explorer as a dead link. Every explorer shares this one
  instance, so start it yourself rather than letting each explorer boot its own.
- Seed one disposable account or workspace per charter. Explorers that share an account
  report each other's edits as bugs.
- Write down what the local stack cannot do: integrations with no keys, emails it never
  sends, data that is seed rather than real, anything that must never be clicked (paid
  actions, real accounts). Every explorer gets this list. Without it, environment gaps
  dominate the findings.
- Read what the suite already claims, so explorers do not rediscover covered behaviour:

```bash
executable-stories list reports/by-file --list-format json
```

## 2. Plan charters

A charter is one sentence: one area, one posture, a start point, and the account to use.
Read the routes, forms, and navigation first. On a branch, `git diff --stat` against the
base tells you where to aim.

| Posture | Charter shape |
| --- | --- |
| First-time user | Starting at /signup, sign up and finish onboarding like a newcomer; report anything confusing, broken, or inconsistent |
| Numbers and copy | Starting at /cart, change quantities and apply a coupon; check every price, total, and label against every other place it appears |
| Edge input | Starting at /settings/profile, submit each field empty, 300 characters long, in unicode, and with leading spaces; report missing or wrong validation |
| State | Starting at /projects, create, rename, and delete a project, reloading and going back after each; report state that is lost or stale |
| Error paths | Starting at /login, try a wrong password, an unknown account, and a locked one; report errors that are missing, misleading, or leak detail |

Aim for five to ten charters. Overlap is fine; step 4 merges duplicates. An edge-input
charter names its exact input matrix, or it spends its budget before judging a single
result. For an API or a CLI rather than a UI, keep the postures and swap the start point
for an endpoint or a command.

## 3. Fan out

Run one explorer per charter, up to four at a time. Use whatever your client offers to
drive the app: subagents with a browser tool (Playwright MCP, `agent-browser`), HTTP
calls for an API, a shell for a CLI. Give each explorer:

- its charter, its account, and the list from step 1;
- a step budget, so it stops and reports rather than wandering;
- a report shape: per finding, a title, the path or request that reaches it, expected,
  actual, and the evidence (screenshot path, response body, log line).

Each explorer writes to its own directory, for example `.bugbash/<slug>/`, so reports
never collide. Add `.bugbash/` to `.gitignore` or delete it when done.

## 4. Merge

Merge findings that describe one defect: same path, same wrong behaviour. Keep the
clearest reproduction and every charter that hit it. Keep cosmetic warnings in a separate
list unless the user asked for polish.

## 5. Triage

Sort every finding before writing any test.

| Bucket | Sign | Outcome |
| --- | --- | --- |
| Explorer artifact | A "dead" link that opens in a new tab, copy that reads broken in the accessibility tree but renders whole, a lazy-loading image, an infinite-scroll sentinel nothing scrolled to | Rejected, naming the check that settled it. Settle this bucket first |
| Environment | Fails on a key, a service, or a limit only the local stack lacks | Rejected, naming the variable or service. If the app handles the gap badly in a way production users would see (a raw stack trace), list it as an unverified risk |
| Design | The code, its tests, its copy, or an existing passing scenario says the behaviour is intended | Rejected, citing the file or scenario |
| Seed data | The fixture lacks a field real records always have | Rejected, naming the field |
| Already known | A failing or `known-issue` scenario already describes it | Rejected as known, naming the scenario |
| Candidate | None of the above | Verify it (step 6) |

## 6. Verify each candidate

Verification is `bug-to-scenario` steps 1 to 3, run once per candidate: check what the
suite already claims, write the reproduction as a scenario named as the guarantee, run it,
and read where it failed. Load that skill for the scenario shape; this section only adds
what a bash needs on top.

- **Split by area.** With subagents, give one verifier per area its three to five
  candidates, up to four at a time. Each reports back per finding: confirmed or rejected,
  the root cause as `file:line` when it found one, the scenario path, and the failure it
  saw.
- **Check the evidence first.** Read `actual` against the screenshot or response. A
  finding the evidence contradicts is rejected before any test is written.
- **Put repros where the suite's glob finds them**, in a `bugbash/` directory beside the
  story tests, using the suite's own file suffix (`.story.test.ts`, `.story.spec.ts`,
  `_test.go`, `test_*.py`, and so on), and tag each `bug-bash`.
- **Run the file alone** with the framework's own filter (a file path for Vitest, Jest,
  and Playwright; `-run` for Go; a node id for pytest), then read the result:

```bash
executable-stories check reports/raw-run.json
```

A candidate is **confirmed** only when the scenario fails on the assertion that encodes
the bug. Any other failure means the test is wrong: fix it and rerun. A scenario that
passes means the bug did not reproduce: reject the finding, say so, and move the scenario
out of `bugbash/`, or offer it as a regression scenario.

## 7. Report

In this order:

1. **Confirmed bugs**, most severe first. Each with a title, the path, expected against
   actual in one line, the root cause when known, the scenario path and its failure, the
   evidence, and the charters that found it.
2. **Unverified risks.** Environment findings that would hurt production users, marked
   unverified, with what it would take to verify each (a staging key, a real email
   provider).
3. **Rejected findings**, grouped by reason: explorer artifact, environment, design, seed
   data, already known, did not reproduce. One line each with the evidence that rejected
   it.
4. Warnings, then the charters run and the areas no charter reached.

The repro scenarios fail until their bugs are fixed, so they stay uncommitted or out of
the gating run until then. Offer to fix each bug through `bug-to-scenario` steps 4 to 6:
the scenario turning green is the proof, and it stays as permanent documentation with its
`bug-bash` tag swapped for the ticket.

## Relationship to neighbouring skills

- `bug-to-scenario` owns the reproduction and the fix. A bug bash is many candidate bugs
  run through its red step, with exploration and triage in front.
- `failure-triage` sorts failures the suite already has. A bug bash looks for failures
  the suite does not have yet.
- `scenarios-to-tickets` files the confirmed bugs on the board once the user wants them
  tracked.

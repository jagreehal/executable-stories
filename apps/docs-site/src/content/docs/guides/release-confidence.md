---
title: Release confidence
description: Gate release branches, track environment drift, and produce tested-together release manifests
---

Executable Stories can turn branch and merge debates into evidence checks. The goal is not to prescribe one Git workflow. The goal is to prove what was tested together, what changed between environments, and whether a release candidate still matches the dev baseline.

This is most useful when your team batches releases: feature branches merge into a dev environment, then production is updated every few weeks.

## Release gate

Use `gate-release` when you have a dev run that represents the tested batch and a release-candidate run that is about to ship:

```bash
executable-stories gate-release reports/dev.raw-run.json reports/rc.raw-run.json \
  --format html,markdown \
  --output-dir reports/release \
  --output-name rc-gate
```

The gate fails when:

- a scenario passed in dev but regressed in the release candidate
- a scenario exists in dev but is missing from the release candidate

That catches the risky case where dev tested `A+B+C`, but production is about to ship `A+C`.

By default, new scenarios in the release candidate are allowed. Make them fail too when the release process requires exact parity:

```bash
executable-stories gate-release reports/dev.raw-run.json reports/rc.raw-run.json \
  --fail-on-new
```

### Allowed exceptions

Use a release policy when an omission or regression is intentional:

```json
{
  "allowedOmissions": ["src-checkout-story-test--legacy-coupon-flow"],
  "allowedRegressions": ["src-admin-story-test--readonly-export"]
}
```

Then pass it to the gate:

```bash
executable-stories gate-release reports/dev.raw-run.json reports/rc.raw-run.json \
  --release-policy .executable-stories/release-policy.json
```

Exceptions are matched by exact scenario id. A policy entry for one scenario cannot excuse a different omitted scenario.

## Release manifest

Use `release-manifest` to create a human-readable record of the exact scenario batch that was tested:

```bash
executable-stories format reports/rc.raw-run.json \
  --format release-manifest \
  --output-dir releases/v2.4.0 \
  --output-name v2.4.0
```

Output:

```text
releases/v2.4.0/v2.4.0.release-manifest.md
```

The manifest includes:

- branch and commit metadata when present in the run
- pass/fail/skipped/pending counts
- every scenario id, title, status, source file, and tag
- a tested-together SHA-256 hash built from scenario ids and statuses

Put the manifest in Confluence, a release ticket, or a CI artifact. It is the answer to “what exactly did we test before this release?”

## Deployment ledger

Record each environment deployment from the run that was deployed:

```bash
executable-stories deploy record reports/dev.raw-run.json \
  --env dev \
  --tag dev-2026-06-02

executable-stories deploy record reports/prod.raw-run.json \
  --env production \
  --tag v2.4.0
```

Default ledger:

```text
.executable-stories/deployments.json
```

Show current environment state:

```bash
executable-stories deploy status
```

Compare environments:

```bash
executable-stories deploy diff dev production
```

The diff reports:

- scenarios only in dev
- scenarios only in production
- scenarios present in both
- scenarios present in both but with different statuses

Persist the ledger if you want later jobs or agents to compare environments. In CI, upload it as an artifact, cache it, or commit it to a release evidence branch.

## GitHub Action

The action supports the same release workflow.

Gate a release candidate:

```yaml
- uses: jagreehal/executable-stories-action@v2
  with:
    mode: gate-release
    gate-dev-run: reports/dev.raw-run.json
    raw-run: reports/rc.raw-run.json
    report-dir: reports/release
    output-name: rc-gate
```

Record a deployment:

```yaml
- uses: jagreehal/executable-stories-action@v2
  with:
    mode: deploy
    raw-run: reports/prod.raw-run.json
    deploy-env: production
    deploy-tag: v2.4.0
```

## MCP tools

Agents can query release evidence through the MCP server:

- `get_deployment_status` — latest deployment per environment
- `get_environment_drift` — scenarios only in one environment, shared scenarios, and status drift

Use these with `get_behavior_diff` when an agent needs to answer “is this branch or release safe to merge?”

## Workflow fit

For batched releases, this fits a simple flow:

1. Merge features into dev.
2. Run the dev suite and keep the raw run.
3. Create the release candidate.
4. Run the RC suite.
5. Run `gate-release` against dev.
6. Generate a `release-manifest`.
7. Deploy and record the deployment.

This does not require feature flags, staging branches, or a new test language. It uses the runs your framework already produced.

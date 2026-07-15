---
title: Evidence Review and Code Diff
description: Review AI-authored changes as claims with graded evidence, and embed the patch itself as content-anchored, scenario-linked Code Diff evidence.
---

AI produces a behaviourally correct change faster than you can understand it. The Evidence Review reframes a test run as communication with evidence: every scenario becomes a **claim**, every claim carries graded proof, and every changed source file is banded by how well it is accounted for. You review the gaps, not the whole diff.

The report is generated from artifacts you already have: the raw-run JSON your framework reporter writes, plus the changed-file list from your CI diff.

```bash
executable-stories review .executable-stories/raw-run.json \
  --changed-files changed.json \
  --base-ref main --head-ref feat/quantity-totals
```

`--changed-files` accepts JSON (`ChangedFile[]` or `{changedFiles, baseRef, headRef}`) or plain `git diff --name-status` output. The command writes `evidence-review.md` (PR-comment-friendly) and `evidence-review.html` (the interactive deep-dive) to `reports/`.

## How changed code is banded

Each changed source file lands in one of three bands, worst first:

| Band | Meaning |
| --- | --- |
| 🔴 Uncovered | no claim or test correlates to this file — review it first |
| 🟡 Weak | only weak evidence (a passing self-authored unit assertion) stands behind it |
| 🟢 Covered | at least moderate evidence: integration-level, screenshot/trace-corroborated, or stronger |

Claim strength climbs from `weak` (a passing test, nothing else) through `moderate` (integration-level, screenshot, OTEL trace, changed-line coverage) to `strong` (failing-first verified, mutation score ≥ 80%, or stakeholder e2e proof backed by screenshot and trace).

Two opt-in gates make the review bite in CI:

```bash
executable-stories review raw-run.json --changed-files changed.json \
  --fail-on uncovered      # exit non-zero when changed code has no evidence
  --min-evidence moderate  # exit non-zero when any claim is below this strength
```

## Code Diff: the patch as scenario-linked evidence

A raw diff is indispensable audit evidence but a poor explanation: its file order is accidental and it makes you infer which lines the tests actually prove. Code Diff embeds a **curated, annotated patch** in the review — annotations in conceptual order, each connected to the executed scenario(s) that demonstrate its effect, with the raw patch one click away.

Two inputs, both supplied at the CLI layer (never by test code — there is no `story.diff()` API):

1. **The patch**, generated with histogram diff for stable hunks:

   ```bash
   git diff --histogram main...HEAD > changes.patch
   ```

2. **An annotation sidecar** naming, per annotation: the file, a substring unique to one changed line, plain-text prose, and the scenario IDs that prove the claim:

   ```json
   {
     "title": "Quantity-aware totals",
     "baseLabel": "main",
     "headLabel": "feat/quantity-totals",
     "annotations": [
       {
         "file": "src/cart/totals.ts",
         "match": "item.price * item.quantity",
         "label": "Core calculation",
         "text": "Totals now multiply by quantity before tax.",
         "scenarioIds": ["quantity-multiplies-the-line-total"]
       }
     ]
   }
   ```

   Take scenario IDs from the scenario index (`executable-stories list raw-run.json --list-format json`) — never invent them.

Feed both into the review:

```bash
executable-stories review raw-run.json \
  --changed-files changed.json \
  --patch changes.patch \
  --code-diff sidecar.json
```

The HTML report renders each annotation with its prose, its scenario references as status deep links (✅/❌ linking to the claim card in the same report), and its hunk with the anchored lines highlighted. An annotation with no `scenarioIds` renders visibly as "not covered by a scenario" — leave it that way rather than citing a scenario that does not prove it. The full raw patch sits behind a disclosure for audit; patches over the embed cap render a link instead.

## Content anchors: annotations that survive regeneration

Annotations do not use line numbers — line numbers detach the moment the patch is regenerated, which for AI-authored changes is constantly. Each annotation is anchored to the **content** of its changed lines plus surrounding context, and relocates in a regenerated patch the way `patch(1)` does, with bounded fuzz.

| State | Meaning |
| --- | --- |
| Anchored | exactly one confident match — the annotation renders on its hunk |
| Ambiguous | the lines appear in more than one place — rendered visibly unattached, never guessed |
| Orphaned | the lines were rewritten — rendered with a "could not locate in current patch" notice |

An annotation is never silently reattached to the wrong lines. Treat an orphaned annotation like a stale explainer: rewrite it against the current patch.

## Gating stale evidence in CI

Assembly and rendering both emit warnings for orphaned or ambiguous anchors and for scenario references that no longer exist in the run. `--strict-code-diff` turns those warnings into review-gate failures:

```bash
executable-stories review raw-run.json \
  --patch changes.patch --code-diff sidecar.json \
  --strict-code-diff
```

This is how a living explanation stays grounded: when the code moves on, the build tells you before a reader trusts a mislabelled hunk.

## Contract notes

- Annotation `text` is plain text, rendered verbatim — never interpreted as HTML or Markdown.
- Patch content always renders as escaped text; it can never execute or alter the report DOM.
- A `patchUrl` (audit provenance) renders as a link only when it is `https:`; anything else renders inert.
- The Markdown output preserves the annotations, scenario references, orphan notices, and a fenced patch below the size cap — it does not pretend to be an interactive viewer.
- The full Code Diff data (parsed hunks, anchor resolutions, scenario refs) serialises on the review result, so custom consumers can rebuild the evidence surface.

## Where it fits

- The **`explain-change` skill** authors the sidecar as part of a full explainer: behaviour first (`compare`), patch second, quiz last.
- **[Agent loops and backpressure](/guides/agent-loops/)** covers the commands agents use before a human reviews at all.
- The **[formatters API reference](/reference/formatters-api/)** lists every `review` flag.

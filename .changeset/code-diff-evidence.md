---
'executable-stories-formatters': minor
---

Code Diff evidence for the Evidence Review report. A unified patch (`git diff --histogram`) plus an annotation sidecar enter at the CLI layer (`review --patch --code-diff`), never through adapters. Annotations are content-anchored (hashed changed lines + context window, patch(1)-style fuzzy relocation) and resolve to anchored, ambiguous, or orphaned — never silently reattached. Each annotation cites scenario IDs, rendered as status deep links into the review; missing scenarios show as unverified references and hunks without scenarios as "not covered". The review HTML renders a hand-rolled escaped unified-diff viewer (no diff library, no island cost) with the raw patch available on demand; Markdown gets a static fallback. `--strict-code-diff` gates CI on orphaned anchors or unverified references. New exports: `parseUnifiedDiff`, `createAnchor`, `relocateAnchor`, `assembleCodeDiff`, and the Code Diff review types.

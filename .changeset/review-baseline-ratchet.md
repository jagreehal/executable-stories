---
"executable-stories-formatters": minor
---

`review --baseline <run>` compares the run with the base branch's run and lists each scenario that checks less as a `weakened` finding in `.review.json`: removed, newly skipped, or making fewer steps or assertions across two passing runs. The `goal` ratchet counts assertions too and follows renamed scenarios. The Action takes the base run as `baseline-run`.

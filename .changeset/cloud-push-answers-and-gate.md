---
"executable-stories-formatters": minor
---

`push` reads the ingest endpoint's answer instead of discarding it, and can
block on the release gate.

Ingest returns the run's URL and the scope the change implies; `push` printed
only the run id, so both died on the wire and the CI log said nothing useful.
It now prints the URL and each recommended case with the reason it was picked.

`push --gate` asks `GET /api/v1/releases/gate` whether the pushed commit is
safe to release and exits 5 when it is blocked, naming every blocking reason.
The policy lives in the organization's settings rather than a file in the
repo, which is the point: manual results, evidence requirements, and eval
thresholds are not things a repository can hold on its own. A commit with no
release recorded against it exits 0 — CI asking early is normal, and a verdict
invented from no evidence is worse than saying there is nothing to gate on.
An unreachable or erroring gate fails the build rather than passing it.

`push` now reads the GitHub Actions environment: repo, branch, and SHA from
the standard variables; the base commit and PR number from the event payload,
fetching that commit when a depth-1 checkout has not got it; the run URL and
recommended scope written to `GITHUB_STEP_SUMMARY`; the run id appended to
`GITHUB_OUTPUT` as `ingest-run-id`, before the gate runs, so a blocked release
still reports where the run landed. No flags are needed for any of it, and it
works in a hand-rolled workflow rather than only through our Action — which
now shells out to `push` instead of carrying its own copy of the wire
contract.

The payload's `source` is `local`, or `action` under GitHub Actions. It was
`serve`, which named a subcommand removed some releases ago. The endpoint
accepts all three.

---
"executable-stories-formatters": patch
---

pytest: reports keyed to the project, and a run that says what it reached

Source paths in the run are relative to pytest's root directory, so the report a
file owns under `reports/by-file/` keeps its identity across machines and CI. A
test is keyed to the file it was collected from, so an inherited test method
belongs to the subclass that ran it.

Runs report `coveredSourceFiles`, every file a test ran in, so a `full`-scope run
can retire a scenario its file no longer names — and a run whose files told no
story at all is written, because that is the run the inventory is for. Files the
run cannot speak for go to `incompleteSourceFiles`: a skipped test, a broken
fixture or teardown, a module that failed to import, or a test that failed before
`story.init`. Each keeps what it last documented until a run can account for it
in full.

`runScope` recognises every way pytest narrows a run: `-k`, `-m`, `--deselect`,
`--last-failed`, a `file.py::test` node id, and a run that ended early through
`-x`, `--maxfail`, Ctrl-C, or an internal or usage error. Runs carry `gitSha` —
from CI first, `git rev-parse` otherwise, bounded by its timeout — and
`packageVersion`, so a report states the commit it describes and what produced
it. A relative `EXECUTABLE_STORIES_OUTPUT` resolves against the project root, and
the run file is renamed into place, so a watch task reading it while a run
finishes sees a whole document. `story.video(path, caption=None, poster=None)`
completes the doc-entry surface against the raw-run schema.

The pytest reference and the `pytest-story-api` skill cover feature declarations,
planned scenarios, screenshots and video, embedded HTML, the run-inventory
fields, and the signatures for `attach_spans`, `start_timer`/`end_timer`,
`story.fn` and `story.expect`, under the `executable_stories` import name.
Prerequisites read Python 3.12 and pytest 8. `verify:pytest` asserts the
covered-file inventory, its project-relative paths and the commit sha, and the
package's ruff and mypy gates run in CI.

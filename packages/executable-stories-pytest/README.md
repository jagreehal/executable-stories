# executable-stories-pytest

pytest plugin for executable-stories.

Adds BDD-style story helpers and emits raw story run JSON so pytest tests can be rendered into executable documentation.

## Install

```bash
pip install executable-stories-pytest
```

The PyPI distribution name is `executable-stories-pytest`, but the import name is `executable_stories`:

```python
from executable_stories import story
```

## Usage

```python
from executable_stories import story


def test_login_success():
    story.init("User logs in", tags=["auth", "smoke"])
    story.given("a registered user")
    story.when("they submit valid credentials")
    story.then("they see the dashboard")
```

## Features

- BDD steps: `given`, `when`, `then`, `and_`, `but`
- Aliases: `arrange`, `act`, `assert_`, `setup`, `context`, `execute`, `action`, `verify`
- Rich docs: `note`, `tag`, `kv`, `json`, `code`, `table`, `link`, `section`, `mermaid`, `screenshot`, `video`, `html`, `state`, `custom`
- `story.state(value, label=None)` — JSON-serializable snapshot of "what the world looks like" at this step (a storyboard frame); consecutive same-label states are diffed at render time
- Feature declarations: `story.feature(...)` at module level heads every scenario in the file
- Planned scenarios: `story.planned("…")` records behaviour that is specified but not built
- Source coverage links: `covers=[...]` in `story.init(...)`
- Step timing: `start_timer` / `end_timer`
- Attachments: `attach(...)`
- OTel spans + trace links: `attach_spans(...)`, `trace_url_template` in `story.init(...)`, `OTEL_TRACE_URL_TEMPLATE`

## Output

The plugin writes `.executable-stories/raw-run.json` under pytest's root directory when the
session finishes. Set `EXECUTABLE_STORIES_OUTPUT` to move it: a relative path is resolved
against the project root, an absolute one is used as given. The file is renamed into place,
so a reader never sees a half-written run.

Formatting the raw run updates one canonical report per source file under `reports/by-file/`.
Each run says what it reached so those reports stay honest as tests come and go:

- `coveredSourceFiles` — every file the run executed a test in, whether or not it produced a
  story, so deleting a file's last scenario retires it
- `incompleteSourceFiles` — files the run cannot speak for: a skipped test, a broken fixture
  or teardown, a module that failed to import, or a test that failed before `story.init`
- `runScope` — `"filtered"` for `-k`, `-m`, `--deselect`, `--last-failed`, a `file.py::test`
  node id, or a run that ended early (`-x`, `--maxfail`, Ctrl-C, an internal or usage
  error); otherwise `"full"`
- `gitSha` and `packageVersion` — which commit the run describes, and what produced it

Source paths are relative to the project root, so a report keeps its identity across machines
and CI.

pytest exposes no assertion counter. Use `story.expect("claim", callable)` to declare
assertion evidence. A plain `story.then()` followed by Python `assert` remains unobserved,
not zero.

Pass that file to the `executable-stories` CLI (from the `executable-stories-formatters` package) to render reports:

```bash
npx --package executable-stories-formatters executable-stories format .executable-stories/raw-run.json --format html

# The path is optional — `format` defaults to .executable-stories/raw-run.json
npx --package executable-stories-formatters executable-stories format --format html

# Diagnose the run JSON if a report won't generate (schema drift, empty run)
npx --package executable-stories-formatters executable-stories doctor
```

Supported formats include `html`, `markdown`, `junit`, and the Cucumber outputs. Use `--output-dir` to choose where reports are written.

## Verify

From repo root:

```bash
pnpm run verify:pytest
```

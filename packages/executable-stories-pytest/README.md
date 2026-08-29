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
- Rich docs: `note`, `tag`, `kv`, `json`, `code`, `table`, `link`, `section`, `mermaid`, `screenshot`, `html`, `state`, `custom`
- `story.state(value, label=None)` — JSON-serializable snapshot of "what the world looks like" at this step (a storyboard frame); consecutive same-label states are diffed at render time
- Source coverage links: `covers=[...]` in `story.init(...)`
- Step timing: `start_timer` / `end_timer`
- Attachments: `attach(...)`
- OTel spans + trace links: `attach_spans(...)`, `trace_url_template` in `story.init(...)`, `OTEL_TRACE_URL_TEMPLATE`

## Output

The plugin detects `-k` and `-m` selectors as `runScope: "filtered"`; an invocation
without either reports `"full"`. Formatting the raw run updates one canonical report per
source under `reports/by-file/`.

pytest exposes no assertion counter. Use `story.expect("claim", callable)` to declare
assertion evidence. A plain `story.then()` followed by Python `assert` remains unobserved,
not zero.

The plugin writes raw run JSON under:

- `.executable-stories/raw-run.json`

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

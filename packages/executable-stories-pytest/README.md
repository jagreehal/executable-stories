# executable-stories-pytest

pytest plugin for executable-stories.

Adds BDD-style story helpers and emits raw story run JSON so pytest tests can be rendered into executable documentation.

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
- Rich docs: `note`, `tag`, `kv`, `json`, `code`, `table`, `link`, `section`, `mermaid`, `screenshot`, `html`, `custom`
- Step timing: `start_timer` / `end_timer`
- Attachments: `attach(...)`
- OTel spans + trace links: `attach_spans(...)`, `trace_url_template` in `story.init(...)`, `OTEL_TRACE_URL_TEMPLATE`

## Output

The plugin writes raw run JSON under:

- `.executable-stories/raw-run.json`

Pass that file to `executable-stories-formatters` for report generation.

## Verify

From repo root:

```bash
pnpm run verify:pytest
```

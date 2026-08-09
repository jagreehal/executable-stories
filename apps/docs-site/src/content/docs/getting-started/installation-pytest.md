---
title: Installation (pytest)
description: Install executable-stories-pytest and start recording scenarios from pytest tests
---

## Install the package

```bash
pip install executable-stories-pytest
```

Requires Python 3.12 or later and pytest.

## No configuration required

The package registers itself as a pytest plugin automatically. No changes to `pytest.ini`, `pyproject.toml`, or `conftest.py` are needed. Import `story` in your test file and start recording:

```python
from executable_stories import story
```

## Default output

After pytest finishes, the plugin writes `.executable-stories/raw-run.json`. Pass that file to `executable-stories-formatters` to render a report.

## Generate a report

```bash
npx --package executable-stories-formatters executable-stories format --format markdown
```

Install the formatters package once in your Node project or CI job:

```bash
npm install -D executable-stories-formatters
```

## Next

[First Story (pytest)](/getting-started/first-story-pytest/) — write your first pytest scenario.

[pytest story & doc API](/reference/other-adapters/#pythonpytest) — steps, docs, and adapter options.

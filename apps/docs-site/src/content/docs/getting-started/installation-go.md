---
title: Installation (Go)
description: Install executable-stories-go and configure TestMain to write raw run JSON
---

## Install the package

```bash
go get github.com/jagreehal/executable-stories/packages/executable-stories-go
```

Require Go 1.22 or later.

## TestMain setup

Add a `TestMain` function to each test package that should produce a report. `RunAndReport` runs the tests and writes the raw run JSON before exiting:

```go
package mypackage_test

import (
	"os"
	"testing"

	es "github.com/jagreehal/executable-stories/packages/executable-stories-go"
)

func TestMain(m *testing.M) {
	os.Exit(es.RunAndReport(m))
}
```

`RunAndReport` writes `.executable-stories/raw-run.json` by default. Set the `EXECUTABLE_STORIES_OUTPUT` environment variable to write to a different path.

## Generate a report

Render the raw run JSON with `executable-stories-formatters` to Markdown, HTML, JUnit XML, or Cucumber formats. The CLI defaults its input to `.executable-stories/raw-run.json` (then `reports/raw-run.json`), so no path is needed:

```bash
npx --package executable-stories-formatters executable-stories format --format markdown
```

If the file is missing or won't format, run `executable-stories doctor` — it reports where the run JSON is, whether it parses, and whether its schema version matches the CLI.

Install the formatters package once in your Node project or CI job:

```bash
npm install -D executable-stories-formatters
```

## Next

[First Story (Go)](getting-started/first-story-go/) — write your first Go scenario.

[Go story & doc API](reference/go-story-api/) — steps, docs, and adapter options.

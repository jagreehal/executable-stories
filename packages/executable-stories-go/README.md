# executable-stories-go

Go adapter for executable-stories.

Provides framework-native BDD-style story helpers for `testing.T` and writes raw story run JSON that can be formatted by `executable-stories-formatters`.

## Install

The canonical module path is `github.com/jagreehal/executable-stories/packages/executable-stories-go`. Release tags are prefixed (e.g. `go-executable-stories-v0.1.0`), not bare `v0.1.0`, so target the tag explicitly:

```bash
go get github.com/jagreehal/executable-stories/packages/executable-stories-go@go-executable-stories-v0.1.0
```

## Usage

```go
package mypkg_test

import (
	"testing"

	es "github.com/jagreehal/executable-stories/packages/executable-stories-go"
)

func TestAddition(t *testing.T) {
	s := es.Init(t, "adds two numbers", es.WithTags("math"))
	s.Given("two numbers 2 and 3")
	s.When("I add them")
	s.Then("the result is 5")

	if 2+3 != 5 {
		t.Fatal("wrong result")
	}
}
```

## Features

- BDD steps: `Given`, `When`, `Then`, `And`, `But`
- Rich docs: note, kv, json, code, table, link, section, mermaid, screenshot, html, state, custom
- Step timing: `StartTimer` / `EndTimer`
- Trace links: `WithTraceUrlTemplate(...)` or `OTEL_TRACE_URL_TEMPLATE`
- Ticket/tag/meta options at `Init(...)`

## State snapshots

`State(label, value)` captures a JSON-serializable snapshot of "what the world looks like" at the current step. Consecutive snapshots with the same label are diffed by the report renderer (storyboard frames); the adapter only serializes and emits. An empty label means an anonymous state lane (the label field is omitted).

```go
s.Given("an item is added to the basket")
s.State("Basket", basket) // any JSON-serializable value

s.When("a discount is applied")
s.State("Basket", basket) // same label → diffed against the previous frame
```

## Output

The adapter writes raw run JSON to:

- default: `.executable-stories/raw-run.json`

Use `executable-stories-formatters` to generate HTML/Markdown/JUnit/Cucumber output.

## CLI handoff

`go test -run` is detected automatically: a plain invocation reports `runScope: "full"`
and a narrowed one reports `"filtered"`. Formatting the raw run updates one canonical
report per source under `reports/by-file/`, so focused runs preserve untouched sources.

Go has no assertion counter. Use `s.Expect("claim", func() { ... })` when a claim should
declare assertion evidence. A plain `s.Then()` followed by `t.Error`/`t.Errorf` remains
unobserved, not zero.

After running tests, turn the raw-run JSON into reports with the `executable-stories` CLI:

```bash
# The path is optional — `format` defaults to .executable-stories/raw-run.json
executable-stories format --format html

# Diagnose the run JSON if a report won't generate (schema drift, empty run)
executable-stories doctor

# Generate an HTML report
executable-stories format .executable-stories/raw-run.json --format html

# Canonical StoryReport v1 JSON (machine contract)
executable-stories format .executable-stories/raw-run.json --format story-report-json --output-dir reports --output-name index

# List scenarios (discovery / failure triage)
executable-stories list reports/by-file --list-format json
```

## Verify

From repo root:

```bash
pnpm run verify:go
```

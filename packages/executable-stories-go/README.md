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
- Arrange/act/assert names for the same steps: `Arrange`, `Act`, `Assert`, plus `Setup`, `Context`, `Execute`, `Action`, `Verify`
- Rich docs: note, kv, json, code, table, link, section, mermaid, screenshot, video, html, state, custom
- Step timing: `StartTimer` / `EndTimer`, or `Fn` / `Expect` to time a body
- Trace links: `WithContext(ctx)` plus `WithTraceUrlTemplate(...)` or `OTEL_TRACE_URL_TEMPLATE`
- Ticket/tag/meta/covers options at `Init(...)`
- Attachments: `Attach`, `AttachInline`, or `AttachOptions` for the full set of fields
- Assertion evidence: `Check`

Subtests set the suite path: a story in `TestCheckout/discounts/percentage` is
reported under `TestCheckout > discounts`.

## Docs on a step

A doc method attaches to the step that is currently open, or to the story when
no step has been declared yet.

```go
s.Given("valid credentials")
s.JSON("Credentials", creds)
s.Note("The password is masked")
```

Build entries with the `*Entry` constructors and hand them to the step instead
when you would rather read the step and its evidence in one place:

```go
s.Given("valid credentials",
	es.JSONEntry("Credentials", creds),
	es.NoteEntry("The password is masked"))
```

## OTel bridge

Go carries the active span in the context, so the story has to be handed it.
Pass `WithContext(ctx)` and the bridge runs both ways: the trace ID and a trace
link land on the story, and the story's scenario, tags, and tickets land on the
span as attributes. Without a context the bridge stays inert.

```go
autotel.TraceFunc(ctx, "checkout", func(tc autotel.TraceContext) (int, error) {
	s := es.Init(t, "checkout charges the card", es.WithContext(tc.Context()))
	s.Given("a basket with one item")
	// ...
	return total, nil
})
```

Set the link template with `es.WithTraceUrlTemplate("https://tempo.example/trace/{traceId}")`
or the `OTEL_TRACE_URL_TEMPLATE` environment variable.

When the test creates the trace itself — a root span opened after `Init` ran —
the init-time bridge has nothing to see. Wire it at the end instead, along with
the spans the run recorded:

```go
s.AttachSpansWithTrace(serialized, es.TraceRef{TraceID: traceID, SpanID: spanID})
```

`AttachSpans` accumulates, so a scenario can attach spans as it goes.

## Assertion evidence

A report is worth more when a claim can show it was checked. The JS adapters
read the test runner's live assertion counter, so a bare `expect()` after a
marker is attributed on its own. Go has no such counter, and a hand-written
`if got != want { t.Errorf(...) }` is invisible to any library — so the claim
has to go through `Check`:

```go
s.Then("the basket totals £42")
s.Check(basket.Total == 4200, "expected 4200, got %d", basket.Total)
```

`Check` fails the test through `t.Errorf` when the condition is false and
returns the condition, so a caller can stop early. `*testing.T` provides
`Errorf`; a custom `TestingT` without it panics on a failed check rather than
letting an unenforceable claim reach the report:

```go
if !s.Check(err == nil, "charge failed: %v", err) {
	return
}
```

Checks are attributed to the step that was open when they ran, and the last
step's count is settled when the test ends. A wrapped step counts its own body:

```go
s.Expect("the totals line up", func() {
	s.Check(basket.Subtotal == 4000, "subtotal")
	s.Check(basket.Tax == 200, "tax")
})  // reported as 2 assertions
```

A wrapped claim that runs no `Check` still reports one — the body ran to
completion, which is evidence in itself. A plain `s.Then()` with no `Check`
stays unobserved, which the report distinguishes from a claim that asserted
nothing.

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

See "Assertion evidence" for how a claim declares what it checked.

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

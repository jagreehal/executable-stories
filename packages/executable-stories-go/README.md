# executable-stories-go

Go adapter for executable-stories.

Provides framework-native BDD-style story helpers for `testing.T` and writes raw story run JSON that can be formatted by `executable-stories-formatters`.

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
- Aliases: `Arrange`, `Act`, `Assert`, `Setup`, `Context`, `Execute`, `Action`, `Verify`
- Rich docs: note, kv, json, code, table, link, section, mermaid, screenshot, html, custom
- Step timing: `StartTimer` / `EndTimer`
- Trace links: `WithTraceUrlTemplate(...)` or `OTEL_TRACE_URL_TEMPLATE`
- Ticket/tag/meta options at `Init(...)`

## Output

The adapter writes raw run JSON to:

- default: `.executable-stories/raw-run.json`

Use `executable-stories-formatters` to generate HTML/Markdown/JUnit/Cucumber output.

## Verify

From repo root:

```bash
pnpm run verify:go
```

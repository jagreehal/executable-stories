---
name: go-story-api
description: >
  Use when writing BDD story tests in Go with executable-stories-go:
  Init(t, scenario, opts...), Given/When/Then/And/But steps, doc entries, or
  RunAndReport output in TestMain.
type: core
library: executable-stories-go
library_version: "0.1.0"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-go/story.go"
  - "jagreehal/executable-stories:packages/executable-stories-go/doc.go"
---

# executable-stories-go — Story API

## Install

The canonical module path is `github.com/jagreehal/executable-stories/packages/executable-stories-go`. Release tags are prefixed (e.g. `go-executable-stories-v0.1.0`), not bare `v0.1.0`, so target the tag explicitly:

```bash
go get github.com/jagreehal/executable-stories/packages/executable-stories-go@go-executable-stories-v0.1.0
```

## Setup

```go
package cart_test

import (
    "testing"
    es "github.com/jagreehal/executable-stories/packages/executable-stories-go"
)

func TestMain(m *testing.M) {
    es.RunAndReport(m)
}

func TestAppliesDiscountCode(t *testing.T) {
    s := es.Init(t, "Applies discount code",
        es.WithTags("checkout"),
        es.WithTicket("CART-42"),
        es.WithCovers("internal/checkout/total.go"),
    )

    s.Given("a cart with items totaling $100")
    cart := createCart([]item{{Name: "Shirt", Price: 100}})

    s.When("a 20% discount code is applied")
    applyDiscount(cart, "SAVE20")

    s.Then("the total is $80")
    if cart.Total != 80 {
        t.Errorf("expected 80, got %d", cart.Total)
    }

    s.And("the discount is shown in the summary")
    if len(cart.Discounts) != 1 {
        t.Error("expected 1 discount")
    }
}
```

`RunAndReport(m)` in `TestMain` writes `.executable-stories/raw-run.json` after all tests complete. Override output path with `EXECUTABLE_STORIES_OUTPUT` env var.

## Core Patterns

### Step markers with Auto-And conversion

First call to `Given()`, `When()`, or `Then()` renders the keyword as-is. Subsequent calls to the same keyword auto-convert to "And". Explicit `And()` always renders "And". Explicit `But()` always renders "But" and never auto-converts.

```go
func TestBlocksSuspendedUser(t *testing.T) {
    s := es.Init(t, "Blocks suspended user login")

    s.Given("the user account exists")         // renders "Given"
    s.Given("the account is suspended")         // renders "And" (auto-converted)
    s.When("the user submits valid credentials")
    s.Then("the user sees an error message")
    s.But("the user is not logged in")          // renders "But" (always)
    s.But("no session is created")              // renders "But" (always)
}
```

### Doc entries attached to steps

```go
func TestProcessesPayment(t *testing.T) {
    s := es.Init(t, "Processes payment")

    s.Given("a valid payment request")
    s.JSON("Request payload", map[string]any{"amount": 50, "currency": "USD"})
    s.Kv("Gateway", "stripe")

    s.When("the payment is submitted")
    s.Code("Response", `{ "status": "ok" }`, "json")

    s.Then("the order is confirmed")
    s.Table("Order summary",
        []string{"Item", "Qty", "Price"},
        [][]string{{"Widget", "2", "$25"}},
    )
    s.Link("API docs", "https://docs.example.com/payments")
    s.Note("Payment processed in sandbox mode")
}
```

### Embedded HTML

Embed generated HTML (charts, single-file reports, skill/agent output) in an
always-sandboxed iframe in the report. Exactly one of `path` / `url` / `content`
is required; optional `title` and `height` (number → px, string passed through; default 400px).

```go
s.Html(es.HtmlOptions{Content: chartHTML, Title: "Latency chart", Height: 600})
s.Html(es.HtmlOptions{URL: "https://dash.example.com/run/42", Height: 600})
s.Html(es.HtmlOptions{Path: "./reports/summary.html", Title: "Summary"})
```

**Source guidance:** generated/ephemeral HTML (a skill writing to a temp dir) → pass `content`
(captured now, survives temp-dir cleanup). Stable on-disk artifact → pass `path` (inlined at format time).

**The embedded HTML must be self-contained (a single file).** Local files are inlined as the
iframe's `srcdoc`; relative references to sibling CSS/JS/images are not rewritten, so a multi-file
report renders broken. Use a single-file/inline mode or pass markup via `content`. Directory bundling is planned.

**Sandbox-safe contract:** renders inside `<iframe sandbox="allow-scripts">` (opaque origin, no
allow-same-origin). CDN scripts (Tailwind, Mermaid) and inline DOM scripts work; `localStorage`/
`sessionStorage`/cookies throw `SecurityError` (and an unguarded access aborts the rest of that
script block) — guard with try/catch or avoid. No `window.top`/parent access; no popups.

### Step wrappers with timing

```go
func TestFetchesUserProfile(t *testing.T) {
    s := es.Init(t, "Fetches user profile")

    s.Given("a registered user")

    s.Fn("When", "the profile is fetched", func() {
        profile = fetchProfile("user-123")
    })

    s.Expect("the profile contains the correct name", func() {
        if profile.Name != "Alice" {
            t.Error("wrong name")
        }
    })
}
```

`Fn` and `Expect` wrap a closure as a step with automatic timing. Panics propagate after duration is recorded.

### Init options

```go
s := es.Init(t, "My scenario",
    es.WithTags("smoke", "auth"),
    es.WithTicket("AUTH-42"),
    es.WithMeta(map[string]any{"priority": "high"}),
    es.WithTraceUrlTemplate("https://jaeger.example.com/trace/{traceId}"),
)
```

### Manual step timing

```go
s.Given("a step to time")
token := s.StartTimer()
// ... work ...
s.EndTimer(token)
```

### Attachments

```go
s.Attach("debug.log", "text/plain", "/tmp/debug.log")
s.AttachInline("config", "application/json", `{"key":"val"}`, "IDENTITY")
```

## Common Mistakes

### CRITICAL Missing TestMain with RunAndReport

Wrong:

```go
// No TestMain — raw-run.json is never written
func TestMyScenario(t *testing.T) {
    s := es.Init(t, "My scenario")
    s.Given("something")
}
```

Correct:

```go
func TestMain(m *testing.M) {
    es.RunAndReport(m)
}

func TestMyScenario(t *testing.T) {
    s := es.Init(t, "My scenario")
    s.Given("something")
}
```

Without `RunAndReport`, test results run but no JSON output is generated. The formatters pipeline has nothing to consume.

Source: packages/executable-stories-go/testmain.go

### CRITICAL Missing testing.T in Init

Wrong:

```go
s := es.Init(nil, "My scenario")
```

Correct:

```go
func TestMyScenario(t *testing.T) {
    s := es.Init(t, "My scenario")
}
```

`Init` requires a valid `*testing.T` to register cleanup hooks and capture test status.

Source: packages/executable-stories-go/story.go

### HIGH Calling steps before Init

Wrong:

```go
var s *es.S
s.Given("something") // nil pointer panic
s = es.Init(t, "My scenario")
```

Correct:

```go
s := es.Init(t, "My scenario")
s.Given("something")
```

Source: packages/executable-stories-go/story.go

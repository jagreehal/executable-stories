---
name: xunit-story-api
description: >
  Write BDD stories in xUnit (C#) using ExecutableStories.Xunit. Static API:
  Story.Init(scenario), Story.Given/When/Then/And/But (PascalCase). Aliases:
  Arrange, Act, Assert, Setup, Context, Execute, Action, Verify. Steps accept
  params DocEntry[] for inline docs. Wrapped steps: Story.Fn, Story.Expect.
  Must call Story.RecordAndClear() at end of each test. Auto-And conversion.
type: core
library: ExecutableStories.Xunit
library_version: "0.1.0"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-xunit/ExecutableStories.Xunit/Story.cs"
---

# ExecutableStories.Xunit — Story API

## Setup

```csharp
using ExecutableStories.Xunit;
using Xunit;

public class CartCheckoutTests
{
    [Fact]
    public void Applies_discount_code()
    {
        Story.Init("Applies discount code", "checkout");
        Story.Covers("src/Checkout/Total.cs");

        Story.Given("a cart with items totaling $100");
        var cart = CreateCart(new[] { new Item("Shirt", 100) });

        Story.When("a 20% discount code is applied");
        ApplyDiscount(cart, "SAVE20");

        Story.Then("the total is $80");
        Assert.Equal(80, cart.Total);

        Story.And("the discount is shown in the summary");
        Assert.Single(cart.Discounts);

        Story.RecordAndClear();
    }
}
```

**Important:** Call `Story.RecordAndClear()` at the end of each test. This records the test case and clears context. Output is written to `.executable-stories/raw-run.json` on process exit via `InProcessCollector`. Override path with `EXECUTABLE_STORIES_OUTPUT` env var.

## Core Patterns

### Step markers with Auto-And conversion

First call to `Given()`, `When()`, or `Then()` renders the keyword as-is. Subsequent calls to the same keyword auto-convert to "And". Explicit `And()` always renders "And". Explicit `But()` always renders "But" and never auto-converts.

```csharp
[Fact]
public void Blocks_suspended_user_login()
{
    Story.Init("Blocks suspended user login");

    Story.Given("the user account exists");         // renders "Given"
    Story.Given("the account is suspended");         // renders "And" (auto-converted)
    Story.When("the user submits valid credentials");
    Story.Then("the user sees an error message");
    Story.But("the user is not logged in");          // renders "But" (always)

    Story.RecordAndClear();
}
```

### Step aliases

AAA pattern: `Story.Arrange()` (Given), `Story.Act()` (When), `Story.Assert()` (Then).

Additional: `Story.Setup()`, `Story.Context()` (Given), `Story.Execute()`, `Story.Action()` (When), `Story.Verify()` (Then).

### Doc entries attached to steps

```csharp
[Fact]
public void Processes_payment()
{
    Story.Init("Processes payment");

    Story.Given("a valid payment request");
    Story.Json("Request payload", new { amount = 50, currency = "USD" });
    Story.Kv("Gateway", "stripe");

    Story.When("the payment is submitted");
    Story.Code("Response", "{ \"status\": \"ok\" }", "json");

    Story.Then("the order is confirmed");
    Story.Table("Order summary",
        new[] { "Item", "Qty", "Price" },
        new[] { new[] { "Widget", "2", "$25" } }
    );
    Story.Link("API docs", "https://docs.example.com/payments");
    Story.Note("Payment processed in sandbox mode");

    Story.RecordAndClear();
}
```

### Embedded HTML

Embed generated HTML (charts, single-file reports, skill/agent output) in an
always-sandboxed iframe in the report. Exactly one of `path` / `url` / `content`
is required; optional `title` and `height` (number → px, string passed through; default 400px).

```csharp
Story.Html(content: chartHtml, title: "Latency chart", height: 600);
Story.Html(url: "https://dash.example.com/run/42", height: 600);
Story.Html(path: "./reports/summary.html", title: "Summary");
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

### Inline docs via params DocEntry

```csharp
Story.Given("valid credentials",
    DocEntry.Kv("username", "alice"),
    DocEntry.Note("Password masked for security")
);
```

### Step wrappers with timing

```csharp
var profile = Story.Fn<Profile>("When", "the profile is fetched", () =>
    FetchProfile("user-123")
);

Story.Expect("the profile contains the correct name", () =>
{
    Assert.Equal("Alice", profile.Name);
});
```

`Fn` and `Expect` wrap a delegate with automatic timing. Both have `Action` (void) and `Func<T>` (returns value) overloads.

### Manual step timing

```csharp
Story.Given("a step to time");
var token = Story.StartTimer();
// ... work ...
Story.EndTimer(token);
```

### Attachments

```csharp
Story.Attach("debug.log", "text/plain", "/tmp/debug.log");
Story.AttachInline("config", "application/json", "{\"key\":\"val\"}");
```

## Common Mistakes

### CRITICAL Forgetting Story.RecordAndClear()

Wrong:

```csharp
[Fact]
public void My_test()
{
    Story.Init("My scenario");
    Story.Given("something");
    // Test ends — story data is lost
}
```

Correct:

```csharp
[Fact]
public void My_test()
{
    Story.Init("My scenario");
    Story.Given("something");
    Story.RecordAndClear(); // Records test case and clears context
}
```

There is no automatic test-lifecycle hook. You must call `RecordAndClear()` at the end of each test; recorded cases are collected in-process and flushed to `.executable-stories/raw-run.json` on process exit.

Source: packages/executable-stories-xunit/ExecutableStories.Xunit/Story.cs

### CRITICAL Missing Story.Init() before steps

Wrong:

```csharp
[Fact]
public void My_test()
{
    Story.Given("something"); // No context — steps are lost
    Story.RecordAndClear();
}
```

Correct:

```csharp
[Fact]
public void My_test()
{
    Story.Init("My scenario");
    Story.Given("something");
    Story.RecordAndClear();
}
```

Source: packages/executable-stories-xunit/ExecutableStories.Xunit/Story.cs

### HIGH Not calling RecordAndClear on test failure

Use try/finally to ensure recording even when assertions fail:

```csharp
[Fact]
public void My_test()
{
    Story.Init("My scenario");
    try
    {
        Story.Given("something");
        Story.When("action");
        Story.Then("result");
        Assert.True(false); // This throws
    }
    finally
    {
        Story.RecordAndClear("fail");
    }
}
```

Source: packages/executable-stories-xunit/ExecutableStories.Xunit/Story.cs

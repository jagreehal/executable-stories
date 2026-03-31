---
name: executable-stories-xunit
description: Write Given/When/Then story tests for xUnit with structured report generation. Use when creating BDD-style tests in C# and generating user story documentation from xUnit tests.
version: 0.1.0
libraries: ['xunit', 'csharp', 'dotnet']
---

# executable-stories-xunit

Framework-native story testing for xUnit. Tests and documentation come from the same C# test code.

## Quick Start

```csharp
using ExecutableStories.Xunit;
using Xunit;

public class CartCheckoutTests
{
    [Fact]
    public void Applies_discount_code()
    {
        Story.Init("Applies discount code", "checkout");

        Story.Given("a cart with items totaling $100");
        var cart = CreateCart();

        Story.When("a 20% discount code is applied");
        ApplyDiscount(cart, "SAVE20");

        Story.Then("the total is $80");
        Assert.Equal(80, cart.Total);

        Story.RecordAndClear();
    }
}
```

## API Reference

### Story.Init(scenario, params tags)

Initialize a story at the start of each test.

```csharp
Story.Init("Login succeeds", "smoke", "auth"); // tags as params
Story.Ticket("AUTH-42"); // or Story.Ticket("AUTH-42", "https://jira.example.com/AUTH-42");
Story.WithTraceUrlTemplate("https://jaeger.example.com/trace/{traceId}");
```

### Step Markers

Use static step methods directly inside a normal xUnit test.

```csharp
Story.Given("a seeded database");
var db = SeedDb();

Story.When("the service loads the account");
var account = LoadAccount(db);

Story.Then("the account is active");
Assert.True(account.Active);
```

| Method         | Keyword | Purpose            |
| -------------- | ------- | ------------------ |
| `Story.Given()`| Given   | Precondition/setup |
| `Story.When()` | When    | Action             |
| `Story.Then()` | Then    | Assertion          |
| `Story.And()`  | And     | Continuation       |
| `Story.But()`  | But     | Negative contrast  |

Repeated `Given`, `When`, and `Then` calls auto-render as `And`. Explicit `And` and `But` keep their own keywords.

### Step Aliases

```csharp
Story.Arrange("setup");
Story.Act("action");
Story.Assert("check");

Story.Setup("initial state");
Story.Context("extra context");
Story.Execute("operation");
Story.Action("user action");
Story.Verify("outcome");
```

### Wrapped Steps

```csharp
var profile = Story.Fn<Profile>("When", "the profile is fetched", () =>
    FetchProfile("user-123")
);

Story.Expect("the profile contains the correct name", () =>
{
    Assert.Equal("Alice", profile.Name);
});
```

### Standalone Doc Methods

Call after a step to attach docs to that step, or before any step to attach them at story level.

```csharp
Story.Given("a valid payment request");
Story.Json("Request payload", new { amount = 50, currency = "USD" });
Story.Kv("Gateway", "stripe");

Story.When("the payment is submitted");
Story.Code("Response", "{ \"status\": \"ok\" }", "json");

Story.Then("the order is confirmed");
Story.Table(
    "Order summary",
    new[] { "Item", "Qty", "Price" },
    new[] { new[] { "Widget", "2", "$25" } }
);
Story.Link("API docs", "https://docs.example.com/payments");
Story.Note("Payment processed in sandbox mode");
```

### Inline Docs

Step markers accept `params DocEntry[]`:

```csharp
Story.Given("valid credentials",
    DocEntry.Kv("username", "alice"),
    DocEntry.Note("Password masked for security")
);
```

### Nested Doc Children

Standalone doc helpers accept `children`. When a child is nested later, it is removed from earlier flat story-level or step-level doc lists and kept only under the parent.

```csharp
Story.Given("the first step");
var child = Story.Note("shared child");

Story.When("the second step");
Story.Note("parent note", new[] { child });
```

Step markers can also take nested doc entries inline:

```csharp
var child1 = DocEntry.Kv("User", "alice");
var child2 = DocEntry.Note("note about user");

Story.Given("a user exists", child1, child2);
```

## Reporting

Call `Story.RecordAndClear()` at the end of each test. That records the current story and clears the context. Output is written to `.executable-stories/raw-run.json` on process exit. Override the path with `EXECUTABLE_STORIES_OUTPUT`.

## Common Mistakes

### Forgetting Story.RecordAndClear()

Without it, the current story is not recorded for that test.

### Missing Story.Init()

Call `Story.Init(...)` before steps or doc helpers.

### Not using try/finally around failing assertions

If a test can throw before the final line, wrap the body in `try/finally` so `Story.RecordAndClear()` still runs.

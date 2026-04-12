---
title: Non-JavaScript Adapters
description: API reference for Go, Python, Rust, Kotlin, and C# adapters
---

All non-JS adapters produce the same raw JSON schema (`RawRun`) and feed the shared formatter pipeline. Once a test run writes its JSON output, `executable-stories-formatters` generates HTML, Markdown, JUnit, Cucumber JSON/HTML/Messages, and other formats identically regardless of which language produced the data.

## Go

### Quick reference

| | |
|---|---|
| Module | `github.com/jagreehal/executable-stories-go` |
| Install | `go get github.com/jagreehal/executable-stories-go` |
| Min version | Go 1.21 |

### Story initialization

```go
import es "github.com/jagreehal/executable-stories-go"

func TestLogin(t *testing.T) {
    s := es.Init(t, "User can log in with valid credentials",
        es.WithTags("auth", "smoke"),
        es.WithTicket("AUTH-42"),
        es.WithTicketURL("https://jira.example.com/AUTH-42"),
        es.WithMeta(map[string]string{"owner": "auth-team"}),
        es.WithTraceUrlTemplate("https://otel.example.com/trace/{{traceId}}"),
    )
    // ...
}
```

### Step methods

| Method | Keyword |
|--------|---------|
| `s.Given(text)` | Given |
| `s.When(text)` | When |
| `s.Then(text)` | Then |
| `s.And(text)` | And |
| `s.But(text)` | But |
| `s.Arrange(text)` | Given (AAA alias) |
| `s.Act(text)` | When (AAA alias) |
| `s.Assert(text)` | Then (AAA alias) |
| `s.Setup(text)` | Given (alias) |
| `s.Context(text)` | Given (alias) |
| `s.Execute(text)` | When (alias) |
| `s.Action(text)` | When (alias) |
| `s.Verify(text)` | Then (alias) |

### Doc entry methods

| Method | Description |
|--------|-------------|
| `s.Note(text)` | Free-text note |
| `s.Tag(names...)` | Tag annotation |
| `s.Kv(label, value)` | Key-value pair |
| `s.JSON(label, value)` | JSON code block |
| `s.Code(label, content, lang)` | Syntax-highlighted code |
| `s.Table(label, columns, rows)` | Data table |
| `s.Link(label, url)` | Hyperlink |
| `s.Section(title, markdown)` | Titled markdown section |
| `s.Mermaid(code, title)` | Mermaid diagram |
| `s.Screenshot(path, alt)` | Screenshot reference |
| `s.Custom(type, data)` | Custom entry |

### Attachments and timing

```go
s.Attach("response.json", "application/json", "/tmp/response.json")
s.AttachInline("body", "text/plain", []byte("response body"))
s.AttachSpans(traceID, spanIDs)   // OTel trace links

s.StartTimer("db-query")
// ... operation ...
s.EndTimer("db-query")

s.Fn("step description", func() error { return doSomething() })
s.Expect("assertion description", got, expected)
```

### JSON output mechanism

Call `es.RunAndReport(m)` inside `TestMain` to write `executable-stories-output.json` (or the path set by `ES_OUTPUT_FILE`). The file is written only when tests run under CI (`CI=true`) or `ES_FORCE_OUTPUT=true`.

```go
func TestMain(m *testing.M) {
    os.Exit(es.RunAndReport(m))
}
```

### Complete example

```go
func TestCheckout(t *testing.T) {
    s := es.Init(t, "Guest can complete checkout",
        es.WithTags("checkout", "e2e"),
        es.WithTicket("SHOP-99"),
    )
    s.Given("the cart contains one item")
    s.When("the user submits the order")
    s.Then("an order confirmation is returned")
    s.JSON("Order response", orderResponse)
    s.Note("Verified with real payment sandbox")
}
```

---

## Python/pytest

### Quick reference

| | |
|---|---|
| Package | `executable-stories-pytest` |
| Install | `pip install executable-stories-pytest` |
| Min version | Python 3.10, pytest 7 |

### Story initialization

```python
from executable_stories_pytest import story

def test_login():
    story.init(
        "User can log in with valid credentials",
        tags=["auth", "smoke"],
        ticket="AUTH-42",
        meta={"owner": "auth-team"},
        trace_url_template="https://otel.example.com/trace/{{traceId}}",
    )
```

### Step methods

| Method | Keyword |
|--------|---------|
| `story.given(text)` | Given |
| `story.when(text)` | When |
| `story.then(text)` | Then |
| `story.and_(text)` | And |
| `story.but(text)` | But |
| `story.arrange(text)` | Given (AAA alias) |
| `story.act(text)` | When (AAA alias) |
| `story.assert_(text)` | Then (AAA alias) |
| `story.setup(text)` | Given (alias) |
| `story.context(text)` | Given (alias) |
| `story.execute(text)` | When (alias) |
| `story.action(text)` | When (alias) |
| `story.verify(text)` | Then (alias) |

Note: `and_` and `assert_` use a trailing underscore to avoid clashing with Python keywords.

### Doc entry methods

| Method | Description |
|--------|-------------|
| `story.note(text)` | Free-text note |
| `story.tag(names)` | Tag annotation |
| `story.kv(label, value)` | Key-value pair |
| `story.json(label, value)` | JSON code block |
| `story.code(label, content, lang=None)` | Syntax-highlighted code |
| `story.table(label, columns=[], rows=[])` | Data table |
| `story.link(label, url)` | Hyperlink |
| `story.section(title, markdown)` | Titled markdown section |
| `story.mermaid(code, title=None)` | Mermaid diagram |
| `story.screenshot(path, alt=None)` | Screenshot reference |
| `story.custom(type, data)` | Custom entry |

### Attachments and timing

```python
story.attach("response.json", "application/json", path="/tmp/response.json")
story.attach("body", "text/plain", body=b"response body")  # inline
story.attach_spans(trace_id, span_ids)  # OTel trace links

story.start_timer("db-query")
# ... operation ...
story.end_timer("db-query")

story.fn("step description", lambda: do_something())
story.expect("assertion description", got, expected)
```

### JSON output mechanism

The pytest plugin writes output automatically via `pytest_sessionfinish`. No explicit call needed. Output path defaults to `executable-stories-output.json` and can be overridden with `ES_OUTPUT_FILE`. Output is written under CI (`CI=true`) or `ES_FORCE_OUTPUT=true`.

### Complete example

```python
from executable_stories_pytest import story

def test_checkout():
    story.init("Guest can complete checkout", tags=["checkout", "e2e"], ticket="SHOP-99")
    story.given("the cart contains one item")
    story.when("the user submits the order")
    story.then("an order confirmation is returned")
    story.json("Order response", order_response)
    story.note("Verified with real payment sandbox")
    assert order_response["status"] == "confirmed"
```

---

## Rust

### Quick reference

| | |
|---|---|
| Crate | `executable-stories` |
| Install | Add `executable-stories = "*"` to `[dev-dependencies]` |
| Min version | Rust 1.70, Rust edition 2021 |

### Story initialization

```rust
use executable_stories::Story;

#[test]
fn test_login() {
    let mut s = Story::new("User can log in with valid credentials")
        .with_tags(vec!["auth", "smoke"])
        .with_tickets(vec!["AUTH-42"])
        .with_ticket_url("https://jira.example.com/AUTH-42");
    // ...
    s.pass(); // REQUIRED: marks the scenario as passing
}
```

### Step methods

| Method | Keyword |
|--------|---------|
| `s.given(text)` | Given |
| `s.when(text)` | When |
| `s.then(text)` | Then |
| `s.and(text)` | And |
| `s.but(text)` | But |
| `s.arrange(text)` | Given (AAA alias) |
| `s.act(text)` | When (AAA alias) |
| `s.assert(text)` | Then (AAA alias) |
| `s.setup(text)` | Given (alias) |
| `s.context(text)` | Given (alias) |
| `s.execute(text)` | When (alias) |
| `s.action(text)` | When (alias) |
| `s.verify(text)` | Then (alias) |

All step methods take `&mut self` and return `&mut Self` for chaining.

### Doc entry methods

| Method | Description |
|--------|-------------|
| `s.note(text)` | Free-text note |
| `s.tag(names)` | Tag annotation |
| `s.kv(label, value)` | Key-value pair |
| `s.json(label, value)` | JSON code block |
| `s.code(label, content, Some("lang"))` | Syntax-highlighted code (lang is `Option<&str>`) |
| `s.table(label, columns, rows)` | Data table |
| `s.link(label, url)` | Hyperlink |
| `s.section(title, markdown)` | Titled markdown section |
| `s.mermaid(code, title)` | Mermaid diagram |
| `s.screenshot(path, alt)` | Screenshot reference |
| `s.custom(type, data)` | Custom entry |

### Attachments and timing

```rust
s.attach("response.json", "application/json", "/tmp/response.json");
s.attach_inline("body", "text/plain", b"response body");
s.attach_spans(trace_id, span_ids);  // OTel trace links

s.start_timer("db-query");
// ... operation ...
s.end_timer("db-query");

s.fn_step("step description", || do_something());
s.expect_step("assertion description", got, expected);
```

### JSON output mechanism

Call `write_results()` at the end of your test binary or in a test harness teardown. Output path defaults to `executable-stories-output.json` and can be overridden with `ES_OUTPUT_FILE`. Output is written under CI (`CI=true`) or `ES_FORCE_OUTPUT=true`.

```rust
#[test]
fn write_output() {
    executable_stories::write_results();
}
```

### Complete example

```rust
use executable_stories::Story;

#[test]
fn test_checkout() {
    let mut s = Story::new("Guest can complete checkout")
        .with_tags(vec!["checkout", "e2e"])
        .with_tickets(vec!["SHOP-99"]);
    s.given("the cart contains one item");
    s.when("the user submits the order");
    s.then("an order confirmation is returned");
    s.json("Order response", &order_response);
    s.note("Verified with real payment sandbox");
    s.pass();
}
```

---

## JUnit 5 / Kotlin

### Quick reference

| | |
|---|---|
| Artifact | `io.github.jagreehal:executable-stories-junit5` |
| Install | Add to `testImplementation` dependencies in Gradle or Maven |
| Min version | JVM 17, JUnit Platform 1.10 |

### Story initialization

```kotlin
import io.github.jagreehal.executablestories.Story

class LoginTest {
    @Test
    fun `user can log in with valid credentials`() {
        Story.init("User can log in with valid credentials", "auth", "smoke")
        Story.ticket("AUTH-42")
        // ...
    }
}
```

### Step methods

| Method | Keyword |
|--------|---------|
| `Story.given(text)` | Given |
| `` Story.`when`(text) `` | When |
| `Story.then(text)` | Then |
| `Story.and(text)` | And |
| `Story.but(text)` | But |
| `Story.arrange(text)` | Given (AAA alias) |
| `Story.act(text)` | When (AAA alias) |
| `Story.assert(text)` | Then (AAA alias) |
| `Story.setup(text)` | Given (alias) |
| `Story.context(text)` | Given (alias) |
| `Story.execute(text)` | When (alias) |
| `Story.action(text)` | When (alias) |
| `Story.verify(text)` | Then (alias) |

Note: `when` requires backtick quoting in Kotlin because it is a reserved keyword.

### Doc entry methods

| Method | Description |
|--------|-------------|
| `Story.note(text)` | Free-text note |
| `Story.tag(names)` | Tag annotation |
| `Story.kv(label, value)` | Key-value pair |
| `Story.json(label, value)` | JSON code block |
| `Story.code(label, content, lang?)` | Syntax-highlighted code |
| `Story.table(label, arrayOf(...), arrayOf(...))` | Data table |
| `Story.link(label, url)` | Hyperlink |
| `Story.section(title, markdown)` | Titled markdown section |
| `Story.mermaid(code, title?)` | Mermaid diagram |
| `Story.screenshot(path, alt?)` | Screenshot reference |
| `Story.custom(type, data)` | Custom entry |

All doc methods return a `DocEntry` value that is appended to the current scenario.

### Attachments and timing

```kotlin
Story.attach("response.json", "application/json", "/tmp/response.json")
Story.attachInline("body", "text/plain", "response body".toByteArray())
Story.attachSpans(traceId, spanIds)  // OTel trace links

Story.startTimer("db-query")
// ... operation ...
Story.endTimer("db-query")

Story.fn("step description") { doSomething() }
Story.expect("assertion description", got, expected)
```

### JSON output mechanism

Output is written automatically by `StoryTestExecutionListener`, which is registered via the JUnit Platform `ServiceLoader` mechanism. Add the listener JAR to your test classpath and it fires on suite completion. Output path defaults to `executable-stories-output.json` and can be overridden with `ES_OUTPUT_FILE`.

### Complete example

```kotlin
class CheckoutTest {
    @Test
    fun `guest can complete checkout`() {
        Story.init("Guest can complete checkout", "checkout", "e2e")
        Story.ticket("SHOP-99")
        Story.given("the cart contains one item")
        Story.`when`("the user submits the order")
        Story.then("an order confirmation is returned")
        Story.json("Order response", orderResponse)
        Story.note("Verified with real payment sandbox")
        assertEquals("confirmed", orderResponse.status)
    }
}
```

---

## xUnit / C#

### Quick reference

| | |
|---|---|
| Package | `ExecutableStories.XUnit` |
| Install | `dotnet add package ExecutableStories.XUnit` |
| Min version | .NET 8, xUnit 2.x |

### Story initialization

```csharp
using ExecutableStories;

public class LoginTests : IDisposable
{
    public void TestLogin()
    {
        Story.Init("User can log in with valid credentials", "auth", "smoke");
        Story.Ticket("AUTH-42");
        // ...
    }

    public void Dispose() => Story.RecordAndClear(); // REQUIRED
}
```

`Story.RecordAndClear()` must be called in `Dispose()` to flush the current test's data before xUnit moves to the next test. Without it, story data from one test bleeds into the next.

### Step methods

| Method | Keyword |
|--------|---------|
| `Story.Given(text)` | Given |
| `Story.When(text)` | When |
| `Story.Then(text)` | Then |
| `Story.And(text)` | And |
| `Story.But(text)` | But |
| `Story.Arrange(text)` | Given (AAA alias) |
| `Story.Act(text)` | When (AAA alias) |
| `Story.Assert(text)` | Then (AAA alias) |
| `Story.Setup(text)` | Given (alias) |
| `Story.Context(text)` | Given (alias) |
| `Story.Execute(text)` | When (alias) |
| `Story.Action(text)` | When (alias) |
| `Story.Verify(text)` | Then (alias) |

### Doc entry methods

| Method | Description |
|--------|-------------|
| `Story.Note(text)` | Free-text note |
| `Story.Tag(names)` | Tag annotation |
| `Story.Kv(label, value)` | Key-value pair |
| `Story.Json(label, value)` | JSON code block |
| `Story.Code(label, content, lang?)` | Syntax-highlighted code |
| `Story.Table(label, new[] {...}, new[] {...})` | Data table |
| `Story.Link(label, url)` | Hyperlink |
| `Story.Section(title, markdown)` | Titled markdown section |
| `Story.Mermaid(code, title?)` | Mermaid diagram |
| `Story.Screenshot(path, alt?)` | Screenshot reference |
| `Story.Custom(type, data)` | Custom entry |

### Attachments and timing

```csharp
Story.Attach("response.json", "application/json", "/tmp/response.json");
Story.AttachInline("body", "text/plain", Encoding.UTF8.GetBytes("response body"));
Story.AttachSpans(traceId, spanIds);  // OTel trace links

Story.StartTimer("db-query");
// ... operation ...
Story.EndTimer("db-query");

Story.Fn("step description", () => DoSomething());
Story.Expect("assertion description", got, expected);
```

### JSON output mechanism

Output is written automatically on process exit via a registered shutdown hook. Output path defaults to `executable-stories-output.json` and can be overridden with `ES_OUTPUT_FILE`. Output is written under CI (`CI=true`) or `ES_FORCE_OUTPUT=true`.

### Complete example

```csharp
public class CheckoutTests : IDisposable
{
    [Fact]
    public void GuestCanCompleteCheckout()
    {
        Story.Init("Guest can complete checkout", "checkout", "e2e");
        Story.Ticket("SHOP-99");
        Story.Given("the cart contains one item");
        Story.When("the user submits the order");
        Story.Then("an order confirmation is returned");
        Story.Json("Order response", orderResponse);
        Story.Note("Verified with real payment sandbox");
        Assert.Equal("confirmed", orderResponse.Status);
    }

    public void Dispose() => Story.RecordAndClear();
}
```

---

## Adapter comparison

| Aspect | Go | Python | Rust | Kotlin | C# |
|--------|-----|--------|------|--------|-----|
| API style | Method receiver | Module singleton | Builder | Static companion | Static class |
| Naming | PascalCase | snake_case | snake_case | camelCase | PascalCase |
| Context | Cleanup | ThreadLocal | RAII (Drop) | ThreadLocal | AsyncLocal |
| Output trigger | `RunAndReport()` | Plugin hooks | `write_results()` | Listener | `RecordAndClear()` |

All adapters write the same `RawRun` JSON schema. Once on disk, pass the file to `executable-stories-formatters` to produce HTML, Markdown, JUnit, Cucumber JSON, and other formats. See [Formatters CLI and API](/reference/formatters-api/) for details.

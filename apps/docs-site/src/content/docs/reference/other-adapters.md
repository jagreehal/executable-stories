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
        es.WithCovers("internal/auth/login.go"),
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
| `s.State(label, value)` | State snapshot (pass `""` to omit the label); same-label snapshots diffed in reports |
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
| Min version | Python 3.12, pytest 8 |
| Import | `from executable_stories import story` |

The distribution is named `executable-stories-pytest`; the module it installs is
`executable_stories`. Installing it registers the plugin, so there is nothing to
add to `conftest.py` or `pyproject.toml`.

### Story initialization

```python
from executable_stories import story

def test_login():
    story.init(
        "User can log in with valid credentials",
        tags=["auth", "smoke"],
        ticket="AUTH-42",
        covers=["src/auth/login.py"],
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
| `story.state(value, label=None)` | State snapshot; same-label snapshots diffed in reports |
| `story.code(label, content, lang=None)` | Syntax-highlighted code |
| `story.table(label, columns=[], rows=[])` | Data table |
| `story.link(label, url)` | Hyperlink |
| `story.section(title, markdown)` | Titled markdown section |
| `story.mermaid(code, title=None)` | Mermaid diagram |
| `story.screenshot(path, alt=None)` | Screenshot reference |
| `story.video(path, caption=None, poster=None)` | Video, played inline in HTML reports |
| `story.html(path=…\|url=…\|content=…, title=None, height=None)` | HTML in a sandboxed iframe |
| `story.custom(type, data)` | Custom entry |

Every doc method also takes `children=[...]` to nest entries under one heading.

### Feature declarations and planned scenarios

```python
story.feature(
    "Anyone can do arithmetic without reaching for a calculator app",
    kind="ability",
    narrative="People doing quick sums lose their place when they switch apps.",
    glossary=[{"term": "operand", "definition": "One of the two numbers."}],
)


def test_calculator_rejects_non_numeric_input():
    story.planned("Calculator rejects non-numeric input")
```

`story.feature(...)` runs at import time and heads every scenario in the file.
`story.planned(...)` records behaviour that is specified but not built: it
reaches the report as status `todo` and stops being planned the moment someone
writes it as a real `story.init` scenario.

### Attachments and timing

```python
story.attach("response.json", "application/json", path="/tmp/response.json")
story.attach("body", "text/plain", body="response body")  # inline
story.attach_spans([{"name": "GET /orders", "traceId": trace_id, "spanId": span_id}])

story.given("the database is queried")
token = story.start_timer()
# ... operation ...
story.end_timer(token)

profile = story.fn("When", "the profile is fetched", lambda: fetch_profile("u-1"))
story.expect("the profile carries the right name", lambda: check(profile))
```

`start_timer()` returns a token tied to the step that was current when it was
called, so timing survives steps recorded in between.

### JSON output mechanism

The plugin writes `.executable-stories/raw-run.json` under pytest's root
directory when the session finishes — no call, and no CI-only gating. Set
`EXECUTABLE_STORIES_OUTPUT` to move it; a relative path is resolved against the
project root, an absolute one is used as given. The file is renamed into place,
so a reader never sees a half-written run. `EXECUTABLE_STORIES_QUIET` silences
the `next:` hint the plugin prints to stderr.

Each run also reports what it reached, so the accumulated report stays honest as
tests come and go:

| Field | Meaning |
|---|---|
| `coveredSourceFiles` | Every file the run executed a test in, whether or not it produced a story, so deleting a file's last scenario retires it |
| `incompleteSourceFiles` | Files the run cannot speak for — a skipped test, a broken fixture or teardown, a module that failed to import, a test that failed before `story.init` — so their scenarios are kept |
| `runScope` | `"filtered"` for `-k`, `-m`, `--deselect`, `--last-failed`, a `file.py::test` node id, or a run that ended early — `-x`, `--maxfail`, Ctrl-C, an internal or usage error; otherwise `"full"` |
| `gitSha` | The commit the run describes, from CI's environment or `git rev-parse HEAD` |

Source paths are relative to the project root, which is what keys the stored
per-file reports under `reports/by-file/`.

### Complete example

```python
from executable_stories import story

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
| `s.state(label, value)` | State snapshot (`label` is `Option<&str>`); same-label snapshots diffed in reports |
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

The first `Story` registers a process-exit hook, so the run JSON is written with
no setup. It lands at `.executable-stories/raw-run.json`; set
`EXECUTABLE_STORIES_OUTPUT` to change that. Call `write_results()` directly only
to control when the file appears.

Cargo builds each file under `tests/` as its own binary, and every binary writes
the same default path. Keep story tests in one file, or give each binary its own
output path.

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
}
```

---

## JUnit 5 / Kotlin

### Quick reference

| | |
|---|---|
| Artifact | `io.github.jagreehal:executable-stories-junit5` |
| Install | Add to `testImplementation` dependencies in Gradle or Maven |
| Min version | Java 21, JUnit Platform 1.12 |

### Story initialization

```kotlin
import dev.executablestories.junit5.Story

class LoginTest {
    companion object {
        // What this class's scenarios are for, ahead of the examples. The JVM
        // reports no source path, so the declaring class is the key the report
        // groups by.
        @JvmStatic
        @BeforeAll
        fun feature() = Story.feature(
            title = "Employees can get back into their account",
            kind = "ability",
            narrative = "A locked-out employee raises a ticket, so the sign-in path pays for itself.",
        )
    }

    @Test
    fun `user can log in with valid credentials`() {
        Story.init("User can log in with valid credentials", "auth", "smoke")
        Story.ticket("AUTH-42")
        Story.covers("src/main/kotlin/auth/SignIn.kt")
        // ...
    }

    // Specified but not built yet: reaches the report as planned, under this
    // class, without disabling the test.
    @Test
    fun `account locks after five failed attempts`() {
        Story.planned("Account locks after five failed attempts")
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
| `Story.assertThat(text)` | Then (AAA alias) |
| `Story.setup(text)` | Given (alias) |
| `Story.context(text)` | Given (alias) |
| `Story.execute(text)` | When (alias) |
| `Story.action(text)` | When (alias) |
| `Story.verify(text)` | Then (alias) |

Note: `when` requires backtick quoting in Kotlin because it is a reserved keyword, and
the `assert` alias is spelled `assertThat` for the same reason.

### Doc entry methods

| Method | Description |
|--------|-------------|
| `Story.note(text)` | Free-text note |
| `Story.tag(names)` | Tag annotation |
| `Story.kv(label, value)` | Key-value pair |
| `Story.json(label, value)` | JSON code block |
| `Story.state(value, label?)` | State snapshot; same-label snapshots diffed in reports |
| `Story.code(label, content, lang?)` | Syntax-highlighted code |
| `Story.table(label, arrayOf(...), arrayOf(...))` | Data table |
| `Story.link(label, url)` | Hyperlink |
| `Story.section(title, markdown)` | Titled markdown section |
| `Story.mermaid(code, title?)` | Mermaid diagram |
| `Story.screenshot(path, alt?)` | Screenshot reference |
| `Story.video(path, caption?, poster?)` | Video played inline in the report |
| `Story.html(path=/url=/content=, title?, height?)` | HTML in a sandboxed iframe |
| `Story.custom(type, data)` | Custom entry |

All doc methods return a `DocEntry` value that is appended to the current scenario.

### Attachments and timing

```kotlin
Story.attach("response.json", "application/json", "/tmp/response.json")
Story.attachInline("body", "text/plain", "response body", "IDENTITY")
Story.attachSpans(spans)  // OTel spans, for the trace waterfall

// startTimer returns a token; endTimer stops the step it was opened against.
val token = Story.startTimer()
// ... operation ...
Story.endTimer(token)

// fn takes the keyword as its first argument and times the body.
val total = Story.fn("When", "the order is priced") { price(order) }
Story.expect("the total is 80") { assertEquals(80, total) }
```

### JSON output mechanism

Output is written automatically by `StoryTestExecutionListener`, which is registered via
the JUnit Platform `ServiceLoader` mechanism. Add the dependency and it fires on suite
completion, writing `.executable-stories/raw-run.json` relative to the working directory —
the project directory under both Gradle and Maven. `EXECUTABLE_STORIES_OUTPUT` overrides
the path, and `EXECUTABLE_STORIES_QUIET` silences the `next:` hint the listener prints to
stderr. The file is renamed into place, so a watch task reading it while a run finishes
always sees a whole document.

The run also reports `coveredSourceFiles`, every test class that executed, so a class
emptied of scenarios is distinguishable from one this run never reached, and
`incompleteSourceFiles` for any container that did not succeed or was skipped — the JUnit Platform reports
an enclosing class as successful even when a `@TestFactory` inside it failed, and a broken
factory otherwise looks exactly like a class whose scenarios were deleted. A skipped test marks its
class the same way, so switching one off keeps what it last documented. Acting on the
inventory needs a scope declaration too: the listener detects Maven Surefire's `-Dtest=...`, and for
other launcher filters `EXECUTABLE_STORIES_FILTERED=1` marks a narrowed run, `=0` one that
covered every scenario in its classes.

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
| Package | `ExecutableStories.Xunit` |
| Install | `dotnet add package ExecutableStories.Xunit` |
| Min version | .NET 10, xUnit v3 |

### Story initialization

```csharp
using ExecutableStories.Xunit;

public class LoginTests
{
    // What this class's scenarios are for, ahead of the examples. .NET reports
    // no source path, so the declaring class is the key the report groups by.
    static LoginTests() => Story.Feature(
        "Employees can get back into their account",
        kind: "ability",
        narrative: "A locked-out employee raises a ticket, so the sign-in path pays for itself.");

    [Fact]
    public void TestLogin()
    {
        Story.Init("User can log in with valid credentials", "auth", "smoke");
        Story.Ticket("AUTH-42");
        Story.Covers("src/Auth/SignIn.cs");
        // ...
    }

    // Specified but not built yet: reaches the report as planned, under this
    // class, without skipping the test.
    [Fact]
    public void TestLockout() => Story.Planned("Account locks after five failed attempts");
}
```

`[assembly: StoryRecording]` records each test's story with the status xUnit computed. Without it nothing is recorded.

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
| `Story.State(value, label?)` | State snapshot; same-label snapshots diffed in reports |
| `Story.Code(label, content, lang?)` | Syntax-highlighted code |
| `Story.Table(label, new[] {...}, new[] {...})` | Data table |
| `Story.Link(label, url)` | Hyperlink |
| `Story.Section(title, markdown)` | Titled markdown section |
| `Story.Mermaid(code, title?)` | Mermaid diagram |
| `Story.Screenshot(path, alt?)` | Screenshot reference |
| `Story.Video(path, caption?, poster?)` | Video played inline in the report |
| `Story.Html(path:/url:/content:, title?, height?)` | HTML in a sandboxed iframe |
| `Story.Custom(type, data)` | Custom entry |

### Attachments and timing

```csharp
Story.Attach("response.json", "application/json", "/tmp/response.json");
Story.AttachInline("body", "text/plain", "response body");
Story.AttachSpans(spans);  // OTel spans, for the trace waterfall

// StartTimer returns a token; EndTimer stops the step it was opened against.
var token = Story.StartTimer();
// ... operation ...
Story.EndTimer(token);

// Fn takes the keyword as its first argument and times the delegate.
var total = Story.Fn("When", "the order is priced", () => Price(order));
Story.Expect("the total is 80", () => Assert.Equal(80, total));
```

### JSON output mechanism

Output is written automatically on process exit. It lands in
`.executable-stories/raw-run.json` under the test project directory — found by
walking up from the test assembly, because `dotnet test` runs the host out of
`bin/<config>/<tfm>` and the working directory would otherwise bury the file
there. `EXECUTABLE_STORIES_OUTPUT` overrides the path — a relative one resolves
against that same project directory, so it cannot land back under `bin/` — and
`EXECUTABLE_STORIES_PROJECT_ROOT` overrides the directory both resolve against.
Every run is written; `EXECUTABLE_STORIES_QUIET` silences the `next:` hint the
collector prints to stderr.

The run also reports `coveredSourceFiles`, every test class that executed, so a
class emptied of scenarios is distinguishable from one this run never reached.
Acting on that needs a scope declaration too: `dotnet test --filter` is applied
before the adapter sees anything, so set `EXECUTABLE_STORIES_FILTERED=1` for a
narrowed run, or `=0` for one that covered every scenario in its classes.

### Complete example

```csharp
public class CheckoutTests
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

}
```

---

## Adapter comparison

| Aspect | Go | Python | Rust | Kotlin | C# |
|--------|-----|--------|------|--------|-----|
| API style | Method receiver | Module singleton | Builder | Static companion | Static class |
| Naming | PascalCase | snake_case | snake_case | camelCase | PascalCase |
| Context | Cleanup | ThreadLocal | RAII (Drop) | ThreadLocal | AsyncLocal |
| Output trigger | `RunAndReport()` | Plugin hooks | Process-exit hook | Listener | `[assembly: StoryRecording]` |
| Planned scenario | `es.Planned(t, "…")` | `story.planned("…")` | `Story::planned("…")` | `Story.planned("…")` | `Story.Planned("…")` |

Ruby, not in the table above, uses `ExecutableStories.planned("…")`.

### Planned scenarios

A planned scenario is behaviour you have written down but not built. It reaches the report as status `todo` and renders as **Planned**, and it stops being planned the moment someone implements it:

```go
func TestCheckoutBlocksSuspendedAccount(t *testing.T) {
    es.Planned(t, "checkout is blocked for a suspended account")
}
```

These adapters take an explicit call rather than reusing `t.Skip`, `@pytest.mark.skip`, `#[ignore]`, `@Disabled`, or `Skip = "…"`. Those all mean "do not run this now", which is a different claim from "we have not built this yet". Mapping one onto the other would drop every quarantined test into your plan. Skipping, if you want it, stays yours to call.

The JS adapters use their host's own idiom instead: `it.todo` (Vitest, Jest), `test.fixme` (Playwright), and a bodyless `it` (Cypress).

All adapters write the same `RawRun` JSON schema. Once on disk, pass the file to `executable-stories-formatters` to produce HTML, Markdown, JUnit, Cucumber JSON, and other formats. See [Formatters CLI and API](/reference/formatters-api/) for details.

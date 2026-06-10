---
name: rust-story-api
description: >
  Write BDD stories in Rust using executable-stories-rust. Builder pattern:
  Story::new(scenario). Steps: given, when, then, and, but (snake_case, &mut self).
  Aliases: arrange, act, assert_that, setup, context, execute, action, verify.
  Wrapped steps: fn_step, expect_step. Must call pass() before drop. Auto-And
  keyword conversion. write_results() for JSON output.
type: core
library: executable-stories-rust
library_version: "0.1.0"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-rust/src/story.rs"
  - "jagreehal/executable-stories:packages/executable-stories-rust/src/doc_entry.rs"
---

# executable-stories-rust — Story API

## Setup

```rust
use executable_stories::{Story, collector};

#[test]
fn applies_discount_code() {
    let mut s = Story::new("Applies discount code")
        .with_tags(&["checkout"])
        .with_tickets(&["CART-42"])
        .with_covers(&["src/checkout.rs"]);

    s.given("a cart with items totaling $100");
    let mut cart = create_cart(vec![item("Shirt", 100)]);

    s.when("a 20% discount code is applied");
    apply_discount(&mut cart, "SAVE20");

    s.then("the total is $80");
    assert_eq!(cart.total, 80);

    s.and("the discount is shown in the summary");
    assert_eq!(cart.discounts.len(), 1);

    s.pass();
}

// Call once at the end of the test suite
// In integration tests, use an atexit handler or explicit call
fn teardown() {
    collector::write_results();
}
```

**Important:** Call `s.pass()` at the end of each passing test. Without it, the test defaults to "fail" status when the `Story` is dropped. Call `collector::write_results()` to write `.executable-stories/raw-run.json`. Override output path with `EXECUTABLE_STORIES_OUTPUT` env var.

## Core Patterns

### Step markers with Auto-And conversion

First call to `given()`, `when()`, or `then()` renders the keyword as-is. Subsequent calls to the same keyword auto-convert to "And". Explicit `and()` always renders "And". Explicit `but()` always renders "But" and never auto-converts.

```rust
#[test]
fn blocks_suspended_user_login() {
    let mut s = Story::new("Blocks suspended user login");

    s.given("the user account exists");          // renders "Given"
    s.given("the account is suspended");          // renders "And" (auto-converted)
    s.when("the user submits valid credentials");
    s.then("the user sees an error message");
    s.but("the user is not logged in");           // renders "But" (always)

    s.pass();
}
```

### Step aliases

AAA pattern: `arrange()` (Given), `act()` (When), `assert_that()` (Then).

Additional: `setup()`, `context()` (Given), `execute()`, `action()` (When), `verify()` (Then).

Note: The Then alias is `assert_that()` because `assert` is a Rust macro.

### Doc entries attached to steps

```rust
#[test]
fn processes_payment() {
    let mut s = Story::new("Processes payment");

    s.given("a valid payment request");
    s.json("Request payload", &serde_json::json!({"amount": 50, "currency": "USD"}));
    s.kv("Gateway", serde_json::json!("stripe"));

    s.when("the payment is submitted");
    s.code("Response", r#"{ "status": "ok" }"#, Some("json"));

    s.then("the order is confirmed");
    s.table("Order summary",
        &["Item", "Qty", "Price"],
        &[&["Widget", "2", "$25"]],
    );
    s.link("API docs", "https://docs.example.com/payments");
    s.note("Payment processed in sandbox mode");

    s.pass();
}
```

### Embedded HTML

Embed generated HTML (charts, single-file reports, skill/agent output) in an
always-sandboxed iframe in the report. Exactly one of `path` / `url` / `content`
is required; optional `title` and `height` (number → px, string passed through; default 400px).

```rust
s.html(HtmlOptions { content: Some(&chart_html), title: Some("Latency chart"), height: Some(serde_json::json!(600)), ..Default::default() });
s.html(HtmlOptions { url: Some("https://dash.example.com/run/42"), height: Some(serde_json::json!(600)), ..Default::default() });
s.html(HtmlOptions { path: Some("./reports/summary.html"), title: Some("Summary"), ..Default::default() });
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

### Inline docs via with_docs

```rust
use executable_stories::StepDoc;

s.given("valid credentials");
s.with_docs(vec![
    StepDoc::kv("username", serde_json::json!("alice")),
    StepDoc::note("Password masked for security"),
]);
```

### Step wrappers with timing

```rust
s.given("a registered user");

let profile = s.fn_step("When", "the profile is fetched", || {
    fetch_profile("user-123")
});

s.expect_step("the profile contains the correct name", || {
    assert_eq!(profile.name, "Alice");
});
```

`fn_step` and `expect_step` wrap a closure with automatic timing. Panics are caught (duration still recorded) then re-raised. Both return the closure's result.

### Manual step timing

```rust
s.given("a step to time");
let token = s.start_timer();
// ... work ...
s.end_timer(token);
```

### Attachments

```rust
s.attach("debug.log", "text/plain", "/tmp/debug.log");
s.attach_inline("config", "application/json", r#"{"key":"val"}"#, "IDENTITY");
```

## Common Mistakes

### CRITICAL Forgetting to call pass()

Wrong:

```rust
#[test]
fn my_test() {
    let mut s = Story::new("My scenario");
    s.given("something");
    // Story dropped without pass() — recorded as "fail"
}
```

Correct:

```rust
#[test]
fn my_test() {
    let mut s = Story::new("My scenario");
    s.given("something");
    s.pass(); // Marks test as passed before drop
}
```

The `Drop` trait emits the test case to the collector. Without `pass()`, the default status is "fail".

Source: packages/executable-stories-rust/src/story.rs

### CRITICAL Forgetting to call write_results

Wrong:

```rust
// Tests run but no raw-run.json is written
```

Correct:

```rust
// Call at the end of your test suite
collector::write_results();
```

Without `write_results()`, the in-memory test cases are never persisted to disk. The formatters pipeline has nothing to consume.

Source: packages/executable-stories-rust/src/collector.rs

### HIGH Using assert() as alias

Wrong:

```rust
s.assert("result is correct"); // No such method — assert is a Rust macro
```

Correct:

```rust
s.assert_that("result is correct");
```

The Then alias is `assert_that()` because `assert!` is a built-in Rust macro.

Source: packages/executable-stories-rust/src/story.rs

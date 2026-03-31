---
name: executable-stories-rust
description: Write Given/When/Then story tests for Rust with structured report generation. Use when creating BDD-style tests in Rust and generating user story documentation from test code.
version: 0.1.0
libraries: ['rust']
---

# executable-stories-rust

Framework-native story testing for Rust. Tests and documentation come from the same Rust test code.

## Quick Start

```rust
use executable_stories::{collector, Story};

#[test]
fn applies_discount_code() {
    let mut s = Story::new("Applies discount code")
        .with_tags(&["checkout"])
        .with_tickets(&["CART-42"]);

    s.given("a cart with items totaling $100");
    let mut cart = create_cart();

    s.when("a 20% discount code is applied");
    apply_discount(&mut cart, "SAVE20");

    s.then("the total is $80");
    assert_eq!(cart.total, 80);

    s.pass();
}

fn teardown() {
    collector::write_results();
}
```

## API Reference

### Story::new(scenario)

Create a story builder for the current test.

```rust
let mut s = Story::new("Login succeeds")
    .with_tags(&["smoke", "auth"])
    .with_tickets(&["AUTH-42"]) // string shorthand
    .with_ticket_url("AUTH-43", "https://jira.example.com/AUTH-43") // with URL
    .with_meta(serde_json::json!({ "priority": "high" }));
```

### Step Markers

Use normal Rust statements between story markers.

```rust
s.given("a seeded database");
let db = seed_db();

s.when("the service loads the account");
let account = load_account(&db);

s.then("the account is active");
assert!(account.active);
```

| Method        | Keyword | Purpose            |
| ------------- | ------- | ------------------ |
| `given()`     | Given   | Precondition/setup |
| `when()`      | When    | Action             |
| `then()`      | Then    | Assertion          |
| `and()`       | And     | Continuation       |
| `but()`       | But     | Negative contrast  |

Repeated `given`, `when`, and `then` calls auto-render as `And`. Explicit `and` and `but` keep their own keywords.

### Step Aliases

```rust
s.arrange("setup");
s.act("action");
s.assert_that("check");

s.setup("initial state");
s.context("extra context");
s.execute("operation");
s.action("user action");
s.verify("outcome");
```

### Wrapped Steps

```rust
let profile = s.fn_step("When", "the profile is fetched", || {
    fetch_profile("user-123")
});

s.expect_step("the profile contains the correct name", || {
    assert_eq!(profile.name, "Alice");
});
```

### Doc Methods

Attach docs after a step with the built-in helpers:

```rust
s.given("a valid payment request");
s.json("Request payload", &serde_json::json!({"amount": 50, "currency": "USD"}));
s.kv("Gateway", serde_json::json!("stripe"));

s.when("the payment is submitted");
s.code("Response", r#"{ "status": "ok" }"#, Some("json"));

s.then("the order is confirmed");
s.table(
    "Order summary",
    &["Item", "Qty", "Price"],
    &[&["Widget", "2", "$25"]],
);
s.link("API docs", "https://docs.example.com/payments");
s.note("Payment processed in sandbox mode");
```

### Nested Doc Children

Doc entries can be nested under a parent using `with_children`:

```rust
let child = DocEntry::note("Detail about the request");
let parent = DocEntry::json("Request payload", &serde_json::json!({"amount": 50}))
    .with_children(vec![child]);
s.doc(parent);
```

### Inline Docs

Attach multiple docs to the current step with `with_docs(...)`:

```rust
use executable_stories::StepDoc;

s.given("valid credentials");
s.with_docs(vec![
    StepDoc::kv("username", serde_json::json!("alice")),
    StepDoc::note("Password masked for security"),
]);
```

## Reporting

Call `s.pass()` before the story is dropped, otherwise the test defaults to failure status. Call `collector::write_results()` once at the end of the suite to write `.executable-stories/raw-run.json`. Override the path with `EXECUTABLE_STORIES_OUTPUT`.

## Common Mistakes

### Forgetting s.pass()

If the story is dropped without `pass()`, it is recorded as failed.

### Forgetting collector::write_results()

Without `write_results()`, the in-memory results never get written to disk.

### Using `assert()` as an alias

Use `assert_that()` for the Then alias. `assert!` is already a Rust macro.

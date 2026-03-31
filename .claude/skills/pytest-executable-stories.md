---
name: executable-stories-pytest
description: Write Given/When/Then story tests for pytest with structured report generation. Use when creating BDD-style tests in pytest and generating user story documentation from Python tests.
version: 0.1.0
libraries: ['pytest', 'python']
---

# executable-stories-pytest

Framework-native story testing for pytest. Tests and documentation come from the same Python test code.

## Quick Start

```python
from executable_stories import story


def test_applies_discount_code():
    story.init("Applies discount code", tags=["checkout"], ticket="CART-42")

    story.given("a cart with items totaling $100")
    cart = create_cart()

    story.when("a 20% discount code is applied")
    apply_discount(cart, "SAVE20")

    story.then("the total is $80")
    assert cart.total == 80
```

Use `test_*_story.py` naming if you want story tests to stand out in the suite.

## API Reference

### story.init(scenario, **options)

Initialize a story at the start of the test.

```python
story.init(
    "Login succeeds",
    tags=["smoke", "auth"],
    ticket=["AUTH-42", "AUTH-43"],  # also accepts {"id": "AUTH-42", "url": "https://..."}
    meta={"priority": "high"},
    trace_url_template="https://jaeger.example.com/trace/{traceId}",
)
```

### Step Markers

Step markers are documentation-first. Your Python code stays in normal function scope.

```python
story.given("a seeded database")
db = seed_db()

story.when("the service loads the account")
account = load_account(db)

story.then("the account is active")
assert account.active is True
```

| Method          | Keyword | Purpose            |
| --------------- | ------- | ------------------ |
| `story.given()` | Given   | Precondition/setup |
| `story.when()`  | When    | Action             |
| `story.then()`  | Then    | Assertion          |
| `story.and_()`  | And     | Continuation       |
| `story.but()`   | But     | Negative contrast  |

Repeated `given`, `when`, and `then` calls auto-render as `And`. Explicit `and_` and `but` keep their own keywords.

### Step Aliases

```python
story.arrange("setup")
story.act("action")
story.assert_("check")

story.setup("initial state")
story.context("extra context")
story.execute("operation")
story.action("user action")
story.verify("outcome")
```

`assert_` and `and_` use a trailing underscore because `assert` and `and` are Python keywords.

### Wrapped Steps

```python
profile = story.fn("When", "the profile is fetched", lambda: fetch_profile("user-123"))

story.expect("the profile contains the correct name", lambda: (
    profile.name == "Alice" or (_ for _ in ()).throw(AssertionError("wrong name"))
))
```

`story.fn(...)` and `story.expect(...)` record timing around the callable and return its result.

### Standalone Doc Methods

Call after a step to attach docs to that step, or before any step to attach them at story level.

```python
story.given("a valid payment request")
story.json("Request payload", {"amount": 50, "currency": "USD"})
story.kv("Gateway", "stripe")

story.when("the payment is submitted")
story.code("Response", '{ "status": "ok" }', lang="json")

story.then("the order is confirmed")
story.table(
    "Order summary",
    columns=["Item", "Qty", "Price"],
    rows=[["Widget", "2", "$25"]],
)
story.link("API docs", "https://docs.example.com/payments")
story.note("Payment processed in sandbox mode")
```

### Inline Docs

Step markers accept a `docs=` list:

```python
story.given("valid credentials", docs=[
    {"kind": "kv", "label": "username", "value": "alice", "phase": "runtime"},
    {"kind": "note", "text": "Password masked for security", "phase": "runtime"},
])
```

### Nested Doc Children

Standalone doc helpers accept `children=`. When a child is nested later, it is removed from earlier flat story-level or step-level doc lists and kept only under the parent.

```python
story.given("the first step")
child = story.note("shared child")

story.when("the second step")
story.note("parent note", children=[child])
```

You can also attach nested docs inline:

```python
child = story.kv("User", "alice")

story.given("a user exists", docs=[
    story.note("parent note", children=[child]),
])
```

## Reporting

The pytest plugin writes `.executable-stories/raw-run.json` automatically after the run. Override the path with `EXECUTABLE_STORIES_OUTPUT`.

## Common Mistakes

### Missing story.init()

Call `story.init(...)` before steps or docs.

### Using `and` or `assert`

Use `and_()` and `assert_()` instead.

### Reusing the same generic scenario title in parametrized tests

For `pytest.mark.parametrize`, build the scenario title from the parameters so each case has a distinct story name.

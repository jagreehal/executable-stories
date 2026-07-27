---
name: pytest-story-api
description: >
  Use when writing BDD story tests in Python with executable-stories-pytest:
  the module-singleton story API (story.init, given/when/then/and_/assert_),
  wrapped steps, or automatic JSON output via pytest plugin hooks.
type: core
library: executable-stories-pytest
library_version: "0.1.0"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-pytest/src/executable_stories/_story_api.py"
  - "jagreehal/executable-stories:packages/executable-stories-pytest/src/executable_stories/_plugin.py"
---

# executable-stories-pytest — Story API

## Setup

```python
from executable_stories import story


def test_applies_discount_code():
    story.init("Applies discount code", tags=["checkout"], ticket="CART-42", covers=["src/checkout.py"])

    story.given("a cart with items totaling $100")
    cart = create_cart([{"name": "Shirt", "price": 100}])

    story.when("a 20% discount code is applied")
    apply_discount(cart, "SAVE20")

    story.then("the total is $80")
    assert cart.total == 80

    story.and_("the discount is shown in the summary")
    assert len(cart.discounts) == 1
```

File naming: `test_*_story.py`. Output is automatic via the pytest plugin — `.executable-stories/raw-run.json` is written after all tests. Override with `EXECUTABLE_STORIES_OUTPUT` env var. The run JSON's first key is a `$schema` pointer, so editors validate it as it is written; the plugin also prints a `next:` hint to stderr (silence with `EXECUTABLE_STORIES_QUIET`). Render it with `executable-stories format` (path optional — defaults to `.executable-stories/raw-run.json`) or diagnose it with `executable-stories doctor`.

Note: `and_` has a trailing underscore because `and` is a Python keyword.

## Core Patterns

### Step markers with Auto-And conversion

First call to `given()`, `when()`, or `then()` renders the keyword as-is. Subsequent calls to the same keyword auto-convert to "And". Explicit `and_()` always renders "And". Explicit `but()` always renders "But" and never auto-converts.

```python
def test_blocks_suspended_user_login():
    story.init("Blocks suspended user login")

    story.given("the user account exists")          # renders "Given"
    story.given("the account is suspended")          # renders "And" (auto-converted)
    story.when("the user submits valid credentials")
    story.then("the user sees an error message")
    story.but("the user is not logged in")           # renders "But" (always)
    story.but("no session is created")               # renders "But" (always)
```

### Step aliases

AAA pattern: `story.arrange()` (Given), `story.act()` (When), `story.assert_()` (Then).

Additional: `story.setup()`, `story.context()` (Given), `story.execute()`, `story.action()` (When), `story.verify()` (Then).

Note: The Then alias is `assert_()` because `assert` is a Python keyword.

### Doc entries attached to steps

```python
def test_processes_payment():
    story.init("Processes payment")

    story.given("a valid payment request")
    story.json("Request payload", {"amount": 50, "currency": "USD"})
    story.kv("Gateway", "stripe")

    story.when("the payment is submitted")
    story.code("Response", '{ "status": "ok" }', lang="json")

    story.then("the order is confirmed")
    story.table("Order summary",
        columns=["Item", "Qty", "Price"],
        rows=[["Widget", "2", "$25"]],
    )
    story.link("API docs", "https://docs.example.com/payments")
    story.note("Payment processed in sandbox mode")
```

### State snapshots (state)

`story.state(value, label=None)` captures what the world looks like at the current step as a JSON-serializable snapshot. Steps carrying state docs (or screenshots) become storyboard frames: a label's first appearance shows the full snapshot, consecutive snapshots with the same label render as a diff (`total: 0 → 45`), and multiple labels appear as side-by-side lanes.

```python
story.given("an empty basket")
story.state({"items": [], "total": 0}, label="Basket")

story.when("the shopper adds a hoodie")
story.state({"items": ["hoodie"], "total": 45}, label="Basket")
```

Capture the business-relevant projection, not the ORM entity.

### Embedded HTML

Embed generated HTML (charts, single-file reports, skill/agent output) in an
always-sandboxed iframe in the report. Exactly one of `path` / `url` / `content`
is required; optional `title` and `height` (number → px, string passed through; default 400px).

```python
story.html(content=chart_html, title="Latency chart", height=600)
story.html(url="https://dash.example.com/run/42", height=600)
story.html(path="./reports/summary.html", title="Summary")
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

### Inline docs via docs parameter

```python
story.given("valid credentials", docs=[
    {"kind": "kv", "label": "username", "value": "alice", "phase": "runtime"},
    {"kind": "note", "text": "Password masked for security", "phase": "runtime"},
])
```

### Step wrappers with timing

```python
def test_fetches_user_profile():
    story.init("Fetches user profile")

    story.given("a registered user")

    profile = story.fn("When", "the profile is fetched", lambda: fetch_profile("user-123"))

    def check_name():
        assert profile.name == "Alice"

    story.expect("the profile contains the correct name", check_name)
```

`fn` and `expect` wrap a callable with automatic timing. Exceptions propagate after duration is recorded. Both return the callable's result.

### Init options

```python
story.init("My scenario",
    tags=["smoke", "auth"],
    ticket="AUTH-42",              # or ticket=["AUTH-42", "AUTH-43"]
    meta={"priority": "high"},
    trace_url_template="https://jaeger.example.com/trace/{traceId}",
)
```

### Manual step timing

```python
story.given("a step to time")
token = story.start_timer()
# ... work ...
story.end_timer(token)
```

### Attachments

```python
story.attach("debug.log", "text/plain", path="/tmp/debug.log")
story.attach("config", "application/json", body='{"key":"val"}', encoding="IDENTITY")
```

## Common Mistakes

### CRITICAL Missing story.init() before steps

Wrong:

```python
def test_my_scenario():
    story.given("something")  # No context — steps are lost
```

Correct:

```python
def test_my_scenario():
    story.init("My scenario")
    story.given("something")
```

`story.init()` creates the thread-local context. Without it, step calls have no effect.

Source: packages/executable-stories-pytest/src/executable_stories/_story_api.py

### HIGH Using `and` or `assert` instead of `and_` or `assert_`

Wrong:

```python
story.and("also this")     # SyntaxError: 'and' is a Python keyword
story.assert("result")     # SyntaxError: 'assert' is a Python keyword
```

Correct:

```python
story.and_("also this")    # Trailing underscore
story.assert_("result")    # Trailing underscore
```

Python keywords `and` and `assert` cannot be used as method names. The trailing underscore follows PEP 8 naming conventions for keyword conflicts.

Source: packages/executable-stories-pytest/src/executable_stories/_story_api.py

### MEDIUM Parameterized scenarios with pytest.mark.parametrize

```python
import pytest

@pytest.mark.parametrize("a,b,expected", [(1, 2, 3), (2, 3, 5)])
def test_addition(a, b, expected):
    story.init(f"Adding {a} and {b}")
    story.given(f"two numbers {a} and {b}")
    story.when("the numbers are added")
    result = a + b
    story.then(f"the result is {expected}")
    assert result == expected
```

Each parametrize iteration produces a separate scenario. Use f-strings in the scenario title so each has a distinct name.

Source: packages/executable-stories-pytest/src/executable_stories/_plugin.py

---
name: jest-story-api
description: >
  Use when writing BDD story tests in Jest with executable-stories-jest:
  top-level given/when/then/and/but imports, story.init(), or doc entries.
metadata:
  type: core
  library: executable-stories-jest
  library_version: "8.8.0"
  sources:
    - "jagreehal/executable-stories:packages/executable-stories-jest/src/index.ts"
    - "jagreehal/executable-stories:packages/executable-stories-jest/src/story-api.ts"
---

# executable-stories-jest — Story API

## Setup

```typescript
import { describe, expect, it } from "@jest/globals";
import { story, given, when, then } from "executable-stories-jest";

describe("Cart checkout", () => {
  it("applies discount code", () => {
    story.init({ tags: ["checkout"], ticket: "CART-42", covers: ["src/checkout.ts"] });

    given("a cart with items totaling $100");
    const cart = createCart([{ name: "Shirt", price: 100 }]);

    when("a 20% discount code is applied");
    applyDiscount(cart, "SAVE20");

    then("the total is $80");
    expect(cart.total).toBe(80);
  });
});
```

File naming: `*.story.test.ts`.

Jest uses top-level step exports. `story.init()` takes no arguments — the test name is derived from `expect.getState().currentTestName`.

## Core Patterns

### Top-level step exports

```typescript
import { story, given, when, then, and, but } from "executable-stories-jest";

it("blocks suspended user login", () => {
  story.init();

  given("the user account exists");         // renders "Given"
  given("the account is suspended");         // renders "And" (auto-converted)
  when("the user submits valid credentials");
  then("the user sees an error message");
  but("the user is not logged in");          // renders "But" (always)
});
```

### Doc entries

```typescript
import { story, given, when, then } from "executable-stories-jest";

it("processes payment", () => {
  story.init();

  given("a valid payment request");
  story.json({ label: "Payload", value: { amount: 50, currency: "USD" } });

  when("the payment is submitted");
  story.code({ label: "Response", content: '{ "status": "ok" }', lang: "json" });

  then("the order is confirmed");
  story.table({
    label: "Order summary",
    columns: ["Item", "Qty", "Price"],
    rows: [["Widget", "2", "$25"]],
  });
  story.note("Payment processed in sandbox mode");
});
```

### State snapshots (story.state)

`story.state({ label?, value })` captures what the world looks like at the current step as a JSON-serializable snapshot. Steps carrying state docs (or screenshots) become storyboard frames: a label's first appearance shows the full snapshot, consecutive snapshots with the same label render as a diff (`items[0].qty: 1 → 2`), and multiple labels appear as side-by-side lanes. Labels are scoped to the scenario: snapshots in different scenarios never diff against each other.

Reach for it wherever you would otherwise *assert* a difference. Run the same operation for two actors or two inputs, snapshot under one label after each, and the report states the delta itself — `+ tools[2]: "update_case"` — instead of leaving a reader to compare two blocks of JSON.

```typescript
given("an empty basket");
story.state({ label: "Basket", value: { items: [], total: 0 } });

when("the shopper adds a hoodie");
story.state({ label: "Basket", value: { items: [{ sku: "hoodie", qty: 1 }], total: 45 } });
```

Capture the business-relevant projection, not the ORM entity — the adapter warns above ~100KB.

### Embedded HTML

Embed generated HTML (charts, single-file reports, skill/agent output) in an
always-sandboxed iframe in the report. Exactly one of `path` / `url` / `content`
is required; optional `title` and `height` (number → px, string passed through; default 400px).

```ts
story.html({ content: chartHtml, title: "Latency chart", height: "60vh" });
story.html({ url: "https://dash.example.com/run/42", height: 600 });
story.html({ path: "./reports/summary.html", title: "Summary" });
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

```typescript
const profile = await story.fn("When", "the profile is fetched", async () => {
  return fetchProfile(userId);
});

await story.expect("the profile contains the correct name", () => {
  expect(profile.name).toBe("Alice");
});
```

Jest's live assertion counter is observed automatically. Assertions after a marker
belong to that marker until the next step or test end; `story.expect` measures its own
callback. A passing observable Then/And/But claim with zero assertions is marked in
Markdown and HTML and grades `none`. Grades are defined in spec-evidence-review/SKILL.md. An absent count means unobservable, not zero.

### Inline docs via second argument

```typescript
given("valid credentials", {
  json: { label: "Credentials", value: { user: "alice", role: "admin" } },
  note: "Password masked for security",
});
```

### Planned scenarios with it.todo

A bodyless `it.todo` records specified-but-unimplemented behavior. It appears in generated docs as a **Planned** scenario (title only, no steps) as long as the file contains at least one story test:

```typescript
describe("Checkout", () => {
  it("applies a discount code", () => {
    story.init();
    given("a cart with items");
    when("a valid discount code is applied");
    then("the total reflects the discount");
  });

  // Renders as "Planned" in the report; canonical status is pending
  it.todo("applies gift cards at checkout");
});
```

Markdown renders the heading with _(planned)_; the HTML report shows a **Planned** badge. A file containing only todos produces nothing — the story-file gate keeps plain suites out of the docs.

## Common Mistakes

### CRITICAL Calling story.init() with a task argument

Wrong:

```typescript
it("my test", ({ task }) => {
  story.init(task);  // Jest does not provide task
});
```

Correct:

```typescript
it("my test", () => {
  story.init();  // No arguments needed
});
```

Jest's `story.init()` takes no arguments. It reads the test name from `expect.getState().currentTestName`. Passing an argument is a Vitest pattern that does not apply to Jest.

Source: packages/executable-stories-jest/src/story-api.ts

### HIGH Suite path not detected in docs

Wrong assumption:

```typescript
// Expecting "Calculator" to appear as a ## heading in docs
describe("Calculator", () => {
  it("adds numbers", () => {
    story.init();
    // ...
  });
});
// Jest's currentTestName format is "Calculator adds numbers" (space-separated)
// Suite path is usually undefined → docs are flat
```

This is a known limitation. Jest's `expect.getState().currentTestName` uses space-separated format (`"Describe title test name"`), not `" > "` separated. Suite path extraction only works when `" > "` is present. In the default Jest setup, docs are flat without `## Suite name` headings.

Source: CLAUDE.md — "Doc heading and describe in generated docs"

### HIGH Missing setup file in jest.config

Wrong:

```javascript
// jest.config.mjs
export default {
  reporters: ["default", "executable-stories-jest/reporter"],
};
```

Correct:

```javascript
// jest.config.mjs
export default {
  setupFilesAfterEnv: ["executable-stories-jest/setup"],
  reporters: ["default", "executable-stories-jest/reporter"],
};
```

The setup file registers an `afterAll` hook that flushes story metadata to disk. Without it, the reporter has no data to process.

Source: packages/executable-stories-jest/src/reporter.ts

### MEDIUM Calling steps before story.init()

Wrong:

```typescript
it("my test", () => {
  given("something");
  story.init();
});
```

Correct:

```typescript
it("my test", () => {
  story.init();
  given("something");
});
```

Steps called before `init()` are silently dropped because no story context exists.

Source: packages/eslint-plugin-executable-stories-jest/src/rules/require-story-context-for-steps.ts

## Parameterized Scenarios (Scenario Outline equivalent)

Use Jest's `it.each` with `story.init()` to produce one scenario per data row — the framework-native replacement for Cucumber's Scenario Outline + Examples.

```ts
import { story, given, when, then } from "executable-stories-jest";

const cases = [
  { input: 1, expected: 2 },
  { input: 2, expected: 4 },
  { input: 3, expected: 6 },
];

describe("Doubling", () => {
  it.each(cases)("doubles $input to $expected", ({ input, expected }) => {
    story.init();
    given(`the input is ${input}`);
    when("the doubler runs");
    then(`the result is ${expected}`);
    expect(input * 2).toBe(expected);
  });
});
```

Each iteration produces a separate scenario in the generated report. `story.init()` is not a scenario-title setter — the scenario title comes from Jest's `currentTestName`, so use an interpolated `it.each` title template (as above) so each row gets a distinct, descriptive name.

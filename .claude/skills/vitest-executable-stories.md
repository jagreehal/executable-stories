---
name: vitest-story-api
description: >
  Write BDD stories in Vitest using executable-stories-vitest. Callback-only
  API: story.init(task) with ({ task }) destructuring. Steps: given, when,
  then, and, but. Doc entries: json, kv, code, table, link, section, mermaid,
  note, tag, screenshot, custom. Auto-And keyword conversion. No top-level
  then export. Aliases: arrange, act, assert. Inline docs via second argument.
type: core
library: executable-stories-vitest
library_version: "7.0.1"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-vitest/src/story-api.ts"
  - "jagreehal/executable-stories:apps/docs-site/src/content/docs/vitest/vitest-story-api.md"
---

# executable-stories-vitest — Story API

## Setup

### Reporter (required for output)

Stories only produce reports when `StoryReporter` is configured in `vitest.config.ts`. **Do NOT use Vitest's built-in `html` reporter** — it generates Vitest's own UI, not executable-stories reports.

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { StoryReporter } from "executable-stories-vitest/reporter";

export default defineConfig({
  test: {
    reporters: [
      "default",
      new StoryReporter({
        formats: ["html", "markdown"],
        outputDir: "reports",
        outputName: "test-results",
      }),
    ],
  },
});
```

Peer dependency: `executable-stories-formatters` must be installed alongside `executable-stories-vitest`.

See vitest-reporter-setup/SKILL.md for output modes, format options, and advanced configuration.

### Story API usage

```typescript
import { describe, expect, it } from "vitest";
import { story } from "executable-stories-vitest";

describe("Cart checkout", () => {
  it("applies discount code", ({ task }) => {
    story.init(task, { tags: ["checkout"], ticket: "CART-42" });

    story.given("a cart with items totaling $100");
    const cart = createCart([{ name: "Shirt", price: 100 }]);

    story.when("a 20% discount code is applied");
    applyDiscount(cart, "SAVE20");

    story.then("the total is $80");
    expect(cart.total).toBe(80);

    story.and("the discount is shown in the summary");
    expect(cart.discounts).toHaveLength(1);
  });
});
```

File naming: `*.story.test.ts` or `*.story.spec.ts`.

## Core Patterns

### Step markers with Auto-And conversion

First call to `given()`, `when()`, or `then()` renders the keyword as-is. Subsequent calls to the same keyword in the same story auto-convert to "And". Explicit `and()` always renders "And". Explicit `but()` always renders "But" and never auto-converts.

```typescript
it("blocks suspended user login", ({ task }) => {
  story.init(task);

  story.given("the user account exists");        // renders "Given"
  story.given("the account is suspended");        // renders "And" (auto-converted)
  story.when("the user submits valid credentials");
  story.then("the user sees an error message");
  story.but("the user is not logged in");         // renders "But" (always)
  story.but("no session is created");             // renders "But" (always)
});
```

### Doc entries attached to steps

```typescript
it("processes payment", ({ task }) => {
  story.init(task);

  story.given("a valid payment request");
  story.json({ label: "Request payload", value: { amount: 50, currency: "USD" } });
  story.kv({ label: "Gateway", value: "stripe" });

  story.when("the payment is submitted");
  story.code({ label: "Response", content: '{ "status": "ok" }', lang: "json" });

  story.then("the order is confirmed");
  story.table({
    label: "Order summary",
    columns: ["Item", "Qty", "Price"],
    rows: [["Widget", "2", "$25"]],
  });
  story.link({ label: "API docs", url: "https://docs.example.com/payments" });
  story.note("Payment processed in sandbox mode");
});
```

### Inline docs via second argument

```typescript
story.given("valid credentials", {
  json: { label: "Credentials", value: { user: "alice", role: "admin" } },
  note: "Password masked for security",
});
```

### Step wrappers with timing

```typescript
it("fetches user profile", ({ task }) => {
  story.init(task);

  story.given("a registered user");
  const userId = "user-123";

  const profile = await story.fn("When", "the profile is fetched", async () => {
    return fetchProfile(userId);
  });

  await story.expect("the profile contains the correct name", () => {
    expect(profile.name).toBe("Alice");
  });
});
```

## Common Mistakes

### CRITICAL Missing task argument in story.init()

Wrong:

```typescript
it("my test", () => {
  story.init();
  story.given("something");
});
```

Correct:

```typescript
it("my test", ({ task }) => {
  story.init(task);
  story.given("something");
});
```

Without `task`, story metadata is not linked to the test and the reporter cannot capture it. The `task` object comes from Vitest's test callback destructuring.

Source: packages/executable-stories-vitest/src/story-api.ts

### CRITICAL Importing top-level then from the package

Wrong:

```typescript
import { story, then } from "executable-stories-vitest";
```

Correct:

```typescript
import { story } from "executable-stories-vitest";

it("my test", ({ task }) => {
  story.init(task);
  story.then("result is correct");
});
```

A top-level `then` export would make the module namespace thenable. Tools using `await import("executable-stories-vitest")` would treat the module as a Promise and invoke `then` unexpectedly. All step functions exist only on the `story` object.

Source: CLAUDE.md — "Vitest: do not export top-level then"

### HIGH Expecting but() to auto-convert to And

Wrong:

```typescript
story.then("the user sees a success message");
story.but("no email is sent");  // Developer expects this to render "And"
```

Correct:

```typescript
// but() always renders "But" — this is intentional for negative/contrast intent
story.then("the user sees a success message");
story.but("no email is sent");  // Renders "But" (correct for contrast)

// Use and() if you want "And"
story.then("the user sees a success message");
story.and("no email is sent");  // Renders "And"
```

`but()` expresses negative intent or contrast and never auto-converts. This matches Gherkin semantics.

Source: packages/executable-stories-vitest/src/story-api.ts

### HIGH Calling steps before story.init()

Wrong:

```typescript
it("my test", ({ task }) => {
  story.given("something");
  story.init(task);
});
```

Correct:

```typescript
it("my test", ({ task }) => {
  story.init(task);
  story.given("something");
});
```

Steps called before `init()` are silently dropped because no story context exists yet.

Source: packages/eslint-plugin-executable-stories-vitest/src/rules/require-init-before-steps.ts

### CRITICAL Using Vitest's built-in html reporter instead of StoryReporter

Wrong:

```typescript
// vitest.config.ts — this produces Vitest's UI, NOT executable-stories reports
export default defineConfig({
  test: {
    reporters: ['default', 'html'],
    outputFile: { html: 'reports/test-results.html' },
  },
});
```

Correct:

```typescript
// vitest.config.ts
import { StoryReporter } from "executable-stories-vitest/reporter";

export default defineConfig({
  test: {
    reporters: [
      'default',
      new StoryReporter({
        formats: ['html', 'markdown'],
        outputDir: 'reports',
        outputName: 'test-results',
      }),
    ],
  },
});
```

Vitest's `html` reporter generates its own UI shell (a small HTML file that loads a JS bundle). It does not understand story metadata. Use `StoryReporter` from `executable-stories-vitest/reporter` to generate executable-stories HTML reports.

Source: packages/executable-stories-vitest/src/reporter.ts

See also: vitest-reporter-setup/SKILL.md — Stories need a reporter to produce output
See also: eslint-vitest-rules/SKILL.md — ESLint enforces correct story.init() usage

## Parameterized Scenarios (Scenario Outline equivalent)

Use Vitest's `it.each` with `story()` to produce one scenario per data row — the framework-native replacement for Cucumber's Scenario Outline + Examples.

```ts
import { story } from "executable-stories-vitest";

const cases = [
  { input: 1, expected: 2 },
  { input: 2, expected: 4 },
  { input: 3, expected: 6 },
];

describe("Doubling", () => {
  it.each(cases)("doubles $input to $expected", ({ input, expected }) => {
    story(`Doubles ${input} to ${expected}`, (s) => {
      s.given(`the input is ${input}`);
      s.when("the doubler runs");
      s.then(`the result is ${expected}`);
      expect(input * 2).toBe(expected);
    });
  });
});
```

Each iteration produces a separate scenario in the generated report. Use interpolated titles so each scenario has a distinct, descriptive name.

---
name: cypress-story-api
description: >
  Write BDD stories in Cypress using executable-stories-cypress. story.init()
  with optional StoryOptions. Steps: story.given, story.when, story.then,
  story.and, story.but. Doc entries: json, kv, code, table, link, section,
  mermaid, screenshot, html, note, tag. Auto-And keyword conversion. Browser-Node
  bridge via cy.task. Aliases: arrange, act, assert.
type: core
library: executable-stories-cypress
library_version: "7.0.1"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-cypress/src/story-api.ts"
  - "jagreehal/executable-stories:packages/executable-stories-cypress/src/index.ts"
---

# executable-stories-cypress — Story API

## Setup

Three wiring steps are required:

```typescript
// 1. cypress.config.ts — register the plugin
import { defineConfig } from "cypress";
import { registerExecutableStoriesPlugin } from "executable-stories-cypress/plugin";

export default defineConfig({
  e2e: {
    setupNodeEvents(on) {
      registerExecutableStoriesPlugin(on);
    },
  },
});
```

```typescript
// 2. cypress/support/e2e.ts — import the support file
import "executable-stories-cypress/support";
```

```typescript
// 3. cypress/e2e/checkout.story.cy.ts — write a story test
import { story } from "executable-stories-cypress";

describe("Cart checkout", () => {
  it("applies discount code", () => {
    story.init({ tags: ["checkout"], ticket: "CART-42", covers: ["src/checkout.ts"] });

    story.given("a cart with items totaling $100");
    cy.visit("/cart");
    cy.get("[data-testid=total]").should("contain", "$100");

    story.when("a 20% discount code is applied");
    cy.get("#discount-code").type("SAVE20");
    cy.get("#apply-discount").click();

    story.then("the total is $80");
    cy.get("[data-testid=total]").should("contain", "$80");
  });
});
```

File naming: `*.story.cy.ts`.

## Core Patterns

### Step markers with Auto-And conversion

```typescript
it("blocks suspended user login", () => {
  story.init();

  story.given("the user account exists");        // renders "Given"
  story.given("the account is suspended");        // renders "And" (auto-converted)
  story.when("the user submits valid credentials");
  cy.get("#email").type("user@test.com");
  cy.get("#submit").click();

  story.then("the user sees an error message");
  cy.get(".error").should("be.visible");

  story.but("the user is not logged in");         // renders "But" (always)
  cy.url().should("include", "/login");
});
```

### Doc entries

```typescript
it("processes payment", () => {
  story.init();

  story.given("a valid payment request");
  story.json({ label: "Payload", value: { amount: 50, currency: "USD" } });

  story.when("the payment is submitted");
  cy.get("#pay").click();

  story.then("the order is confirmed");
  story.table({
    label: "Order summary",
    columns: ["Item", "Qty", "Price"],
    rows: [["Widget", "2", "$25"]],
  });
  story.screenshot({ path: "screenshots/confirmation.png", alt: "Confirmation" });
  story.note("Payment processed in sandbox mode");
});
```

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

### Step wrappers

```typescript
const result = story.fn("When", "the calculation runs", () => {
  return calculate(2, 3);
});

story.expect("the result is correct", () => {
  expect(result).to.equal(5);
});
```

## Common Mistakes

### CRITICAL Missing plugin registration

Wrong:

```typescript
// cypress.config.ts
export default defineConfig({
  e2e: {
    setupNodeEvents(on) {
      // No plugin registered
    },
  },
});
```

Correct:

```typescript
import { registerExecutableStoriesPlugin } from "executable-stories-cypress/plugin";

export default defineConfig({
  e2e: {
    setupNodeEvents(on) {
      registerExecutableStoriesPlugin(on);
    },
  },
});
```

The plugin registers `cy.task` handlers for `executableStories:recordMeta`. Without it, the support file's `afterEach` hook fails silently and no story metadata is captured.

Source: packages/executable-stories-cypress/src/plugin.ts

### CRITICAL Missing support file import

Wrong:

```typescript
// cypress/support/e2e.ts
// (no executable-stories import)
```

Correct:

```typescript
// cypress/support/e2e.ts
import "executable-stories-cypress/support";
```

The support file registers an `afterEach` hook that sends story metadata from the browser to Node via `cy.task`. Without it, stories are recorded in the browser but never reach the reporter.

Source: packages/executable-stories-cypress/src/support.ts

### HIGH Using wrong file extension

Wrong:

```
cypress/e2e/checkout.story.test.ts
```

Correct:

```
cypress/e2e/checkout.story.cy.ts
```

Cypress uses `.cy.ts` file extensions. The reporter expects `.story.cy.ts` for story test files.

Source: CLAUDE.md — "Story test files use .story.cy.ts (cypress)"

### MEDIUM Calling steps before story.init()

Wrong:

```typescript
it("my test", () => {
  story.given("something");
  story.init();
});
```

Correct:

```typescript
it("my test", () => {
  story.init();
  story.given("something");
});
```

Steps called before `init()` are silently dropped because no story context exists.

Source: packages/executable-stories-cypress/src/story-api.ts

---
name: cypress-converting-tests
description: >
  Use when incrementally adopting executable-stories in an existing Cypress
  test suite, converting cy.ts specs to story tests, or adding story.init()
  without a full rewrite. Progressive enhancement of .story.cy.ts files;
  requires plugin and support-file wiring.
metadata:
  type: lifecycle
  library: executable-stories-cypress
  library_version: "8.8.0"
  requires:
    - cypress-story-api
  sources:
    - "jagreehal/executable-stories:packages/executable-stories-cypress/src/index.ts"
---

This skill builds on cypress-story-api. Read cypress-story-api first.

# Converting Existing Cypress Tests

## Setup

Install and configure the three wiring points:

```bash
npm install -D executable-stories-cypress executable-stories-formatters
```

```typescript
// cypress.config.ts
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
// cypress/support/e2e.ts
import "executable-stories-cypress/support";
```

## Core Patterns

### Step 1: Rename the file

```
# Before
cypress/e2e/login.cy.ts

# After
cypress/e2e/login.story.cy.ts
```

### Step 2: Add story.init() and step markers

```typescript
// Before
describe("Login", () => {
  it("logs in successfully", () => {
    cy.visit("/login");
    cy.get("#email").type("user@example.com");
    cy.get("#password").type("secret");
    cy.get("#submit").click();
    cy.get("h1").should("contain", "Dashboard");
  });
});
```

```typescript
// After
import { story } from "executable-stories-cypress";

describe("Login", () => {
  it("logs in successfully", () => {
    story.init();

    story.given("the login page is loaded");
    cy.visit("/login");

    story.when("valid credentials are entered");
    cy.get("#email").type("user@example.com");
    cy.get("#password").type("secret");
    cy.get("#submit").click();

    story.then("the dashboard is shown");
    cy.get("h1").should("contain", "Dashboard");
  });
});
```

### Step 3: Minimal story

```typescript
it("loads homepage", () => {
  story.init();
  cy.visit("/");
  cy.title().should("eq", "My App");
});
```

### Step 4: Add doc entries

```typescript
it("shows product details", () => {
  story.init({ tags: ["e2e", "products"] });

  story.given("the product page is loaded");
  cy.visit("/products/123");

  story.then("the product details are shown");
  cy.screenshot("product", { onAfterScreenshot: (_el, props) => {
    story.screenshot({ path: props.path, alt: "Product page" });
  } });
  story.json({ label: "Product", value: { id: 123, name: "Widget" } });
});
```

## Common Mistakes

### HIGH Using wrong file extension

Wrong: `login.story.test.ts` or `login.story.spec.ts`
Correct: `login.story.cy.ts`

Cypress convention uses `.cy.ts`. The reporter and file matching expect this extension.

Source: CLAUDE.md — file naming conventions

### CRITICAL Forgetting plugin or support file

Both `registerExecutableStoriesPlugin(on)` in cypress.config.ts AND `import "executable-stories-cypress/support"` in e2e.ts are required. Missing either one causes silent failures — stories record in the browser but never reach the reporter.

Source: packages/executable-stories-cypress/src/plugin.ts, packages/executable-stories-cypress/src/support.ts

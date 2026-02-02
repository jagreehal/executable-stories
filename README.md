# executable-stories

Executable stories without Cucumber in your framework of choice with automatic Markdown documentation.

## Why not Cucumber?

| This project | Cucumber |
| ------------ | -------- |
| Write TypeScript | Write Gherkin feature files |
| Steps are inline functions | Steps matched by regex |
| Normal variables and closures | World object and shared state |
| Docs generated from test runs | Separate documentation pipeline |

One source of truth. Code that executes. Docs that do not lie.

## What you get

- Scenario API built on your test runner's native primitives
- `given()`, `when()`, `then()` helpers that register real tests
- Reporter that generates Markdown from test metadata
- Output readable by developers and stakeholders

If a test is skipped, failed, or todo, the docs reflect that.

## Packages

| Package | Test Runner | Install |
| ------- | ----------- | ------- |
| [jest-executable-stories](./packages/jest-executable-stories) | Jest 29+ | `npm i -D jest-executable-stories` |
| [vitest-executable-stories](./packages/vitest-executable-stories) | Vitest 4+ | `npm i -D vitest-executable-stories` |
| [playwright-executable-stories](./packages/playwright-executable-stories) | Playwright 1.40+ | `npm i -D playwright-executable-stories` |

## Quick example

```ts
import { scenario } from "vitest-executable-stories"; // or jest/playwright
import { expect } from "vitest";

scenario("User logs in", ({ given, when, then }) => {
  given("user is on login page", async () => {
    await page.goto("/login");
  });

  when("user submits valid credentials", async () => {
    await page.fill("[name=email]", "user@example.com");
    await page.click("button[type=submit]");
  });

  then("user sees the dashboard", async () => {
    expect(page.url()).toContain("/dashboard");
  });
});
```

**Generated Markdown:**

```markdown
### User logs in

- **Given** user is on login page
- **When** user submits valid credentials
- **Then** user sees the dashboard
```

## Getting started

1. Install the package for your test runner
2. Add the reporter to your config
3. Run your tests
4. Open the generated Markdown

See each package's README for detailed setup instructions.

## License

MIT

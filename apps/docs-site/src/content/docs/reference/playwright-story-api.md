---
title: Playwright story & doc API
description: story(), given/when/then, StoryOptions, and doc API for playwright-executable-stories
---

Playwright exports **top-level** step functions: `given`, `when`, `then`, `and`, `but`. Step callbacks receive **Playwright fixtures** (e.g. `{ page }`).

## story(title, [options], define)

Same as Jest: options `tags`, `ticket`, `meta`. Steps run as Playwright tests with access to fixtures.

```typescript
import { story, given, when, then } from "playwright-executable-stories";
import { expect } from "@playwright/test";

story("User logs in", () => {
  given("user is on login page", async ({ page }) => {
    await page.goto("/login");
  });
  when("user submits valid credentials", async ({ page }) => {
    await page.fill("[name=email]", "user@example.com");
    await page.fill("[name=password]", "secret");
    await page.click("button[type=submit]");
  });
  then("user sees the dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
  });
});
```

## Step functions

- **given**, **when**, **then**, **and**, **but** — same keyword/And/But rules.
- **Aliases:** arrange, act, assert, setup, context, execute, action, verify.
- **Modifiers:** `.skip`, `.only`, `.fixme`, `.todo`, `.fail`, `.slow` (Playwright-specific where applicable).

## doc API

Same as Vitest/Jest: `doc.note`, `doc.tag`, `doc.kv`, `doc.code`, `doc.json`, `doc.table`, `doc.link`, `doc.section`, `doc.mermaid`, `doc.screenshot`, `doc.custom`, and `doc.runtime.*`. Use `doc.story(title, define)` to attach metadata to a plain `test()`.

See [Vitest story & doc API](/reference/vitest-story-api/) for detailed doc method descriptions.

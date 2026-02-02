---
title: Jest story & doc API
description: story(), given/when/then, StoryOptions, and doc API for jest-executable-stories
---

Jest exports **top-level** step functions: `given`, `when`, `then`, `and`, `but`. Use them inside a `story()` callback.

## story(title, [options], define)

Same as Vitest: registers a describe block and steps as tests. Options: `tags`, `ticket`, `meta`.

```typescript
import { story, given, when, then } from "jest-executable-stories";

story("User logs in", () => {
  given("user is on login page");
  when("user submits valid credentials");
  then("user sees the dashboard", () => {
    expect(true).toBe(true);
  });
});
```

## Step functions

- **given**, **when**, **then**, **and**, **but** — same keyword/And/But rules as Vitest.
- **Aliases:** arrange, act, assert, setup, context, execute, action, verify.
- **Modifiers:** `.skip`, `.only`, `.todo`, `.fails`, `.concurrent` on each step.

## doc API

Access **doc** inside a story via the steps context (same as Vitest): `doc.note`, `doc.tag`, `doc.kv`, `doc.code`, `doc.json`, `doc.table`, `doc.link`, `doc.section`, `doc.mermaid`, `doc.screenshot`, `doc.custom`, and `doc.runtime.*`. Use `doc.story(title, define)` to attach metadata to a plain `it()`.

See [Vitest story & doc API](/reference/vitest-story-api/) for detailed doc method descriptions and examples.

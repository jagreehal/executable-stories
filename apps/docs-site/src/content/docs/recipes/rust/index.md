---
title: Recipes (Rust)
description: Example scenarios with Rust code and generated Markdown output
slug: recipes/rust
---

8 representative recipes showing key BDD patterns with Rust. The generated output is identical across all frameworks — only the test code differs.

## Key difference from Vitest

| Aspect | Vitest | Rust |
|--------|--------|------|
| Import | `import { story } from 'executable-stories-vitest'` | `use executable_stories::Story;` |
| Init | `story.init(task)` | `let mut s = Story::new("scenario name");` |
| Test function | `it("name", ({ task }) => { ... })` | `#[test] fn test_name() { ... }` |
| Steps | `story.given(...)` | `s.given(...)` |
| Tags | `story.init(task, { tags: ["t1"] })` | `Story::new("name").with_tags(&["t1"])` |
| Finish | (automatic) | `s.pass()` must be called at the end |

## Recipe list

| Scenario | Pattern |
|----------|---------|
| [User logs in successfully](user-logs-in-successfully/) | Multiple Given (And auto-conversion) |
| [Login works](login-works/) | Story with tags |
| [Login blocked for suspended user](login-blocked-suspended-user/) | Use of But |
| [Checkout calculates totals](checkout-calculates-totals/) | Multiple Then |
| [Bulk user creation](bulk-user-creation/) | doc.table |
| [API accepts JSON payload](api-accepts-json-payload/) | doc.json |
| [Import XML invoice](import-xml-invoice/) | doc.code |
| [Create order](create-order/) | Background and tags |

For the full 32-scenario set, see the [Vitest recipes](recipes/vitest/).

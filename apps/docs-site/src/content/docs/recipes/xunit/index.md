---
title: Recipes (xUnit / C#)
description: Example scenarios with C# code and generated Markdown output
slug: recipes/xunit
---

8 representative recipes showing key BDD patterns with xUnit and C#. The generated output is identical across all frameworks — only the test code differs.

## Key difference from Vitest

| Aspect | Vitest | xUnit / C# |
|--------|--------|------------|
| Import | `import { story } from 'executable-stories-vitest'` | `using ExecutableStories.Xunit;` |
| Init | `story.init(task)` | `Story.Init("scenario name");` |
| Test function | `it("name", ({ task }) => { ... })` | `[Fact] public void TestName() { ... }` |
| Steps | `story.given(...)` | `Story.Given(...)` |
| Tags | `story.init(task, { tags: ["t1"] })` | `Story.Init("name", "t1", "t2");` |
| Cleanup | (automatic) | Class must implement `IDisposable`; call `Story.RecordAndClear()` in `Dispose()` |

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

For the full 32-scenario set, see the [Vitest recipes](/recipes/vitest/).

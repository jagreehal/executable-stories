---
title: Recipes (JUnit 5 / Kotlin)
description: Example scenarios with Kotlin code and generated Markdown output
slug: recipes/junit5
---

8 representative recipes showing key BDD patterns with JUnit 5 and Kotlin. The generated output is identical across all frameworks — only the test code differs.

## Key difference from Vitest

| Aspect | Vitest | JUnit 5 / Kotlin |
|--------|--------|------------------|
| Import | `import { story } from 'executable-stories-vitest'` | `import dev.executablestories.junit5.Story` |
| Init | `story.init(task)` | `Story.init("scenario name")` |
| Test function | `it("name", ({ task }) => { ... })` | `@Test fun \`test name\`() { ... }` |
| Steps | `story.given(...)` | `Story.given(...)` |
| `when` step | `story.when(...)` | `` Story.`when`(...) `` (backticks — `when` is a Kotlin keyword) |
| Tags | `story.init(task, { tags: ["t1"] })` | `Story.init("name", "t1", "t2")` |

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

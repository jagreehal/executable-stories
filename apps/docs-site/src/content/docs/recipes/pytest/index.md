---
title: Recipes (pytest)
description: Example scenarios with pytest code and generated Markdown output
slug: recipes/pytest
---

8 representative recipes showing key BDD patterns with pytest. The generated output is identical across all frameworks — only the test code differs.

## Key difference from Vitest

| Aspect | Vitest | pytest |
|--------|--------|--------|
| Import | `import { story } from 'executable-stories-vitest'` | `from executable_stories import story` |
| Init | `story.init(task)` | `story.init("scenario name")` |
| Test function | `it("name", ({ task }) => { ... })` | `def test_name():` |
| Steps | `story.given(...)` | `story.given(...)` |
| `and` step | `story.and(...)` | `story.and_(...)` (trailing underscore — `and` is a Python keyword) |
| Tags | `story.init(task, { tags: ["t1"] })` | `story.init("name", tags=["t1"])` |

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

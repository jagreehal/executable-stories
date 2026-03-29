---
title: Recipes (Go)
description: Example scenarios with Go code and generated Markdown output
slug: recipes/go
---

8 representative recipes showing key BDD patterns with Go. The generated output is identical across all frameworks — only the test code differs.

## Key difference from Vitest

| Aspect | Vitest | Go |
|--------|--------|----|
| Import | `import { story } from 'executable-stories-vitest'` | `import es "github.com/jagreehal/executable-stories/packages/executable-stories-go"` |
| Init | `story.init(task)` | `s := es.Init(t, "scenario name")` |
| Test function | `it("name", ({ task }) => { ... })` | `func TestName(t *testing.T) { ... }` |
| Steps | `story.given(...)` | `s.Given(...)` |
| Tags | `story.init(task, { tags: ["t1"] })` | `es.Init(t, "name", es.WithTags("t1"))` |

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

---
title: Configure feature flags (Vitest)
description: Complex DataTable
---

## Generated output

```markdown
### ✅ Configure feature flags

- **Given** the following feature flags are set
    **Feature flags**
    | service | flag | enabled |
    | --- | --- | --- |
    | web | new_checkout_ui | true |
    | api | strict_rate_limiting | false |
- **When** the system starts
- **Then** the flag "new_checkout_ui" should be enabled for "web"
- **And** the flag "strict_rate_limiting" should be disabled for "api"
```

## Vitest code

```typescript
it("Configure feature flags", ({ task }) => {
  story.init(task);
  story.given("the following feature flags are set");
  story.table({
    label: "Feature flags",
    columns: ["service", "flag", "enabled"],
    rows: [
      ["web", "new_checkout_ui", "true"],
      ["api", "strict_rate_limiting", "false"],
    ],
  });
  story.when("the system starts");
  story.then('the flag "new_checkout_ui" should be enabled for "web"');
  story.then('the flag "strict_rate_limiting" should be disabled for "api"');
});
```

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
story("Configure feature flags", (s: StepsApi) => {
  s.given("the following feature flags are set");
  s.doc.table("Feature flags", ["service", "flag", "enabled"], [
    ["web", "new_checkout_ui", "true"],
    ["api", "strict_rate_limiting", "false"],
  ]);
  s.when("the system starts");
  s.then('the flag "new_checkout_ui" should be enabled for "web"');
  s.then('the flag "strict_rate_limiting" should be disabled for "api"');
});
```

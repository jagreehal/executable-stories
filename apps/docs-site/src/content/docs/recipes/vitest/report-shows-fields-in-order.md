---
title: Report shows fields in order (Vitest)
description: And in middle of Then
---

## Generated output

```markdown
### ✅ Report shows fields in order

- **Given** a report exists for account "A1"
- **When** the user downloads the report
- **Then** the report header should be "Account Report"
- **And** the first column should be "Date"
- **And** the second column should be "Amount"
```

## Vitest code

```typescript
story("Report shows fields in order", (s: StepsApi) => {
  s.given('a report exists for account "A1"');
  s.when("the user downloads the report");
  s.then('the report header should be "Account Report"');
  s.and('the first column should be "Date"');
  s.and('the second column should be "Amount"');
});
```

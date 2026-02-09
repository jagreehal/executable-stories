---
title: Bulk user creation (Vitest)
description: DataTable for Given setup and expected result
---

## Generated output

```markdown
### ✅ Bulk user creation

- **Given** the following users exist
  **Users**
  | email             | role  | status |
  | ----------------- | ----- | ------ |
  | alice@example.com | admin | active |
  | bob@example.com   | user  | active |
  | eve@example.com   | user  | locked |
- **When** the admin opens the user list
- **Then** the user list should include
  **Expected**
  | email             | role  | status |
  | ----------------- | ----- | ------ |
  | alice@example.com | admin | active |
  | bob@example.com   | user  | active |
  | eve@example.com   | user  | locked |
```

## Vitest code

```typescript
import { story } from 'executable-stories-vitest';
import { describe, it } from 'vitest';

describe('Users', () => {
  it('Bulk user creation', ({ task }) => {
    story.init(task);
    story.given('the following users exist');
    story.table({
      label: 'Users',
      columns: ['email', 'role', 'status'],
      rows: [
        ['alice@example.com', 'admin', 'active'],
        ['bob@example.com', 'user', 'active'],
        ['eve@example.com', 'user', 'locked'],
      ],
    });
    story.when('the admin opens the user list');
    story.then('the user list should include');
    story.table({
      label: 'Expected',
      columns: ['email', 'role', 'status'],
      rows: [
        ['alice@example.com', 'admin', 'active'],
        ['bob@example.com', 'user', 'active'],
        ['eve@example.com', 'user', 'locked'],
      ],
    });
  });
});
```

From `apps/vitest-example/src/replicate.story.test.ts`.

---
title: Bulk user creation (pytest)
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

## pytest code

```python
from executable_stories import story

def test_bulk_user_creation():
    story.init("Bulk user creation")
    story.given("the following users exist")
    story.table(
        label="Users",
        columns=["email", "role", "status"],
        rows=[
            ["alice@example.com", "admin", "active"],
            ["bob@example.com", "user", "active"],
            ["eve@example.com", "user", "locked"],
        ],
    )
    story.when("the admin opens the user list")
    story.then("the user list should include")
    story.table(
        label="Expected",
        columns=["email", "role", "status"],
        rows=[
            ["alice@example.com", "admin", "active"],
            ["bob@example.com", "user", "active"],
            ["eve@example.com", "user", "locked"],
        ],
    )
```

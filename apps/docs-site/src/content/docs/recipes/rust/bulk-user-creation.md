---
title: Bulk user creation (Rust)
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

## Rust code

```rust
use executable_stories::Story;

#[test]
fn test_bulk_user_creation() {
    let mut s = Story::new("Bulk user creation");
    s.given("the following users exist");
    s.table("Users",
        &["email", "role", "status"],
        &[
            &["alice@example.com", "admin", "active"],
            &["bob@example.com", "user", "active"],
            &["eve@example.com", "user", "locked"],
        ],
    );
    s.when("the admin opens the user list");
    s.then("the user list should include");
    s.table("Expected",
        &["email", "role", "status"],
        &[
            &["alice@example.com", "admin", "active"],
            &["bob@example.com", "user", "active"],
            &["eve@example.com", "user", "locked"],
        ],
    );
    s.pass();
}
```

---
title: Login blocked for suspended user (Rust)
description: Use of But for negative intent
---

## Generated output

```markdown
### ✅ Login blocked for suspended user

- **Given** the user account exists
- **And** the account is suspended
- **When** the user submits valid credentials
- **Then** the user should see an error message
- **But** the user should not be logged in
```

`but()` always renders as "But" (never auto-converted to "And").

## Rust code

```rust
use executable_stories::Story;

#[test]
fn test_login_blocked_suspended_user() {
    let mut s = Story::new("Login blocked for suspended user");
    s.given("the user account exists");
    s.given("the account is suspended");
    s.when("the user submits valid credentials");
    s.then("the user should see an error message");
    s.but("the user should not be logged in");
    s.pass();
}
```

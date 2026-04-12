---
title: Login works (Rust)
description: Story with tags
---

## Generated output

```markdown
### ✅ Login works
Tags: `smoke`, `auth`

- **Given** the user is on the login page
- **When** the user logs in with valid credentials
- **Then** the user should be logged in
```

## Rust code

```rust
use executable_stories::Story;

#[test]
fn test_login_works() {
    let mut s = Story::new("Login works").with_tags(&["smoke", "auth"]);
    s.given("the user is on the login page");
    s.when("the user logs in with valid credentials");
    s.then("the user should be logged in");
    s.pass();
}
```

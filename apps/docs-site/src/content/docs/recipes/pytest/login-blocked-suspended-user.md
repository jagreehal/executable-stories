---
title: Login blocked for suspended user (pytest)
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

## pytest code

```python
from executable_stories import story

def test_login_blocked_suspended_user():
    story.init("Login blocked for suspended user")
    story.given("the user account exists")
    story.given("the account is suspended")
    story.when("the user submits valid credentials")
    story.then("the user should see an error message")
    story.but("the user should not be logged in")
```

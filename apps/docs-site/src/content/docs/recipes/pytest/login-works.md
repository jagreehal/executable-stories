---
title: Login works (pytest)
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

## pytest code

```python
from executable_stories import story

def test_login_works():
    story.init("Login works", tags=["smoke", "auth"])
    story.given("the user is on the login page")
    story.when("the user logs in with valid credentials")
    story.then("the user should be logged in")
```

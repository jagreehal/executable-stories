---
title: User logs in successfully (Go)
description: Multiple Given, single When, single Then
---

## Generated output

This is what the reporter writes for this scenario:

```markdown
### ✅ User logs in successfully

- **Given** the user account exists
- **And** the user is on the login page
- **And** the account is active
- **When** the user submits valid credentials
- **Then** the user should see the dashboard
```

(First `given` renders as "Given"; subsequent ones in the same story render as "And".)

## Go code

```go
import (
    "testing"
    es "github.com/jagreehal/executable-stories/packages/executable-stories-go"
)

func TestUserLogsInSuccessfully(t *testing.T) {
    s := es.Init(t, "User logs in successfully")
    s.Given("the user account exists")
    s.Given("the user is on the login page")
    s.Given("the account is active")
    s.When("the user submits valid credentials")
    s.Then("the user should see the dashboard")
}
```

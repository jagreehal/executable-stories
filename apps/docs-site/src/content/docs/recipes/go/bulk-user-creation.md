---
title: Bulk user creation (Go)
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

## Go code

```go
import (
    "testing"
    es "github.com/jagreehal/executable-stories/packages/executable-stories-go"
)

func TestBulkUserCreation(t *testing.T) {
    s := es.Init(t, "Bulk user creation")
    s.Given("the following users exist")
    s.Table("Users",
        []string{"email", "role", "status"},
        [][]string{
            {"alice@example.com", "admin", "active"},
            {"bob@example.com", "user", "active"},
            {"eve@example.com", "user", "locked"},
        },
    )
    s.When("the admin opens the user list")
    s.Then("the user list should include")
    s.Table("Expected",
        []string{"email", "role", "status"},
        [][]string{
            {"alice@example.com", "admin", "active"},
            {"bob@example.com", "user", "active"},
            {"eve@example.com", "user", "locked"},
        },
    )
}
```

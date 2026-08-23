---
title: Bulk user creation (xUnit)
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

## C# code

```csharp
using ExecutableStories.Xunit;
using Xunit;

public class UsersTests : IDisposable
{
    [Fact]
    public void BulkUserCreation()
    {
        Story.Init("Bulk user creation");
        Story.Given("the following users exist");
        Story.Table("Users",
            new[] { "email", "role", "status" },
            new[]
            {
                new[] { "alice@example.com", "admin", "active" },
                new[] { "bob@example.com", "user", "active" },
                new[] { "eve@example.com", "user", "locked" },
            }
        );
        Story.When("the admin opens the user list");
        Story.Then("the user list should include");
        Story.Table("Expected",
            new[] { "email", "role", "status" },
            new[]
            {
                new[] { "alice@example.com", "admin", "active" },
                new[] { "bob@example.com", "user", "active" },
                new[] { "eve@example.com", "user", "locked" },
            }
        );
    }

}
```

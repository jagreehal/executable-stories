---
title: User logs in successfully (xUnit)
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

## C# code

```csharp
using ExecutableStories.Xunit;
using Xunit;

public class LoginTests : IDisposable
{
    [Fact]
    public void UserLogsInSuccessfully()
    {
        Story.Init("User logs in successfully");
        Story.Given("the user account exists");
        Story.Given("the user is on the login page");
        Story.Given("the account is active");
        Story.When("the user submits valid credentials");
        Story.Then("the user should see the dashboard");
    }

    public void Dispose() => Story.RecordAndClear();
}
```

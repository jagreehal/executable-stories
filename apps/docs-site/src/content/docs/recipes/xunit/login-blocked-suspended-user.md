---
title: Login blocked for suspended user (xUnit)
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

`But()` always renders as "But" (never auto-converted to "And").

## C# code

```csharp
using ExecutableStories.Xunit;
using Xunit;

public class LoginTests : IDisposable
{
    [Fact]
    public void LoginBlockedSuspendedUser()
    {
        Story.Init("Login blocked for suspended user");
        Story.Given("the user account exists");
        Story.Given("the account is suspended");
        Story.When("the user submits valid credentials");
        Story.Then("the user should see an error message");
        Story.But("the user should not be logged in");
    }

    public void Dispose() => Story.RecordAndClear();
}
```

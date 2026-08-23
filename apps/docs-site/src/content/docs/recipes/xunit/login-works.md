---
title: Login works (xUnit)
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

## C# code

```csharp
using ExecutableStories.Xunit;
using Xunit;

public class LoginTests : IDisposable
{
    [Fact]
    public void LoginWorks()
    {
        Story.Init("Login works", "smoke", "auth");
        Story.Given("the user is on the login page");
        Story.When("the user logs in with valid credentials");
        Story.Then("the user should be logged in");
    }

}
```

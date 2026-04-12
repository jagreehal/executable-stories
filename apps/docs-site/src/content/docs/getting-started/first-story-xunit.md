---
title: First Story (xUnit)
description: Write your first C# scenario with given/when/then steps and doc entries
---

## Minimal example

Create a test file such as `LoginTests.cs`:

```csharp
using ExecutableStories;
using Xunit;

public class LoginTests : IDisposable
{
    public void Dispose()
    {
        Story.RecordAndClear();
    }

    [Fact]
    public void UserLogsInSuccessfully()
    {
        Story.Init("user logs in successfully");

        Story.Given("the user is on the login page");
        var email = "user@example.com";
        var password = "secret";

        Story.When("the user submits valid credentials");
        var authenticated = email == "user@example.com" && password == "secret";

        Story.Then("the user should see the dashboard");
        Assert.True(authenticated);
    }
}
```

`Story.RecordAndClear()` in `Dispose()` flushes the scenario after each test. xUnit constructs a new class instance per test, so without this call data from one test carries over into the next.

## Richer example with doc entries

Use tags, tickets, and doc entries to add context to your scenarios:

```csharp
using ExecutableStories;
using System.Text.Json;
using Xunit;

public class PasswordPolicyTests : IDisposable
{
    public void Dispose()
    {
        Story.RecordAndClear();
    }

    [Fact]
    public void PasswordRulesAreEnforced()
    {
        Story.Init("password rules are enforced", "auth", "security");
        Story.Ticket("AUTH-42");

        Story.Given("the user is registering a new account");
        Story.Note("Password policy: min 12 chars, one uppercase, one digit, one symbol");

        Story.When("the user submits a password that is too short");
        var password = "short";
        var valid = password.Length >= 12;

        Story.Then("the registration should be rejected");
        Story.Json(
            "validation result",
            new { valid, reason = "too short" }
        );
        Story.Code(
            "password policy",
            "min_length: 12\nrequire_uppercase: true\nrequire_digit: true",
            "yaml"
        );
        Story.Table(
            "rule summary",
            new[] { "Rule", "Required", "Met" },
            new[]
            {
                new[] { "min length 12", "yes", "no" },
                new[] { "uppercase letter", "yes", "yes" },
                new[] { "digit", "yes", "no" },
            }
        );

        Assert.False(valid);
    }
}
```

## Available step methods

| Method | Renders as |
|--------|-----------|
| `Story.Given(label)` | Given / And |
| `Story.When(label)` | When / And |
| `Story.Then(label)` | Then / And |
| `Story.And(label)` | And |
| `Story.But(label)` | But |

All methods are static on the `Story` class.

## Run tests

```bash
dotnet test
```

## Generate a report

```bash
npx executable-stories-formatters format --input .executable-stories/raw-run.json --format html
```

## Next

[xUnit story & doc API](reference/xunit-story-api/) — full steps, docs, and adapter options.

[Other adapters](reference/other-adapters/) — the rest of the non-JS adapters.

---
title: Create order (xUnit)
description: Background and tags
---

## Generated output

```markdown
### ✅ Create order
Tags: `db`, `smoke`

- **Given** the database is seeded
- **And** the API is running
- **When** the client creates an order
- **Then** the response status should be 201
- **And** the order should exist in the database
```

## C# code

```csharp
using ExecutableStories.Xunit;
using Xunit;

public class OrdersTests : IDisposable
{
    [Fact]
    public void CreateOrder()
    {
        Story.Init("Create order", "db", "smoke");
        Story.Given("the database is seeded");
        Story.Given("the API is running");
        Story.When("the client creates an order");
        Story.Then("the response status should be 201");
        Story.Then("the order should exist in the database");
    }

}
```

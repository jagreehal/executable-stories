---
title: API accepts a JSON payload (xUnit)
description: DocString (JSON) with doc.json
---

## Generated output

````markdown
### ✅ API accepts a JSON payload

- **Given** the client has the following JSON payload
  **Payload**
  ```json
  {
    "email": "user@example.com",
    "password": "secret",
    "rememberMe": true
  }
  ```
- **When** the client sends the request
- **Then** the response status should be 200
- **And** the response body should include "token"
````

## C# code

```csharp
using ExecutableStories.Xunit;
using Xunit;

public class ApiTests : IDisposable
{
    [Fact]
    public void ApiAcceptsJsonPayload()
    {
        Story.Init("API accepts a JSON payload");
        Story.Given("the client has the following JSON payload");
        Story.Json("Payload", new
        {
            email = "user@example.com",
            password = "secret",
            rememberMe = true
        });
        Story.When("the client sends the request");
        Story.Then("the response status should be 200");
        Story.Then("the response body should include \"token\"");
    }

}
```

---
title: First Story (pytest)
description: Write your first pytest scenario with given, when, and then steps
---

## Minimal example

Create a test file such as `test_login.py`:

```python
from executable_stories import story

def test_user_logs_in_successfully():
    story.init("user logs in successfully")

    story.given("the user is on the login page")
    email = "user@example.com"
    password = "secret"

    story.when("the user submits valid credentials")
    result = email == "user@example.com" and password == "secret"

    story.then("the user should see the dashboard")
    assert result
```

## Richer example with doc entries

Add tags, a ticket reference, and structured documentation to a scenario:

```python
from executable_stories import story

def test_user_login_with_docs():
    story.init(
        "user logs in with valid credentials",
        tags=["auth", "smoke"],
        ticket="AUTH-42",
    )

    story.given("the user has a registered account")
    story.and_("the user is on the login page")

    credentials = {"email": "user@example.com", "password": "secret"}
    story.json("Credentials", credentials)
    story.code("Request body", '{"email":"user@example.com","password":"secret"}', lang="json")

    story.when("the user submits valid credentials")

    response = {"token": "abc123", "expiresIn": 3600}
    story.json("Response", response)

    story.then("the user should receive an auth token")
    story.and_("the token should expire in one hour")

    story.table(
        "Token fields",
        columns=["Field", "Type", "Description"],
        rows=[
            ["token", "string", "JWT bearer token"],
            ["expiresIn", "number", "Seconds until expiry"],
        ],
    )

    story.note("Token rotation is handled automatically on refresh.")

    assert response["token"] == "abc123"
```

Note that `and_` uses a trailing underscore because `and` is a reserved keyword in Python. The same applies to `assert_()`.

## Run tests

```bash
pytest
```

## Generate a report

```bash
npx executable-stories-formatters format --input .executable-stories/raw-run.json --format markdown
```

The Markdown report includes the scenario title, all Given/When/Then steps, and any doc entries attached to the scenario.

## Next

[pytest story & doc API](/reference/pytest-story-api/) — full reference for steps, docs, and options.

[Using the CLI](/reference/formatters-cli/) — all formatter output formats and flags.

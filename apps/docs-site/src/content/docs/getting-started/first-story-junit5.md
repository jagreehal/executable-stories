---
title: First Story (JUnit 5)
description: Write your first Kotlin scenario with given/when/then steps and doc entries
---

## Minimal example

Create a test file such as `src/test/kotlin/LoginTest.kt`:

```kotlin
import io.github.jagreehal.executablestories.Story
import org.junit.jupiter.api.Test

class LoginTest {

    @Test
    fun `user logs in successfully`() {
        Story.init("user logs in successfully")

        Story.given("the user is on the login page")
        val email = "user@example.com"
        val password = "secret"

        Story.`when`("the user submits valid credentials")
        val authenticated = email == "user@example.com" && password == "secret"

        Story.then("the user should see the dashboard")
        assert(authenticated)
    }
}
```

Note that `when` is a reserved keyword in Kotlin. Use backticks: `` Story.`when`("...") ``.

The `StoryTestExecutionListener` is registered automatically. No extra wiring is needed.

## Richer example with doc entries

Use tags, tickets, and doc entries to add context to your scenarios:

```kotlin
import io.github.jagreehal.executablestories.Story
import org.junit.jupiter.api.Test

class PasswordPolicyTest {

    @Test
    fun `password rules are enforced`() {
        Story.init("password rules are enforced", "auth", "security")
        Story.ticket("AUTH-42")

        Story.given("the user is registering a new account")
        Story.note("Password policy: min 12 chars, one uppercase, one digit, one symbol")

        Story.`when`("the user submits a password that is too short")
        val password = "short"
        val valid = password.length >= 12

        Story.then("the registration should be rejected")
        Story.json("validation result", mapOf("valid" to valid, "reason" to "too short"))
        Story.code(
            "password policy",
            "min_length: 12\nrequire_uppercase: true\nrequire_digit: true",
            "yaml"
        )
        Story.table(
            "rule summary",
            arrayOf("Rule", "Required", "Met"),
            arrayOf(
                arrayOf("min length 12", "yes", "no"),
                arrayOf("uppercase letter", "yes", "yes"),
                arrayOf("digit", "yes", "no")
            )
        )

        assert(!valid)
    }
}
```

## Available step methods

| Method | Renders as |
|--------|-----------|
| `Story.given(label)` | Given / And |
| `` Story.`when`(label) `` | When / And |
| `Story.then(label)` | Then / And |
| `Story.and(label)` | And |
| `Story.but(label)` | But |

All methods are static on the `Story` companion object.

## Run tests

```bash
./gradlew test
```

## Generate a report

```bash
npx executable-stories-formatters format --input .executable-stories/raw-run.json --format html
```

## Next

[JUnit 5 story & doc API](reference/junit5-story-api/) — full steps, docs, and adapter options.

[Other adapters](reference/other-adapters/) — the rest of the non-JS adapters.

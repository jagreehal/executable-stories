---
title: First Story (Go)
description: Write your first Go scenario with given, when, and then steps
---

## Minimal example

Create a test file such as `login_test.go`:

```go
package login_test

import (
	"os"
	"testing"

	es "github.com/jagreehal/executable-stories/packages/executable-stories-go"
)

func TestMain(m *testing.M) {
	os.Exit(es.RunAndReport(m))
}

func TestUserLogsInSuccessfully(t *testing.T) {
	s := es.Init(t, "user logs in successfully")

	s.Given("the user is on the login page")
	email := "user@example.com"
	password := "secret"

	s.When("the user submits valid credentials")
	result := email == "user@example.com" && password == "secret"

	s.Then("the user should see the dashboard")
	if !result {
		t.Fatal("expected login to succeed")
	}
}
```

## Richer example with doc entries

Add metadata, tags, and structured documentation to a scenario:

```go
func TestUserLoginWithDocs(t *testing.T) {
	s := es.Init(t, "user logs in with valid credentials",
		es.WithTags("auth", "smoke"),
		es.WithTicket("AUTH-42"),
	)

	s.Given("the user has a registered account")
	s.And("the user is on the login page")

	credentials := map[string]string{
		"email":    "user@example.com",
		"password": "secret",
	}
	s.JSON("Credentials", credentials)
	s.Code("Request body", `{"email":"user@example.com","password":"secret"}`, "json")

	s.When("the user submits valid credentials")

	response := map[string]any{"token": "abc123", "expiresIn": 3600}
	s.JSON("Response", response)

	s.Then("the user should receive an auth token")
	s.And("the token should expire in one hour")

	s.Table("Token fields",
		[]string{"Field", "Type", "Description"},
		[][]string{
			{"token", "string", "JWT bearer token"},
			{"expiresIn", "number", "Seconds until expiry"},
		},
	)

	s.Note("Token rotation is handled automatically on refresh.")
}
```

## Run tests

```bash
go test ./...
```

## Generate a report

```bash
npx executable-stories-formatters format --input .executable-stories/raw-run.json --format markdown
```

The Markdown report includes the scenario title, all Given/When/Then steps, and any doc entries attached to the scenario.

## Next

[Go story & doc API](reference/go-story-api/) — full reference for steps, docs, and options.

[Using the CLI](reference/formatters-cli/) — all formatter output formats and flags.

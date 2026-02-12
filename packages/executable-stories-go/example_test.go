package es_test

import (
	"testing"

	es "github.com/anthropics/executable-stories/packages/executable-stories-go"
)

func TestAddition(t *testing.T) {
	s := es.Init(t, "adds two numbers", es.WithTags("math"))
	s.Given("two numbers 5 and 3")
	s.When("I add them together")
	s.Then("the result is 8")
	if 5+3 != 8 {
		t.Fatal("wrong")
	}
}

func TestSubtraction(t *testing.T) {
	s := es.Init(t, "subtracts two numbers",
		es.WithTags("math"),
		es.WithTicket("MATH-42"),
	)
	s.Given("two numbers 10 and 4").
		When("I subtract the second from the first").
		Then("the result is 6").
		Note("basic arithmetic check")
	if 10-4 != 6 {
		t.Fatal("wrong")
	}
}

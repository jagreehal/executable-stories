package example

import (
	"testing"

	es "github.com/anthropics/executable-stories/packages/executable-stories-go"
)

func TestExplicitAndAndButSteps(t *testing.T) {
	s := es.Init(t, "Order with explicit And and But steps")
	s.Given("the user is logged in").
		And("the user has a valid payment method").
		And("the user has items in cart").
		When("the user clicks checkout").
		And("confirms the order").
		Then("the order should be created").
		And("the payment should be processed").
		But("the inventory is not yet decremented")
}

func TestButForNegativeAssertion(t *testing.T) {
	s := es.Init(t, "Login blocked for suspended user")
	s.Given("the user account exists")
	s.Given("the account is suspended")
	s.When("the user submits valid credentials")
	s.Then("the user should see an error message")
	s.But("the user should not be logged in")
	s.But("the session should not be created")
}

func TestMixedGivenWhenThenWithAnd(t *testing.T) {
	s := es.Init(t, "Sum calculation using and")
	s.Given("numbers 1, 2, 3, 4, 5")
	s.And("an accumulator initialized to zero")
	total := 1 + 2 + 3 + 4 + 5
	s.When("the sum is calculated")
	s.Then("the result is 15")
	s.And("the result is positive")
	if total != 15 || total <= 0 {
		t.Fatalf("expected total 15 positive, got %d", total)
	}
}

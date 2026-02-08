package example

import (
	"testing"

	es "github.com/anthropics/executable-stories/packages/executable-stories-go"
)

func TestMultipleGivenAutoAnd(t *testing.T) {
	s := es.Init(t, "User logs in successfully")
	s.Given("the user account exists")
	s.Given("the user is on the login page")
	s.Given("the account is active")
	s.When("the user submits valid credentials")
	s.Then("the user should see the dashboard")
}

func TestMultipleWhenAutoAnd(t *testing.T) {
	s := es.Init(t, "User updates profile settings")
	s.Given("the user is logged in")
	s.When("the user navigates to settings")
	s.When("the user changes their display name")
	s.Then("the changes should be saved")
}

func TestMultipleThenAutoAnd(t *testing.T) {
	s := es.Init(t, "Successful order confirmation")
	s.Given("the user has items in cart")
	s.When("the user completes checkout")
	s.Then("the order should be created")
	s.Then("a confirmation email should be sent")
	s.Then("the inventory should be updated")
}

func TestButKeywordForContrast(t *testing.T) {
	s := es.Init(t, "Login blocked for suspended user")
	s.Given("the user account exists")
	s.Given("the account is suspended")
	s.When("the user submits valid credentials")
	s.Then("the user should see an error message")
	s.But("the user should not be logged in")
	s.But("the session should not be created")
}

func TestExplicitAndSteps(t *testing.T) {
	s := es.Init(t, "Order with explicit And steps")
	s.Given("the user is logged in").
		And("the user has a valid payment method").
		And("the user has items in cart").
		When("the user clicks checkout").
		And("confirms the order").
		Then("the order should be created").
		And("the payment should be processed")
}

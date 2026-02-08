package example

import (
	"testing"

	es "github.com/anthropics/executable-stories/packages/executable-stories-go"
)

func TestCalculatorAddsTwoNumbers(t *testing.T) {
	s := es.Init(t, "Calculator adds two numbers")
	s.Given("two numbers 5 and 3")
	a, b := 5, 3
	s.When("the numbers are added")
	result := Add(a, b)
	s.Then("the result is 8")
	if result != 8 {
		t.Fatalf("expected 8, got %d", result)
	}
}

func TestCalculatorSubtractsTwoNumbers(t *testing.T) {
	s := es.Init(t, "Calculator subtracts two numbers")
	s.Given("two numbers 10 and 4")
	a, b := 10, 4
	s.When("the second is subtracted from the first")
	result := Subtract(a, b)
	s.Then("the result is 6")
	if result != 6 {
		t.Fatalf("expected 6, got %d", result)
	}
}

func TestCalculatorMultipliesTwoNumbers(t *testing.T) {
	s := es.Init(t, "Calculator multiplies two numbers")
	s.Given("two numbers 7 and 6")
	a, b := 7, 6
	s.Note("This is a note")
	s.When("the numbers are multiplied")
	result := Multiply(a, b)
	s.Then("the result is 42")
	if result != 42 {
		t.Fatalf("expected 42, got %d", result)
	}
}

func TestCalculatorDividesTwoNumbers(t *testing.T) {
	s := es.Init(t, "Calculator divides two numbers")
	s.Given("two numbers 20 and 4")
	a, b := 20, 4
	s.When("the first is divided by the second")
	result := Divide(a, b)
	s.Then("the result is 5")
	if result != 5 {
		t.Fatalf("expected 5, got %d", result)
	}
}

func TestCalculatorThrowsOnDivisionByZero(t *testing.T) {
	s := es.Init(t, "Calculator throws error on division by zero")
	s.Note("Division by zero should throw an error")
	s.Given("a number 10 and zero")
	a, b := 10, 0
	s.When("division is attempted")
	var panicked bool
	func() {
		defer func() {
			if recover() != nil {
				panicked = true
			}
		}()
		_ = Divide(a, b)
	}()
	if !panicked {
		t.Fatal("expected Divide(10, 0) to panic")
	}
	s.Then("an error is thrown")
}

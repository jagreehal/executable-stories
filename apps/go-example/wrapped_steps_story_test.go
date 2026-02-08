package example

import (
	"testing"

	es "github.com/anthropics/executable-stories/packages/executable-stories-go"
)

func TestWrappedStepsAddition(t *testing.T) {
	s := es.Init(t, "Calculator adds two numbers using Fn and Expect")

	var a, b int
	s.Fn("Given", "two numbers 5 and 3", func() {
		a, b = 5, 3
	})

	var result int
	s.Fn("When", "the numbers are added", func() {
		result = Add(a, b)
	})

	s.Expect("the result is 8", func() {
		if result != 8 {
			t.Fatalf("expected 8, got %d", result)
		}
	})
}

func TestWrappedStepsSubtraction(t *testing.T) {
	s := es.Init(t, "Calculator subtracts using Fn with timing")

	var a, b int
	s.Fn("Given", "two numbers 10 and 4", func() {
		a, b = 10, 4
	})

	var result int
	s.Fn("When", "the second is subtracted from the first", func() {
		result = Subtract(a, b)
	})

	s.Expect("the result is 6", func() {
		if result != 6 {
			t.Fatalf("expected 6, got %d", result)
		}
	})
}

func TestWrappedStepsDivisionByZero(t *testing.T) {
	s := es.Init(t, "Calculator division by zero captured in Fn")

	s.Fn("Given", "a number 10 and zero", func() {})

	s.Expect("division by zero panics", func() {
		defer func() {
			if r := recover(); r == nil {
				t.Fatal("expected Divide(10, 0) to panic")
			}
		}()
		Divide(10, 0)
	})
}

func TestWrappedStepsMixed(t *testing.T) {
	s := es.Init(t, "Mixed markers and wrapped steps")

	s.Given("the calculator is ready")

	var result int
	s.Fn("When", "we multiply 7 by 6", func() {
		result = Multiply(7, 6)
	})

	s.Expect("the result is 42", func() {
		if result != 42 {
			t.Fatalf("expected 42, got %d", result)
		}
	})

	s.And("the result is a positive number")
	if result <= 0 {
		t.Fatal("expected positive number")
	}
}

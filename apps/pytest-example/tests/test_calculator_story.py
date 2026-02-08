"""Story-based tests for the Calculator, mirroring the Playwright/Vitest examples."""

import pytest

from executable_stories import story
from example.calculator import add, subtract, multiply, divide


def test_calculator_adds_two_numbers():
    story.init("Calculator adds two numbers")
    story.given("two numbers 5 and 3")
    a, b = 5, 3
    story.when("the numbers are added")
    result = add(a, b)
    story.then("the result is 8")
    assert result == 8


def test_calculator_subtracts_two_numbers():
    story.init("Calculator subtracts two numbers")
    story.given("two numbers 10 and 4")
    a, b = 10, 4
    story.when("the second is subtracted from the first")
    result = subtract(a, b)
    story.then("the result is 6")
    assert result == 6


def test_calculator_multiplies_two_numbers():
    story.init("Calculator multiplies two numbers")
    story.given("two numbers 7 and 6")
    a, b = 7, 6
    story.note("This is a note")
    story.when("the numbers are multiplied")
    result = multiply(a, b)
    story.then("the result is 42")
    assert result == 42


def test_calculator_divides_two_numbers():
    story.init("Calculator divides two numbers")
    story.given("two numbers 20 and 4")
    a, b = 20, 4
    story.when("the first is divided by the second")
    result = divide(a, b)
    story.then("the result is 5")
    assert result == 5


def test_calculator_throws_on_division_by_zero():
    story.init("Calculator throws error on division by zero")
    story.note("Division by zero should throw an error")
    story.given("a number 10 and zero")
    a, b = 10, 0
    story.when("division is attempted")
    with pytest.raises(ValueError, match="Cannot divide by zero"):
        divide(a, b)
    story.then("an error is thrown")

"""Story-based tests demonstrating the fn() and expect() wrapped step API."""

import pytest

from executable_stories import story
from example.calculator import add, subtract, multiply, divide


def test_wrapped_steps_addition():
    story.init("Calculator adds two numbers using fn and expect")

    a = story.fn("Given", "number a is 5", lambda: 5)
    b = story.fn("Given", "number b is 3", lambda: 3)

    result = story.fn("When", "the numbers are added", lambda: add(a, b))

    story.expect("the result is 8", lambda: _assert_eq(result, 8))


def test_wrapped_steps_subtraction():
    story.init("Calculator subtracts using fn with timing")

    nums = story.fn("Given", "two numbers 10 and 4", lambda: {"a": 10, "b": 4})

    result = story.fn(
        "When",
        "the second is subtracted from the first",
        lambda: subtract(nums["a"], nums["b"]),
    )

    story.expect("the result is 6", lambda: _assert_eq(result, 6))


def test_wrapped_steps_division_by_zero():
    story.init("Calculator division by zero captured in fn")

    story.fn("Given", "a number 10 and zero", lambda: None)

    def check_raises():
        with pytest.raises(ValueError, match="Cannot divide by zero"):
            divide(10, 0)

    story.expect("division by zero throws an error", check_raises)


def test_wrapped_steps_mixed():
    story.init("Mixed markers and wrapped steps")

    story.given("the calculator is ready")

    result = story.fn("When", "we multiply 7 by 6", lambda: multiply(7, 6))

    story.expect("the result is 42", lambda: _assert_eq(result, 42))

    story.and_("the result is a positive number")
    assert result > 0


def _assert_eq(actual, expected):
    assert actual == expected, f"expected {expected}, got {actual}"

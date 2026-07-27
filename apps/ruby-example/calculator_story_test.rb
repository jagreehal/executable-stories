# frozen_string_literal: true

require "minitest/autorun"
require "executable_stories/minitest"
require_relative "calculator"

# Minitest has no per-test hook, so each story must call `story.record(...)` to
# appear in the generated raw-run.json. Recording at the end of the test (after
# the assertions pass) mirrors scripts/verify-ruby.sh.
class CalculatorStoryTest < Minitest::Test
  def test_adds_two_numbers
    story = ExecutableStories.init("Calculator adds two numbers")
    story.given("two numbers 5 and 3")
    a = 5
    b = 3
    story.when("the numbers are added")
    result = Calculator.add(a, b)
    story.state({ "a" => a, "b" => b, "result" => result }, label: "Calculator")
    story.then("the result is 8")
    assert_equal 8, result
    story.record(status: "pass", source_file: __FILE__)
  end

  def test_subtracts_two_numbers
    story = ExecutableStories.init("Calculator subtracts two numbers")
    story.given("two numbers 10 and 4")
    story.when("the second is subtracted from the first")
    result = Calculator.subtract(10, 4)
    story.then("the result is 6")
    assert_equal 6, result
    story.record(status: "pass", source_file: __FILE__)
  end

  def test_multiplies_two_numbers
    story = ExecutableStories.init("Calculator multiplies two numbers")
    story.given("two numbers 7 and 6")
    story.note("Multiplication is repeated addition")
    story.when("the numbers are multiplied")
    result = Calculator.multiply(7, 6)
    story.then("the result is 42")
    assert_equal 42, result
    story.record(status: "pass", source_file: __FILE__)
  end

  def test_divides_two_numbers
    story = ExecutableStories.init("Calculator divides two numbers")
    story.given("two numbers 20 and 4")
    story.when("the first is divided by the second")
    result = Calculator.divide(20, 4)
    story.then("the result is 5")
    assert_equal 5, result
    story.record(status: "pass", source_file: __FILE__)
  end

  def test_raises_on_division_by_zero
    story = ExecutableStories.init("Calculator raises on division by zero")
    story.note("Division by zero should raise an error")
    story.given("a number 10 and zero")
    story.when("division is attempted")
    story.then("an error is raised")
    assert_raises(ArgumentError) { Calculator.divide(10, 0) }
    story.record(status: "pass", source_file: __FILE__)
  end
end

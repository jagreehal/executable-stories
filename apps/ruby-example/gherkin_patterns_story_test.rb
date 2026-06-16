# frozen_string_literal: true

require "minitest/autorun"
require "executable_stories/minitest"
require_relative "calculator"

# Demonstrates Gherkin-style patterns: auto-And on repeated primary keywords,
# explicit But for contrast, and notes.
class GherkinPatternsStoryTest < Minitest::Test
  def test_auto_and_conversion
    story = ExecutableStories.init("Calculator chains multiple givens")
    story.given("a calculator")
    story.given("the value 10")   # -> And (auto-converted)
    story.given("the value 4")    # -> And (auto-converted)
    story.when("they are added")
    result = Calculator.add(10, 4)
    story.then("the result is 14")
    assert_equal 14, result
    story.record(status: "pass", source_file: __FILE__)
  end

  def test_but_for_contrast
    story = ExecutableStories.init("Calculator division guards against zero")
    story.given("a numerator 10")
    story.when("the denominator is non-zero")
    story.then("the division succeeds")
    assert_equal 5, Calculator.divide(10, 2)
    story.but("a zero denominator raises instead")
    assert_raises(ArgumentError) { Calculator.divide(10, 0) }
    story.record(status: "pass", source_file: __FILE__)
  end
end

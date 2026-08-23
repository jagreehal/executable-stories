# frozen_string_literal: true

require "minitest/autorun"
require "executable_stories/minitest"
require_relative "calculator"

# Demonstrates the AAA aliases (arrange/act/assert_that) and explicit and/but.
class StepAliasesStoryTest < Minitest::Test
  def test_aaa_aliases
    story = ExecutableStories.init("Calculator add via AAA aliases")
    story.arrange("two numbers 5 and 3")     # -> Given
    story.act("the numbers are added")        # -> When
    result = Calculator.add(5, 3)
    story.assert_that("the result is 8")      # -> Then
    assert_equal 8, result
  end

  def test_and_but_keywords
    story = ExecutableStories.init("Calculator add with and/but")
    story.given("two numbers 5 and 3")
    story.and("both are positive")            # -> And (explicit)
    story.when("the numbers are added")
    result = Calculator.add(5, 3)
    story.then("the result is 8")
    story.but("the result is not negative")   # -> But (explicit)
    assert_equal 8, result
    refute result.negative?
  end
end

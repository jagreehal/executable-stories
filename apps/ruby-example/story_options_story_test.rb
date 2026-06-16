# frozen_string_literal: true

require "minitest/autorun"
require "executable_stories/minitest"
require_relative "calculator"

# Demonstrates story options (tags, ticket, covers, meta) and rich doc entries.
class StoryOptionsStoryTest < Minitest::Test
  def test_story_with_options
    story = ExecutableStories.init(
      "Calculator add with metadata",
      tags: ["smoke", "math"],
      ticket: "JIRA-123",
      covers: ["calculator.rb"],
      meta: { "owner" => "platform-team" },
    )
    story.given("two numbers 2 and 2")
    story.kv("Operation", "add")
    story.when("the numbers are added")
    result = Calculator.add(2, 2)
    story.then("the result is 4")
    story.json("Result", { value: result })
    assert_equal 4, result
    story.record(status: "pass", source_file: __FILE__)
  end

  def test_story_with_object_ticket
    story = ExecutableStories.init(
      "Calculator subtract with linked ticket",
      ticket: [{ id: "JIRA-200", url: "https://jira.example.com/JIRA-200" }],
    )
    story.given("two numbers 9 and 5")
    story.when("the second is subtracted")
    result = Calculator.subtract(9, 5)
    story.then("the result is 4")
    assert_equal 4, result
    story.record(status: "pass", source_file: __FILE__)
  end
end

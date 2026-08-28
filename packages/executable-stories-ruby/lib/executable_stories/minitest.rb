# frozen_string_literal: true

require "minitest"
require_relative "story"
require_relative "types"
require_relative "collector"
require_relative "output"

module ExecutableStories
  # Records the story a test created, using the outcome Minitest already knows.
  #
  # `after_teardown` runs once the test body and `teardown` are done, by which
  # point `failures` holds whatever went wrong. An explicit `story.record(...)`
  # still wins: recording is idempotent, and the first call is the one that
  # counts.
  module MinitestHook
    # The story reads Minitest's assertion counter off this instance, so it has
    # to be reachable from the step methods while the test body runs.
    def before_setup
      Thread.current[:executable_stories_minitest_test] = self
      super
    end

    def after_teardown
      super
    ensure
      ExecutableStories::MinitestHook.record_current(self)
      Thread.current[:executable_stories_minitest_test] = nil
    end

    def self.record_current(test)
      story = Thread.current[:executable_stories_current]
      return if story.nil?

      # The last marker's assertions land after every step call, so its count is
      # only final now. Done before the recorded? guard: an explicitly recorded
      # story still needs its final step closed off.
      story.send(:flush_pending_assertions)
      return if story.recorded?

      failure = test.failures.first
      status =
        if failure.nil? then "pass"
        elsif failure.is_a?(Minitest::Skip) then "skip"
        else "fail"
        end

      file, line = source_location(test)
      story.record(
        status: status,
        suite_path: [test.class.name],
        source_file: file,
        source_line: line,
        error: error_for(failure, status)
      )
    end

    def self.error_for(failure, status)
      return nil unless status == "fail" && failure

      ExecutableStories::RawError.new(
        message: failure.message,
        stack: Array(failure.backtrace).join("\n")
      )
    end

    def self.source_location(test)
      test.method(test.name).source_location
    rescue NameError
      nil
    end
  end

  module MinitestPlugin
    module_function

    def install!
      return if @installed

      Minitest::Test.prepend(MinitestHook)
      Minitest.after_run do
        write_results
      end

      @installed = true
    end

    def write_results(output_path: nil)
      Output.write_results(cases: Collector.all, output_path: output_path)
    end
  end
end

ExecutableStories::MinitestPlugin.install!

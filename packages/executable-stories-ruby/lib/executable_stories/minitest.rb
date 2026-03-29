# frozen_string_literal: true

require "minitest"
require_relative "story"
require_relative "collector"
require_relative "output"

module ExecutableStories
  module MinitestPlugin
    module_function

    def install!
      return if @installed

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

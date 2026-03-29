# frozen_string_literal: true

require "rspec/core"

require_relative "story"
require_relative "collector"
require_relative "output"

module ExecutableStories
  module RSpecStoryDSL
    def story(scenario, tags: nil, ticket: nil, meta: nil, trace_url_template: nil, **example_metadata, &block)
      it(scenario, **example_metadata.merge(executable_stories: {
           scenario: scenario,
           tags: tags,
           ticket: ticket,
           meta: meta,
           trace_url_template: trace_url_template
         })) do
        story = ExecutableStories.init(
          scenario,
          tags: tags,
          ticket: ticket,
          meta: meta,
          trace_url_template: trace_url_template
        )

        story.meta ||= {}
        story.meta["rspec"] = {
          "fullDescription" => RSpec.current_example.full_description,
          "description" => RSpec.current_example.description,
          "filePath" => RSpec.current_example.metadata[:file_path],
          "lineNumber" => RSpec.current_example.metadata[:line_number],
          "scopedId" => RSpec.current_example.metadata[:scoped_id]
        }

        RSpec.current_example.metadata[:executable_stories_story] = story
        instance_exec(story, &block) if block
      end
    end
  end

  class RSpecFormatter
    RSpec::Core::Formatters.register self, :start, :example_passed, :example_failed, :example_pending, :dump_summary

    def initialize(output)
      @output = output
      @started = false
    end

    def start(_notification)
      return if @started

      Collector.reset
      @started = true
    end

    def example_passed(notification)
      record(notification.example, status: "pass")
    end

    def example_failed(notification)
      record(notification.example, status: "fail")
    end

    def example_pending(notification)
      example = notification.example
      status = example.metadata[:skip] ? "skip" : "pending"
      record(example, status: status)
    end

    def dump_summary(_summary)
      Output.write_results(cases: Collector.all)
    end

    private

    def record(example, status:)
      story = build_story(example)
      story.record(
        status: status,
        title: example.description,
        suite_path: suite_path_for(example),
        source_file: example.metadata[:file_path],
        source_line: example.metadata[:line_number],
        error: error_for(example, status)
      )
    end

    def build_story(example)
      runtime_story = example.metadata[:executable_stories_story]
      return runtime_story if runtime_story

      definition = example.metadata[:executable_stories] || {}
      scenario = definition[:scenario] || example.description
      tags = normalize_tags(definition[:tags], example.metadata)

      story = ExecutableStories.init(
        scenario,
        tags: tags.empty? ? nil : tags,
        ticket: definition[:ticket],
        meta: definition[:meta],
        trace_url_template: definition[:trace_url_template]
      )

      story.meta ||= {}
      story.meta["rspec"] = {
        "fullDescription" => example.full_description,
        "description" => example.description,
        "filePath" => example.metadata[:file_path],
        "lineNumber" => example.metadata[:line_number],
        "scopedId" => example.metadata[:scoped_id]
      }
      story
    end

    def normalize_tags(explicit_tags, metadata)
      tags = Array(explicit_tags).compact.map(&:to_s)
      metadata.each do |key, value|
        next unless value == true
        next if reserved_metadata_key?(key)

        tags << key.to_s
      end
      tags.uniq
    end

    def reserved_metadata_key?(key)
      %i[
        executable_stories
        executable_stories_story
        description
        description_args
        block
        full_description
        file_path
        line_number
        location
        absolute_file_path
        rerun_file_path
        rerun_line_numbers
        scoped_id
        execution_result
        aggregate_failures
        skip
      ].include?(key)
    end

    def suite_path_for(example)
      example.example_group.parent_groups
             .reverse
             .reject { |group| group == RSpec::Core::ExampleGroup }
             .map(&:description)
             .reject { |description| description.nil? || description.empty? }
    end

    def error_for(example, status)
      return nil unless status == "fail"

      exception = example.exception
      return nil unless exception

      ExecutableStories::RawError.new(
        message: exception.message,
        stack: Array(exception.backtrace).join("\n")
      )
    end
  end

  module RSpecPlugin
    module_function

    def install!
      return if @installed

      RSpec.configure do |config|
        config.extend ExecutableStories::RSpecStoryDSL
        config.add_formatter ExecutableStories::RSpecFormatter
      end

      @installed = true
    end
  end
end

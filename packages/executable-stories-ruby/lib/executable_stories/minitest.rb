# frozen_string_literal: true

require "json"
require "fileutils"
require "minitest"
require_relative "story"
require_relative "collector"
require_relative "json_writer"
require_relative "types"

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
      cases = Collector.all
      return if cases.empty?

      output_path ||= ENV.fetch("EXECUTABLE_STORIES_OUTPUT", ".executable-stories/raw-run.json")

      started = cases.map { |c| c.start_time }.compact.min
      finished = cases.map { |c| c.end_time }.compact.max

      run = RawRun.new(
        schema_version: 1,
        test_cases: cases,
        project_root: Dir.pwd,
        started_at_ms: started,
        finished_at_ms: finished,
        package_version: nil,
        git_sha: nil,
        ci: detect_ci
      )

      JsonWriter.write_raw_run(run, output_path)
    end

    def detect_ci
      if ENV["GITHUB_ACTIONS"] == "true"
        url = nil
        server = ENV["GITHUB_SERVER_URL"]
        repo = ENV["GITHUB_REPOSITORY"]
        run_id = ENV["GITHUB_RUN_ID"]
        url = "#{server}/#{repo}/actions/runs/#{run_id}" if server && repo && run_id
        RawCIInfo.new(name: "github", url: url, build_number: ENV["GITHUB_RUN_NUMBER"])
      elsif ENV["CIRCLECI"] == "true"
        RawCIInfo.new(name: "circleci", url: ENV["CIRCLE_BUILD_URL"], build_number: ENV["CIRCLE_BUILD_NUM"])
      elsif !ENV["JENKINS_URL"].nil?
        RawCIInfo.new(name: "jenkins", url: ENV["BUILD_URL"], build_number: ENV["BUILD_NUMBER"])
      elsif ENV["TRAVIS"] == "true"
        RawCIInfo.new(name: "travis", url: ENV["TRAVIS_BUILD_WEB_URL"], build_number: ENV["TRAVIS_BUILD_NUMBER"])
      elsif ENV["GITLAB_CI"] == "true"
        RawCIInfo.new(name: "gitlab", url: ENV["CI_PIPELINE_URL"], build_number: ENV["CI_PIPELINE_IID"])
      elsif ENV["CI"] == "true"
        RawCIInfo.new(name: "ci")
      else
        nil
      end
    end
  end
end

ExecutableStories::MinitestPlugin.install!

# frozen_string_literal: true

require_relative "types"
require_relative "json_writer"

module ExecutableStories
  module Output
    module_function

    def write_results(cases:, output_path: nil)
      return if cases.empty?

      output_path ||= ENV.fetch("EXECUTABLE_STORIES_OUTPUT", ".executable-stories/raw-run.json")

      started = cases.map(&:start_time).compact.min
      finished = cases.map(&:end_time).compact.max

      run = RawRun.new(
        schema_version: 1,
        test_cases: cases,
        features: Collector.all_features,
        project_root: Dir.pwd,
        started_at_ms: started,
        finished_at_ms: finished,
        package_version: nil,
        git_sha: nil,
        ci: detect_ci
      )

      JsonWriter.write_raw_run(run, output_path)
      print_next_step(output_path)
    end

    # Tell the user how to turn the run JSON into a report.
    #
    # The JS adapters render reports in-process, so their users never need to
    # know the CLI exists. Ruby hands off to the CLI instead, so without this
    # the run ends with a file and no indication of what to do with it. stderr
    # keeps piped output clean; EXECUTABLE_STORIES_QUIET silences it in CI.
    def print_next_step(output_path)
      return if ENV["EXECUTABLE_STORIES_QUIET"]

      warn ""
      warn "executable-stories: wrote #{output_path}"
      warn "  next: executable-stories format #{output_path} --format html"
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
      end
    end
  end
end

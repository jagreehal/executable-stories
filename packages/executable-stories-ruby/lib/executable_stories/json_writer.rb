# frozen_string_literal: true

require "json"
require "fileutils"
require_relative "types"

module ExecutableStories
  module JsonWriter
    module_function

    def write_raw_run(run, output_path)
      dir = File.dirname(output_path)
      FileUtils.mkdir_p(dir) unless Dir.exist?(dir)

      json = JSON.pretty_generate(ExecutableStories.run_to_h(run)) + "\n"
      File.write(output_path, json)
    end
  end
end
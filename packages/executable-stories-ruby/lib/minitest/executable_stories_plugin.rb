# frozen_string_literal: true

# Minitest plugin hook, discovered by Minitest scanning $LOAD_PATH for
# `minitest/*_plugin.rb`.
#
# Its only job is to record how the run was narrowed. Minitest parses `-n` out
# of ARGV and leaves ARGV empty, so by the time results are written there is
# nothing left to read; the options hash handed to a plugin is the one place the
# filter survives. It arrives here whether the run came from `ruby test.rb -n`,
# `rake test TESTOPTS=`, or a runner that calls Minitest.run directly.
module Minitest
  def self.plugin_executable_stories_init(options)
    ExecutableStories::Output.record_run_options(options)
  end
end

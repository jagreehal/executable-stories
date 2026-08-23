# frozen_string_literal: true

require_relative "types"

module ExecutableStories
  @mutex = Mutex.new
  @collected = []
  @features = {}
  @order_seq = 0

  module Collector
    module_function

    def record(test_case)
      @mutex ||= Mutex.new
      @collected ||= []
      @mutex.synchronize do
        @collected << test_case
      end
    end

    def all
      @mutex ||= Mutex.new
      @collected ||= []
      @mutex.synchronize do
        @collected.dup
      end
    end

    # Store a declaration, replacing an earlier one for the same file so a
    # re-declaration reads the way it does in source order.
    def record_feature(feature)
      @mutex ||= Mutex.new
      @features ||= {}
      @mutex.synchronize do
        @features[feature.source_file] = feature
      end
    end

    def all_features
      @mutex ||= Mutex.new
      @features ||= {}
      @mutex.synchronize do
        @features.values
      end
    end

    def next_order
      @mutex ||= Mutex.new
      @order_seq ||= 0
      @mutex.synchronize do
        n = @order_seq
        @order_seq += 1
        n
      end
    end

    def reset
      @mutex ||= Mutex.new
      @mutex.synchronize do
        @collected = []
        @features = {}
        @order_seq = 0
      end
    end
  end
end

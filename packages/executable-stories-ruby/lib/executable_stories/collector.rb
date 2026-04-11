# frozen_string_literal: true

require_relative "types"

module ExecutableStories
  @mutex = Mutex.new
  @collected = []
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
        @order_seq = 0
      end
    end
  end
end

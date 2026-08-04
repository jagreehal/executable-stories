# frozen_string_literal: true

require "set"

require_relative "types"
require_relative "doc_entry"
require_relative "collector"

module ExecutableStories
  class Story
    attr_accessor :scenario, :steps, :tags, :tickets, :covers, :meta, :docs,
                  :current_step, :seen_primary, :start_time, :end_time,
                  :source_order, :step_counter, :attachments, :active_timers,
                  :timer_counter, :otel_spans, :trace_url_template, :suite_path

    def initialize(scenario, tags: nil, ticket: nil, covers: nil, meta: nil, trace_url_template: nil)
      @scenario = scenario
      @steps = []
      @tags = tags
      @tickets = normalize_tickets(ticket)
      @covers = covers
      @meta = meta&.dup
      @docs = []
      @current_step = nil
      @seen_primary = {}
      @start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000.0
      @source_order = Collector.next_order
      @step_counter = 0
      @attachments = []
      @active_timers = {}
      @timer_counter = 0
      @otel_spans = nil
      @trace_url_template = trace_url_template
      @suite_path = nil

      bridge_otel
    end

    def given(text)
      add_step("Given", text)
      self
    end

    def when(text)
      add_step("When", text)
      self
    end

    def then(text)
      add_step("Then", text)
      self
    end

    def and(text)
      add_explicit_step("And", text)
      self
    end

    def but(text)
      add_explicit_step("But", text)
      self
    end

    def arrange(text)
      add_step("Given", text)
      self
    end

    def act(text)
      add_step("When", text)
      self
    end

    def assert_that(text)
      add_step("Then", text)
      self
    end

    def setup(text)
      add_step("Given", text)
      self
    end

    def context(text)
      add_step("Given", text)
      self
    end

    def execute(text)
      add_step("When", text)
      self
    end

    def action(text)
      add_step("When", text)
      self
    end

    def verify(text)
      add_step("Then", text)
      self
    end

    def fn(keyword, text, &body)
      add_step(keyword, text)
      @current_step.wrapped = true

      start_ms = Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000.0
      begin
        result = body.call
        @current_step.duration_ms = (Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000.0) - start_ms
        result
      rescue StandardError => e
        @current_step.duration_ms = (Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000.0) - start_ms
        raise e
      end
    end

    def expect(text, &)
      fn("Then", text, &)
    end

    def start_timer
      token = @timer_counter
      @timer_counter += 1

      step_index = @current_step ? @steps.index(@current_step) : nil
      entry = {
        start: Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000.0,
        step_index: step_index,
        step_id: @current_step&.id,
        consumed: false
      }
      @active_timers[token] = entry
      token
    end

    def end_timer(token)
      entry = @active_timers[token]
      return unless entry && !entry[:consumed]

      entry[:consumed] = true
      duration_ms = (Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000.0) - entry[:start]

      step = nil
      step = @steps.find { |s| s.id == entry[:step_id] } if entry[:step_id]
      step = @steps[entry[:step_index]] if !step && entry[:step_index] && entry[:step_index] < @steps.length

      step.duration_ms = duration_ms if step
    end

    def note(text, children: nil)
      entry = DocEntry.note(text, children: children)
      attach_doc(entry)
      entry
    end

    def tag(*names, children: nil)
      entry = DocEntry.tag(*names, children: children)
      attach_doc(entry)
      entry
    end

    def kv(label, value, children: nil)
      entry = DocEntry.kv(label, value, children: children)
      attach_doc(entry)
      entry
    end

    def json(label, value, children: nil)
      entry = DocEntry.json_doc(label, value, children: children)
      attach_doc(entry)
      entry
    end

    def code(label, content, lang: nil, children: nil)
      entry = DocEntry.code(label, content, lang: lang, children: children)
      attach_doc(entry)
      entry
    end

    def table(label, columns, rows, children: nil)
      entry = DocEntry.table(label, columns, rows, children: children)
      attach_doc(entry)
      entry
    end

    def link(label, url, children: nil)
      entry = DocEntry.link(label, url, children: children)
      attach_doc(entry)
      entry
    end

    def section(title, markdown, children: nil)
      entry = DocEntry.section(title, markdown, children: children)
      attach_doc(entry)
      entry
    end

    def mermaid(code, title: nil, children: nil)
      entry = DocEntry.mermaid(code, title: title, children: children)
      attach_doc(entry)
      entry
    end

    def screenshot(path, alt: nil, children: nil)
      entry = DocEntry.screenshot(path, alt: alt, children: children)
      attach_doc(entry)
      entry
    end

    def state(value, label: nil, children: nil)
      entry = DocEntry.state(value, label: label, children: children)
      attach_doc(entry)
      entry
    end

    def html(path: nil, url: nil, content: nil, title: nil, height: nil, children: nil)
      entry = DocEntry.html(path: path, url: url, content: content, title: title, height: height, children: children)
      attach_doc(entry)
      entry
    end

    def custom(type, data, children: nil)
      entry = DocEntry.custom(type, data, children: children)
      attach_doc(entry)
      entry
    end

    def attach(name, media_type, path: nil, body: nil, encoding: nil, charset: nil, file_name: nil)
      att = RawAttachment.new(
        name: name,
        media_type: media_type,
        path: path,
        body: body,
        encoding: encoding,
        charset: charset,
        file_name: file_name
      )
      if @current_step
        idx = @steps.index(@current_step)
        att.step_index = idx if idx
        att.step_id = @current_step.id
      end
      @attachments << att
      self
    end

    def attach_inline(name, media_type, body, encoding: "IDENTITY")
      att = RawAttachment.new(
        name: name,
        media_type: media_type,
        body: body,
        encoding: encoding
      )
      if @current_step
        idx = @steps.index(@current_step)
        att.step_index = idx if idx
        att.step_id = @current_step.id
      end
      @attachments << att
      self
    end

    def attach_spans(spans)
      @otel_spans = spans
      self
    end

    def get_meta
      StoryMeta.new(
        scenario: @scenario,
        steps: @steps,
        tags: @tags,
        tickets: @tickets,
        covers: @covers,
        meta: @meta,
        suite_path: @suite_path,
        docs: @docs.empty? ? nil : @docs,
        source_order: @source_order,
        otel_spans: @otel_spans
      )
    end

    def record(status:, title: nil, suite_path: nil, source_file: nil, source_line: nil, duration_ms: nil, error: nil)
      @end_time = Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000.0
      @suite_path = suite_path if suite_path
      duration = duration_ms || (@end_time - @start_time)

      step_events = @steps.each_with_index.map do |s, i|
        s.duration_ms ? RawStepEvent.new(index: i, title: s.text, duration_ms: s.duration_ms) : nil
      end.compact

      tc = RawTestCase.new(
        status: status,
        title: title || @scenario,
        title_path: suite_path ? suite_path + [@scenario] : [@scenario],
        story: get_meta,
        source_file: source_file,
        source_line: source_line,
        duration_ms: duration,
        error: error,
        retry: 0,
        retries: 0,
        attachments: @attachments.empty? ? nil : @attachments,
        step_events: step_events.empty? ? nil : step_events,
        start_time: @start_time,
        end_time: @end_time
      )
      Collector.record(tc)
      tc
    end

    private

    def add_step(keyword, text)
      effective = keyword
      if %w[Given When Then].include?(keyword)
        if @seen_primary[keyword]
          effective = "And"
        else
          @seen_primary[keyword] = true
        end
      end

      step = StoryStep.new(
        id: "step-#{@step_counter}",
        keyword: effective,
        text: text,
        mode: nil,
        wrapped: nil,
        duration_ms: nil,
        docs: nil
      )
      @step_counter += 1
      @steps << step
      @current_step = step
      nil
    end

    def add_explicit_step(keyword, text)
      step = StoryStep.new(
        id: "step-#{@step_counter}",
        keyword: keyword,
        text: text,
        mode: nil,
        wrapped: nil,
        duration_ms: nil,
        docs: nil
      )
      @step_counter += 1
      @steps << step
      @current_step = step
      nil
    end

    def attach_doc(entry)
      if entry["children"] && !entry["children"].empty?
        child_set = entry["children"].to_set(&:object_id)
        filter_docs = ->(docs) { docs.reject { |d| child_set.include?(d.object_id) } }
        @docs = filter_docs.call(@docs)
        @steps.each { |s| s.docs = filter_docs.call(s.docs) if s.docs }
      end

      if @current_step
        @current_step.docs ||= []
        @current_step.docs << entry
      else
        @docs << entry
      end
    end

    def normalize_tickets(ticket)
      return nil unless ticket

      tickets = Array(ticket)
      tickets.map do |t|
        if t.is_a?(String)
          Ticket.new(id: t)
        else
          Ticket.new(id: t[:id] || t["id"], url: t[:url] || t["url"])
        end
      end
    end

    def bridge_otel
      require "opentelemetry-api"
      context = OpenTelemetry::Trace.current_span_context
      return unless context&.valid?

      inject_otel_meta(context)
      inject_otel_docs(context)
      tag_otel_span
    rescue LoadError
      # opentelemetry-api not available
    rescue StandardError
      # OTel not configured, ignore
    end

    def inject_otel_meta(context)
      @meta ||= {}
      @meta["otel"] = { "traceId" => context.trace_id, "spanId" => context.span_id }
    end

    def inject_otel_docs(context)
      @docs << DocEntry.kv("Trace ID", context.trace_id)

      template = @trace_url_template || ENV["OTEL_TRACE_URL_TEMPLATE"]
      return unless template && !template.empty?

      url = template.gsub("{traceId}", context.trace_id)
      @docs << DocEntry.link("View Trace", url)
    end

    def tag_otel_span
      span = OpenTelemetry::Trace.current_span
      return unless span && !span.recording?

      span.set_attribute("story.scenario", @scenario)
      span.set_attribute("story.tags", @tags.join(",")) if @tags && !@tags.empty?
      return unless @tickets

      span.set_attribute("story.tickets", @tickets.map(&:id).join(","))
    end
  end

  module_function

  def init(scenario, **opts)
    Story.new(scenario, **opts)
  end

  # Records a scenario that is specified but not built yet. It appears in the
  # report marked "planned" and stops being planned once someone writes it as a
  # real story with init.
  #
  #   def test_checkout_blocks_suspended_account
  #     ExecutableStories.planned("checkout is blocked for a suspended account")
  #   end
  #
  # Minitest's skip means "do not run this now", which is a different claim from
  # "we have not built this yet", so planned does not skip for you.
  #
  # Recorded at the point of the call: Minitest has no per-test hook to revisit
  # the outcome, so keep this the only statement in the test. Anything after it
  # that fails is recorded by your own `story.record(status: "fail")` call, not
  # by this one.
  #
  # The source location defaults to the caller, so a planned scenario is grouped
  # with the rest of its file instead of landing under an unknown feature. Pass
  # source_file / source_line to override.
  def planned(scenario, source_file: nil, source_line: nil, **opts)
    location = caller_locations(1, 1)&.first
    story = Story.new(scenario, **opts)
    story.record(
      status: "todo",
      duration_ms: 0,
      source_file: source_file || location&.path,
      source_line: source_line || location&.lineno
    )
    story
  end
end

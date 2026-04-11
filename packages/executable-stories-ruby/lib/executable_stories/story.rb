# frozen_string_literal: true

require "set"

require_relative "types"
require_relative "doc_entry"
require_relative "collector"

module ExecutableStories
  class Story
    attr_accessor :scenario, :steps, :tags, :tickets, :meta, :docs,
                  :current_step, :seen_primary, :start_time, :end_time,
                  :source_order, :step_counter, :attachments, :active_timers,
                  :timer_counter, :otel_spans, :trace_url_template

    def initialize(scenario, tags: nil, ticket: nil, meta: nil, trace_url_template: nil)
      @scenario = scenario
      @steps = []
      @tags = tags
      @tickets = normalize_tickets(ticket)
      @meta = meta ? meta.dup : nil
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
        @current_step.duration_ms = Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000.0 - start_ms
        result
      rescue => e
        @current_step.duration_ms = Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000.0 - start_ms
        raise e
      end
    end

    def expect(text, &body)
      fn("Then", text, &body)
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
      duration_ms = Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000.0 - entry[:start]

      step = nil
      if entry[:step_id]
        step = @steps.find { |s| s.id == entry[:step_id] }
      end
      if !step && entry[:step_index] && entry[:step_index] < @steps.length
        step = @steps[entry[:step_index]]
      end

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
        meta: @meta,
        docs: @docs.empty? ? nil : @docs,
        source_order: @source_order,
        otel_spans: @otel_spans
      )
    end

    def record(status:, title: nil, suite_path: nil, source_file: nil, duration_ms: nil, error: nil)
      @end_time = Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000.0
      duration = duration_ms || (@end_time - @start_time)

      step_events = @steps.each_with_index.map { |s, i|
        s.duration_ms ? RawStepEvent.new(index: i, title: s.text, duration_ms: s.duration_ms) : nil
      }.compact

      tc = RawTestCase.new(
        status: status,
        title: title || @scenario,
        title_path: suite_path ? suite_path + [@scenario] : [@scenario],
        story: get_meta,
        source_file: source_file,
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
        child_set = entry["children"].to_set { |c| c.object_id }
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
      tickets.map { |t| t.is_a?(String) ? Ticket.new(id: t) : Ticket.new(id: t[:id] || t["id"], url: t[:url] || t["url"]) }
    end

    def bridge_otel
      # OTel bridge is a no-op unless the opentelemetry gem is loaded.
      # When available, detect active span and inject trace metadata.
      begin
        require "opentelemetry-api"
        context = OpenTelemetry::Trace.current_span_context
        return unless context&.valid?

        trace_id = context.trace_id
        span_id = context.span_id

        @meta ||= {}
        @meta["otel"] = { "traceId" => trace_id, "spanId" => span_id }

        @docs << DocEntry.kv("Trace ID", trace_id)

        template = @trace_url_template || ENV["OTEL_TRACE_URL_TEMPLATE"]
        if template && !template.empty?
          url = template.gsub("{traceId}", trace_id)
          @docs << DocEntry.link("View Trace", url)
        end

        span = OpenTelemetry::Trace.current_span
        if span && !span.recording?
          span.set_attribute("story.scenario", @scenario)
          span.set_attribute("story.tags", @tags.join(",")) if @tags && !@tags.empty?
          if @tickets
            span.set_attribute("story.tickets", @tickets.map { |t| t.id }.join(","))
          end
        end
      rescue LoadError
        # opentelemetry-api not available
      rescue StandardError
        # OTel not configured, ignore
      end
    end
  end

  module_function

  def init(scenario, **opts)
    Story.new(scenario, **opts)
  end
end

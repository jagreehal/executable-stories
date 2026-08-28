# frozen_string_literal: true

module ExecutableStories
  Ticket = Struct.new(:id, :url, keyword_init: true)

  RawError = Struct.new(:message, :stack, keyword_init: true)

  RawCIInfo = Struct.new(:name, :url, :build_number, keyword_init: true)

  RawAttachment = Struct.new(
    :name, :media_type, :path, :body, :encoding,
    :charset, :file_name, :byte_length, :step_index, :step_id,
    keyword_init: true
  )

  RawStepEvent = Struct.new(:index, :title, :status, :duration_ms, keyword_init: true)

  StoryStep = Struct.new(
    :id, :keyword, :text, :mode, :wrapped, :duration_ms, :docs, :assertions,
    keyword_init: true
  )

  StoryMeta = Struct.new(
    :scenario, :steps, :tags, :tickets, :covers, :meta, :suite_path, :docs,
    :source_order, :otel_spans,
    keyword_init: true
  )

  RawTestCase = Struct.new(
    :status, :external_id, :title, :title_path, :story, :source_file,
    :source_line, :duration_ms, :error, :meta, :retry, :retries,
    :attachments, :step_events, :start_time, :end_time,
    keyword_init: true
  )

  RawRun = Struct.new(
    :schema_version, :test_cases, :features, :project_root, :started_at_ms,
    :finished_at_ms, :package_version, :git_sha, :ci, :meta, :run_scope,
    keyword_init: true
  )

  # What a file's scenarios are for, declared with ExecutableStories.feature.
  RawFeature = Struct.new(
    :source_file, :title, :kind, :narrative, :tags, :glossary,
    keyword_init: true
  )

  # One entry in a feature's glossary.
  RawGlossaryTerm = Struct.new(:term, :definition, keyword_init: true)

  # Published raw-run schema, emitted as `$schema` so editors validate the
  # output file as the adapter writes it.
  SCHEMA_URL = "https://executable-stories.dev/schemas/raw-run.schema.json"

  module_function

  def step_to_h(step)
    h = {
      "keyword" => step.keyword,
      "text" => step.text
    }
    h["id"] = step.id if step.id
    h["mode"] = step.mode if step.mode
    h["wrapped"] = step.wrapped if step.wrapped
    h["durationMs"] = step.duration_ms if step.duration_ms
    # 0 is a finding, so test for nil rather than truthiness.
    h["assertions"] = step.assertions unless step.assertions.nil?
    h["docs"] = step.docs.map { |d| d.is_a?(Hash) ? d : d.to_h } if step.docs && !step.docs.empty?
    h
  end

  def meta_to_h(meta)
    h = {
      "scenario" => meta.scenario,
      "steps" => meta.steps.map { |s| s.is_a?(StoryStep) ? step_to_h(s) : s }
    }
    h["tags"] = meta.tags if meta.tags && !meta.tags.empty?
    h["tickets"] = meta.tickets.map { |t| t.is_a?(Ticket) ? ticket_to_h(t) : t } if meta.tickets && !meta.tickets.empty?
    h["covers"] = meta.covers if meta.covers && !meta.covers.empty?
    h["meta"] = meta.meta if meta.meta
    h["suitePath"] = meta.suite_path if meta.suite_path
    h["docs"] = meta.docs if meta.docs && !meta.docs.empty?
    h["sourceOrder"] = meta.source_order unless meta.source_order.nil?
    h["otelSpans"] = meta.otel_spans if meta.otel_spans
    h
  end

  def ticket_to_h(ticket)
    h = { "id" => ticket.id }
    h["url"] = ticket.url if ticket.url
    h
  end

  def error_to_h(error)
    h = {}
    h["message"] = error.message if error.message
    h["stack"] = error.stack if error.stack
    h
  end

  def attachment_to_h(att)
    h = {
      "name" => att.name,
      "mediaType" => att.media_type
    }
    h["path"] = att.path if att.path
    h["body"] = att.body if att.body
    h["encoding"] = att.encoding if att.encoding
    h["charset"] = att.charset if att.charset
    h["fileName"] = att.file_name if att.file_name
    h["byteLength"] = att.byte_length if att.byte_length
    h["stepIndex"] = att.step_index unless att.step_index.nil?
    h["stepId"] = att.step_id if att.step_id
    h
  end

  def step_event_to_h(event)
    h = {}
    h["index"] = event.index unless event.index.nil?
    h["title"] = event.title if event.title
    h["status"] = event.status if event.status
    h["durationMs"] = event.duration_ms if event.duration_ms
    h
  end

  def test_case_to_h(tc)
    h = { "status" => tc.status }
    h["externalId"] = tc.external_id if tc.external_id
    h["title"] = tc.title if tc.title
    h["titlePath"] = tc.title_path if tc.title_path
    h["story"] = meta_to_h(tc.story) if tc.story
    h["sourceFile"] = tc.source_file if tc.source_file
    h["sourceLine"] = tc.source_line if tc.source_line
    h["durationMs"] = tc.duration_ms if tc.duration_ms
    h["error"] = error_to_h(tc.error) if tc.error
    h["meta"] = tc.meta if tc.meta
    h["retry"] = tc.retry unless tc.retry.nil?
    h["retries"] = tc.retries unless tc.retries.nil?
    h["attachments"] = tc.attachments.map { |a| attachment_to_h(a) } if tc.attachments && !tc.attachments.empty?
    h["stepEvents"] = tc.step_events.map { |e| step_event_to_h(e) } if tc.step_events && !tc.step_events.empty?
    h
  end

  def ci_info_to_h(ci)
    h = { "name" => ci.name }
    h["url"] = ci.url if ci.url
    h["buildNumber"] = ci.build_number if ci.build_number
    h
  end

  def feature_to_h(feature)
    h = { "title" => feature.title }
    h["sourceFile"] = feature.source_file if feature.source_file
    h["kind"] = feature.kind if feature.kind
    h["narrative"] = feature.narrative if feature.narrative
    h["tags"] = feature.tags if feature.tags && !feature.tags.empty?
    if feature.glossary && !feature.glossary.empty?
      h["glossary"] = feature.glossary.map { |t| { "term" => t.term, "definition" => t.definition } }
    end
    h
  end

  def run_to_h(run)
    # $schema first so editors pick it up and validate the file as it is
    # written; `executable-stories doctor` also reports its presence.
    h = {
      "$schema" => SCHEMA_URL,
      "schemaVersion" => run.schema_version,
      "testCases" => run.test_cases.map { |tc| test_case_to_h(tc) },
      "projectRoot" => run.project_root
    }
    h["features"] = run.features.map { |f| feature_to_h(f) } if run.features && !run.features.empty?
    h["startedAtMs"] = run.started_at_ms unless run.started_at_ms.nil?
    h["finishedAtMs"] = run.finished_at_ms unless run.finished_at_ms.nil?
    h["packageVersion"] = run.package_version if run.package_version
    h["gitSha"] = run.git_sha if run.git_sha
    h["ci"] = ci_info_to_h(run.ci) if run.ci
    h["meta"] = run.meta if run.meta
    # Absent means the runner could not tell; consumers then keep what the run
    # did not report rather than retiring it on a guess.
    h["runScope"] = run.run_scope if run.run_scope
    h
  end
end

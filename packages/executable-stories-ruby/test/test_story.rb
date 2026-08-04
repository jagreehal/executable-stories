# frozen_string_literal: true

require "json"
require "tmpdir"
require "fileutils"
require "rbconfig"
require "open3"
require "minitest/autorun"
require_relative "../lib/executable_stories"
require_relative "../lib/executable_stories/minitest"

class TestStory < Minitest::Test
  def setup
    ExecutableStories::Collector.reset
  end

  def test_planned_records_todo_scenario
    ExecutableStories.planned("checkout is blocked for a suspended account", tags: ["checkout"])

    cases = ExecutableStories::Collector.all
    assert_equal 1, cases.length
    tc = cases[0]
    assert_equal "todo", tc.status
    assert_equal "checkout is blocked for a suspended account", tc.story.scenario
    assert_empty tc.story.steps
    assert_equal ["checkout"], tc.story.tags
    # Without a source location the scenario is grouped under an unknown feature.
    assert_equal __FILE__, tc.source_file
    assert_operator tc.source_line, :>, 0
  end

  def test_planned_accepts_an_explicit_source_location
    ExecutableStories.planned("elsewhere", source_file: "app/checkout.rb", source_line: 42)

    tc = ExecutableStories::Collector.all[0]
    assert_equal "app/checkout.rb", tc.source_file
    assert_equal 42, tc.source_line
  end

  def test_init_creates_story
    s = ExecutableStories::Story.new("user logs in successfully")
    assert_equal "user logs in successfully", s.scenario
  end

  def test_steps
    s = ExecutableStories::Story.new("step keywords")
    s.given("a precondition")
    s.when("an action occurs")
    s.then("the expected outcome")
    s.and("another outcome")
    s.but("not this outcome")

    assert_equal 5, s.steps.length

    expected = [
      ["Given", "a precondition"],
      ["When", "an action occurs"],
      ["Then", "the expected outcome"],
      ["And", "another outcome"],
      ["But", "not this outcome"]
    ]

    s.steps.each_with_index do |step, i|
      assert_equal expected[i][0], step.keyword
      assert_equal expected[i][1], step.text
    end
  end

  def test_auto_and_for_repeated_keywords
    s = ExecutableStories::Story.new("auto and")
    s.given("first given")
    s.given("second given")
    s.when("first when")
    s.when("second when")
    s.then("first then")
    s.then("second then")

    expected = [
      ["Given", "first given"],
      ["And", "second given"],
      ["When", "first when"],
      ["And", "second when"],
      ["Then", "first then"],
      ["And", "second then"]
    ]

    assert_equal expected.length, s.steps.length
    s.steps.each_with_index do |step, i|
      assert_equal expected[i][0], step.keyword
      assert_equal expected[i][1], step.text
    end
  end

  def test_auto_and_for_non_consecutive_keywords
    s = ExecutableStories::Story.new("non-consecutive")
    s.given("first given")
    s.when("a when in between")
    s.given("second given")

    expected = [
      ["Given", "first given"],
      ["When", "a when in between"],
      ["And", "second given"]
    ]

    assert_equal expected.length, s.steps.length
    s.steps.each_with_index do |step, i|
      assert_equal expected[i][0], step.keyword
      assert_equal expected[i][1], step.text
    end
  end

  def test_aaa_aliases
    s = ExecutableStories::Story.new("AAA aliases")
    s.arrange("precondition")
    s.act("action")
    s.assert_that("outcome")

    assert_equal "Given", s.steps[0].keyword
    assert_equal "When", s.steps[1].keyword
    assert_equal "Then", s.steps[2].keyword
  end

  def test_extra_aliases
    s = ExecutableStories::Story.new("extra aliases")
    s.setup("setup")
    s.context("context")
    s.execute("execute")
    s.action("action")
    s.verify("verify")

    assert_equal "Given", s.steps[0].keyword
    assert_equal "And", s.steps[1].keyword
    assert_equal "When", s.steps[2].keyword
    assert_equal "And", s.steps[3].keyword
    assert_equal "Then", s.steps[4].keyword
  end

  def test_doc_before_step_goes_to_story_level
    s = ExecutableStories::Story.new("doc attachment")
    s.note("story-level note")

    assert_equal 1, s.docs.length
    assert_equal "note", s.docs[0]["kind"]
    assert_equal "runtime", s.docs[0]["phase"]
  end

  def test_doc_after_step_goes_to_step
    s = ExecutableStories::Story.new("doc attachment")
    s.given("a step")
    s.note("step-level note")
    s.kv("key", "value")

    assert_equal 2, s.steps[0].docs.length
    assert_equal "note", s.steps[0].docs[0]["kind"]
    assert_equal "kv", s.steps[0].docs[1]["kind"]
  end

  def test_doc_new_step_resets_target
    s = ExecutableStories::Story.new("doc target reset")
    s.given("first step")
    s.note("first note")
    s.when("second step")
    s.link("example", "https://example.com")

    assert_equal 1, s.steps[0].docs.length
    assert_equal 1, s.steps[1].docs.length
    assert_equal "link", s.steps[1].docs[0]["kind"]
  end

  def test_all_doc_kinds
    s = ExecutableStories::Story.new("all docs")
    s.given("a step")
    s.note("a note")
    s.tag("tag1", "tag2")
    s.kv("key", "val")
    s.code("snippet", "x = 1", lang: "ruby")
    s.json("payload", { "a" => 1 })
    s.table("t", ["a"], [["1"]])
    s.link("link", "https://example.com")
    s.section("sec", "# Hello")
    s.mermaid("graph TD; A-->B", title: "diagram")
    s.screenshot("/path/img.png", alt: "alt text")
    s.html(content: "<h1>Report</h1>", title: "Coverage")
    s.state({ "count" => 1 }, label: "World")
    s.custom("myType", { "foo" => "bar" })

    assert_equal 13, s.steps[0].docs.length

    expected_kinds = %w[note tag kv code code table link section mermaid screenshot html state custom]
    s.steps[0].docs.each_with_index do |doc, i|
      assert_equal expected_kinds[i], doc["kind"]
      assert_equal "runtime", doc["phase"]
    end
  end

  def test_fn_creates_wrapped_step
    s = ExecutableStories::Story.new("fn test")
    called = false
    result = s.fn("Given", "a wrapped precondition") do
      called = true
      42
    end

    assert called
    assert_equal 42, result
    assert_equal 1, s.steps.length
    assert_equal "Given", s.steps[0].keyword
    assert_equal "a wrapped precondition", s.steps[0].text
    assert s.steps[0].wrapped
    assert s.steps[0].duration_ms
  end

  def test_fn_propagates_exceptions
    s = ExecutableStories::Story.new("fn exception")
    assert_raises(RuntimeError) do
      s.fn("Then", "it should fail") { raise "boom" }
    end
    assert s.steps[0].duration_ms
  end

  def test_fn_auto_and_conversion
    s = ExecutableStories::Story.new("fn auto-and")
    s.given("a text-only step")
    s.fn("Given", "a wrapped step") { nil }

    assert_equal "Given", s.steps[0].keyword
    assert_equal "And", s.steps[1].keyword
    assert s.steps[1].wrapped
  end

  def test_expect_creates_wrapped_then_step
    s = ExecutableStories::Story.new("expect test")
    called = false
    s.expect("the result is correct") { called = true }

    assert called
    assert_equal 1, s.steps.length
    assert_equal "Then", s.steps[0].keyword
    assert s.steps[0].wrapped
    assert s.steps[0].duration_ms
  end

  def test_expect_returns_result
    s = ExecutableStories::Story.new("expect return")
    result = s.expect("check value") { true }
    assert result
  end

  def test_start_timer_end_timer
    s = ExecutableStories::Story.new("timer test")
    s.given("a step to time")
    token = s.start_timer
    sleep(0.02)
    s.end_timer(token)

    assert s.steps[0].duration_ms
    assert s.steps[0].duration_ms >= 10
  end

  def test_double_end_timer_is_noop
    s = ExecutableStories::Story.new("double end")
    s.given("a step")
    token = s.start_timer
    sleep(0.02)
    s.end_timer(token)
    first = s.steps[0].duration_ms

    sleep(0.01)
    s.end_timer(token)

    assert_in_delta first, s.steps[0].duration_ms, 0.5
  end

  def test_invalid_timer_token_is_noop
    s = ExecutableStories::Story.new("invalid token")
    s.given("a step")
    s.end_timer(999)

    assert_nil s.steps[0].duration_ms
  end

  def test_init_with_tags_and_tickets
    s = ExecutableStories::Story.new("option test",
                                     tags: %w[smoke auth],
                                     ticket: %w[JIRA-123 JIRA-456],
                                     meta: { "priority" => "high" })

    assert_equal %w[smoke auth], s.tags
    assert_equal 2, s.tickets.length
    assert_equal "JIRA-123", s.tickets[0].id
    assert_equal "JIRA-456", s.tickets[1].id
    assert_equal({ "priority" => "high" }, s.meta)
  end

  def test_init_with_covers
    s = ExecutableStories::Story.new("covers test", covers: ["src/auth/login.rb"])

    assert_equal ["src/auth/login.rb"], s.covers
    assert_equal ["src/auth/login.rb"], ExecutableStories.meta_to_h(s.get_meta)["covers"]
  end

  def test_init_with_ticket_hash
    s = ExecutableStories::Story.new("ticket hash",
                                     ticket: [{ id: "JIRA-200", url: "https://jira.example.com/JIRA-200" }])

    assert_equal 1, s.tickets.length
    assert_equal "JIRA-200", s.tickets[0].id
    assert_equal "https://jira.example.com/JIRA-200", s.tickets[0].url
  end

  def test_get_meta
    s = ExecutableStories::Story.new("meta test")
    s.given("a step")

    meta = s.get_meta
    assert_equal "meta test", meta.scenario
    assert_equal 1, meta.steps.length
  end

  def test_attach_file
    s = ExecutableStories::Story.new("attach test")
    s.given("a step")
    s.attach("screenshot", "image/png", path: "/tmp/screenshot.png")

    assert_equal 1, s.attachments.length
    assert_equal "screenshot", s.attachments[0].name
    assert_equal "image/png", s.attachments[0].media_type
    assert_equal "/tmp/screenshot.png", s.attachments[0].path
    assert_equal "step-0", s.attachments[0].step_id
  end

  def test_attach_inline
    s = ExecutableStories::Story.new("attach inline test")
    s.given("a step")
    s.attach_inline("log", "text/plain", "line1\nline2")

    assert_equal 1, s.attachments.length
    assert_equal "log", s.attachments[0].name
    assert_equal "line1\nline2", s.attachments[0].body
    assert_equal "IDENTITY", s.attachments[0].encoding
  end

  def test_doc_children
    s = ExecutableStories::Story.new("doc children")
    child1 = ExecutableStories::DocEntry.note("child note 1")
    child2 = ExecutableStories::DocEntry.kv("child-key", "child-value")
    s.note("parent note", children: [child1, child2])

    assert_equal 1, s.docs.length
    assert_equal "note", s.docs[0]["kind"]
    assert_equal "parent note", s.docs[0]["text"]
    assert_equal 2, s.docs[0]["children"].length
    assert_equal "note", s.docs[0]["children"][0]["kind"]
    assert_equal "child note 1", s.docs[0]["children"][0]["text"]
    assert_equal "kv", s.docs[0]["children"][1]["kind"]
  end

  def test_doc_entry_returns_entry
    s = ExecutableStories::Story.new("return doc")
    entry = s.note("returned note")
    assert_equal "note", entry["kind"]
    assert_equal "returned note", entry["text"]
    assert_equal 1, s.docs.length
  end

  def test_json_doc
    s = ExecutableStories::Story.new("json doc")
    s.given("some data")
    s.json("payload", { "key" => "value", "count" => 42 })

    doc = s.steps[0].docs[0]
    assert_equal "code", doc["kind"]
    assert_equal "json", doc["lang"]
    assert_equal "payload", doc["label"]
    parsed = JSON.parse(doc["content"])
    assert_equal "value", parsed["key"]
    assert_equal 42, parsed["count"]
  end

  def test_state_doc_attaches_to_current_step
    s = ExecutableStories::Story.new("state doc")
    s.given("a basket")
    s.state({ "items" => 2, "total" => 9.98 }, label: "Basket")

    doc = s.steps[0].docs[0]
    assert_equal(
      { "kind" => "state", "label" => "Basket", "value" => { "items" => 2, "total" => 9.98 }, "phase" => "runtime" },
      doc
    )
  end

  def test_state_doc_without_label_is_story_level_before_steps
    s = ExecutableStories::Story.new("state no label")
    s.state({ "a" => 1 })

    doc = s.docs[0]
    assert_equal "state", doc["kind"]
    refute doc.key?("label")
  end

  def test_state_doc_nested_value_round_trip
    s = ExecutableStories::Story.new("state round trip")
    value = { "user" => { "name" => "alice", "roles" => ["admin"] }, "counts" => [1, 2, 3], "ok" => nil }
    s.state(value, label: "World")

    assert_equal value, JSON.parse(JSON.generate(s.docs[0]["value"]))
  end

  def test_source_order
    s1 = ExecutableStories::Story.new("first")
    s2 = ExecutableStories::Story.new("second")

    assert_equal 0, s1.source_order
    assert_equal 1, s2.source_order
  end

  def test_method_chaining
    s = ExecutableStories::Story.new("chaining")
    result = s.given("a").when("b").then("c")
    assert_same s, result
    assert_equal 3, s.steps.length
  end

  def test_record_creates_test_case
    s = ExecutableStories::Story.new("record test")
    s.given("a precondition")
    s.when("an action")
    s.then("expected result")

    tc = s.record(status: "pass")

    assert_equal "pass", tc.status
    assert_equal "record test", tc.title
    assert_equal ["record test"], tc.title_path
    assert tc.duration_ms
    assert tc.story
    assert_equal 3, tc.story.steps.length
    assert_nil tc.error
  end

  def test_record_with_options
    s = ExecutableStories::Story.new("record test")
    s.given("a precondition")

    tc = s.record(
      status: "fail",
      title: "custom title",
      suite_path: %w[MySuite MyTest],
      source_file: "test/example.rb",
      duration_ms: 42.5,
      error: ExecutableStories::RawError.new(message: "expected 5, got 3", stack: "test.rb:10")
    )

    assert_equal "fail", tc.status
    assert_equal "custom title", tc.title
    assert_equal ["MySuite", "MyTest", "record test"], tc.title_path
    assert_equal %w[MySuite MyTest], tc.story.suite_path
    assert_equal "test/example.rb", tc.source_file
    assert_equal 42.5, tc.duration_ms
    assert_equal "expected 5, got 3", tc.error.message
  end

  def test_record_populates_collector
    s = ExecutableStories::Story.new("collector test")
    s.given("a step")
    s.record(status: "pass")

    all = ExecutableStories::Collector.all
    assert_equal 1, all.length
    assert_equal "pass", all[0].status
  end

  def test_record_with_attachments
    s = ExecutableStories::Story.new("attach test")
    s.given("a step")
    s.attach("screenshot", "image/png", path: "/tmp/shot.png")
    s.record(status: "pass")

    all = ExecutableStories::Collector.all
    assert_equal 1, all[0].attachments.length
    assert_equal "screenshot", all[0].attachments[0].name
  end

  def test_record_copies_story_timestamps_to_test_case
    s = ExecutableStories::Story.new("timestamp test")
    s.given("a step")

    tc = s.record(status: "pass")

    refute_nil tc.start_time
    refute_nil tc.end_time
    assert_operator tc.end_time, :>=, tc.start_time
  end
end

class TestDocEntry < Minitest::Test
  def test_note
    entry = ExecutableStories::DocEntry.note("hello")
    assert_equal "note", entry["kind"]
    assert_equal "hello", entry["text"]
    assert_equal "runtime", entry["phase"]
  end

  def test_tag
    entry = ExecutableStories::DocEntry.tag("smoke", "fast")
    assert_equal "tag", entry["kind"]
    assert_equal %w[smoke fast], entry["names"]
    assert_equal "runtime", entry["phase"]
  end

  def test_kv
    entry = ExecutableStories::DocEntry.kv("count", 42)
    assert_equal "kv", entry["kind"]
    assert_equal "count", entry["label"]
    assert_equal 42, entry["value"]
  end

  def test_code
    entry = ExecutableStories::DocEntry.code("snippet", "x = 1", lang: "ruby")
    assert_equal "code", entry["kind"]
    assert_equal "snippet", entry["label"]
    assert_equal "x = 1", entry["content"]
    assert_equal "ruby", entry["lang"]
  end

  def test_code_without_lang
    entry = ExecutableStories::DocEntry.code("snippet", "x = 1")
    assert_equal "code", entry["kind"]
    assert_nil entry["lang"]
  end

  def test_json_doc
    data = { "key" => "value" }
    entry = ExecutableStories::DocEntry.json_doc("payload", data)
    assert_equal "code", entry["kind"]
    assert_equal "json", entry["lang"]
    assert_equal "payload", entry["label"]
  end

  def test_table
    entry = ExecutableStories::DocEntry.table("results", %w[name score], [%w[Alice 100]])
    assert_equal "table", entry["kind"]
    assert_equal "results", entry["label"]
    assert_equal %w[name score], entry["columns"]
    assert_equal [%w[Alice 100]], entry["rows"]
  end

  def test_link
    entry = ExecutableStories::DocEntry.link("docs", "https://example.com")
    assert_equal "link", entry["kind"]
    assert_equal "docs", entry["label"]
    assert_equal "https://example.com", entry["url"]
  end

  def test_section
    entry = ExecutableStories::DocEntry.section("Details", "## Heading\nBody text")
    assert_equal "section", entry["kind"]
    assert_equal "Details", entry["title"]
    assert_equal "## Heading\nBody text", entry["markdown"]
  end

  def test_mermaid
    entry = ExecutableStories::DocEntry.mermaid("graph TD; A-->B", title: "Flow")
    assert_equal "mermaid", entry["kind"]
    assert_equal "graph TD; A-->B", entry["code"]
    assert_equal "Flow", entry["title"]
  end

  def test_mermaid_without_title
    entry = ExecutableStories::DocEntry.mermaid("graph TD; A-->B")
    assert_equal "mermaid", entry["kind"]
    assert_nil entry["title"]
  end

  def test_screenshot
    entry = ExecutableStories::DocEntry.screenshot("/tmp/shot.png", alt: "Login page")
    assert_equal "screenshot", entry["kind"]
    assert_equal "/tmp/shot.png", entry["path"]
    assert_equal "Login page", entry["alt"]
  end

  def test_screenshot_without_alt
    entry = ExecutableStories::DocEntry.screenshot("/tmp/shot.png")
    assert_nil entry["alt"]
  end

  def test_state
    entry = ExecutableStories::DocEntry.state({ "a" => 1 }, label: "World")
    assert_equal "state", entry["kind"]
    assert_equal "World", entry["label"]
    assert_equal({ "a" => 1 }, entry["value"])
    assert_equal "runtime", entry["phase"]
  end

  def test_state_without_label
    entry = ExecutableStories::DocEntry.state([1, 2])
    refute entry.key?("label")
  end

  def test_custom
    entry = ExecutableStories::DocEntry.custom("metrics", { "latency_ms" => 42 })
    assert_equal "custom", entry["kind"]
    assert_equal "metrics", entry["type"]
    assert_equal 42, entry["data"]["latency_ms"]
  end

  def test_html_with_path
    entry = ExecutableStories::DocEntry.html(path: "./coverage/index.html", title: "Coverage", height: 600)
    assert_equal "html", entry["kind"]
    assert_equal "./coverage/index.html", entry["path"]
    assert_equal "Coverage", entry["title"]
    assert_equal 600, entry["height"]
    assert_nil entry["url"]
    assert_nil entry["content"]
  end

  def test_html_with_content
    entry = ExecutableStories::DocEntry.html(content: "<h1>Hi</h1>")
    assert_equal "html", entry["kind"]
    assert_equal "<h1>Hi</h1>", entry["content"]
    assert_nil entry["path"]
  end

  def test_html_requires_exactly_one_source
    assert_raises(ArgumentError) { ExecutableStories::DocEntry.html(title: "x") }
    assert_raises(ArgumentError) { ExecutableStories::DocEntry.html(path: "a.html", url: "https://x.test") }
  end

  def test_children
    child = ExecutableStories::DocEntry.note("inner")
    parent = ExecutableStories::DocEntry.kv("key", "value", children: [child])
    assert_equal 1, parent["children"].length
    assert_equal "note", parent["children"][0]["kind"]
  end

  def test_no_children_key_when_none
    entry = ExecutableStories::DocEntry.note("simple")
    assert_nil entry["children"]
  end
end

class TestJsonWriter < Minitest::Test
  def setup
    ExecutableStories::Collector.reset
    @tmpdir = File.join(Dir.tmpdir, "executable_stories_test_#{Process.pid}")
    FileUtils.mkdir_p(@tmpdir)
  end

  def teardown
    FileUtils.rm_rf(@tmpdir) if @tmpdir
  end

  def test_write_raw_run
    path = File.join(@tmpdir, "output", "raw-run.json")

    tc = ExecutableStories::RawTestCase.new(
      status: "pass",
      title: "test example",
      story: ExecutableStories::StoryMeta.new(
        scenario: "test example",
        steps: []
      )
    )

    run = ExecutableStories::RawRun.new(
      schema_version: 1,
      test_cases: [tc],
      project_root: Dir.pwd
    )

    ExecutableStories::JsonWriter.write_raw_run(run, path)

    assert File.exist?(path)
    data = JSON.parse(File.read(path))
    assert_equal 1, data["schemaVersion"]
    assert_equal 1, data["testCases"].length
    assert_equal "pass", data["testCases"][0]["status"]
  end

  # The $schema pointer lets editors validate the run file as it is written, and
  # `executable-stories doctor` reports whether it is present.
  def test_writes_schema_pointer
    path = File.join(@tmpdir, "raw-run.json")

    run = ExecutableStories::RawRun.new(
      schema_version: 1,
      test_cases: [],
      project_root: Dir.pwd
    )

    ExecutableStories::JsonWriter.write_raw_run(run, path)

    data = JSON.parse(File.read(path))
    assert_equal ExecutableStories::SCHEMA_URL, data["$schema"]
    # It must lead the file so editors pick it up immediately.
    assert_equal "$schema", data.keys.first
  end

  def test_creates_parent_directories
    path = File.join(@tmpdir, "deep", "nested", "dir", "raw-run.json")

    run = ExecutableStories::RawRun.new(
      schema_version: 1,
      test_cases: [],
      project_root: Dir.pwd
    )

    ExecutableStories::JsonWriter.write_raw_run(run, path)

    assert File.exist?(path)
  end

  def test_serializes_zero_values_for_order_and_retry_fields
    step = ExecutableStories::StoryStep.new(
      id: "step-0",
      keyword: "Given",
      text: "a step",
      duration_ms: 12.5
    )
    story = ExecutableStories::StoryMeta.new(
      scenario: "zero values",
      steps: [step],
      source_order: 0
    )
    attachment = ExecutableStories::RawAttachment.new(
      name: "log",
      media_type: "text/plain",
      step_index: 0
    )
    event = ExecutableStories::RawStepEvent.new(
      index: 0,
      title: "a step",
      duration_ms: 12.5
    )
    tc = ExecutableStories::RawTestCase.new(
      status: "pass",
      title: "zero values",
      story: story,
      retry: 0,
      retries: 0,
      attachments: [attachment],
      step_events: [event]
    )
    run = ExecutableStories::RawRun.new(
      schema_version: 1,
      test_cases: [tc],
      project_root: Dir.pwd,
      started_at_ms: 0.0,
      finished_at_ms: 0.0
    )

    data = ExecutableStories.run_to_h(run)

    assert_equal 0, data["startedAtMs"]
    assert_equal 0, data["finishedAtMs"]
    assert_equal 0, data["testCases"][0]["story"]["sourceOrder"]
    assert_equal 0, data["testCases"][0]["retry"]
    assert_equal 0, data["testCases"][0]["retries"]
    assert_equal 0, data["testCases"][0]["attachments"][0]["stepIndex"]
    assert_equal 0, data["testCases"][0]["stepEvents"][0]["index"]
  end
end

class TestCollector < Minitest::Test
  def setup
    ExecutableStories::Collector.reset
  end

  def test_record_and_all
    tc = ExecutableStories::RawTestCase.new(status: "pass", title: "test1")
    ExecutableStories::Collector.record(tc)

    all = ExecutableStories::Collector.all
    assert_equal 1, all.length
    assert_equal "test1", all[0].title
  end

  def test_next_order
    assert_equal 0, ExecutableStories::Collector.next_order
    assert_equal 1, ExecutableStories::Collector.next_order
    assert_equal 2, ExecutableStories::Collector.next_order
  end

  def test_reset
    ExecutableStories::Collector.next_order
    ExecutableStories::Collector.record(ExecutableStories::RawTestCase.new(status: "pass"))

    ExecutableStories::Collector.reset

    assert_equal 0, ExecutableStories::Collector.next_order
    assert_equal 0, ExecutableStories::Collector.all.length
  end
end

class TestMinitestPlugin < Minitest::Test
  def setup
    @tmpdir = Dir.mktmpdir("executable_stories_minitest")
  end

  def teardown
    FileUtils.rm_rf(@tmpdir) if @tmpdir
  end

  def test_after_run_hook_writes_raw_run_json
    output_path = File.join(@tmpdir, "raw-run.json")
    data = run_sample_test(output_path)

    assert_equal 1, data["schemaVersion"]
    assert_equal 1, data["testCases"].length
    assert_equal "pass", data["testCases"][0]["status"]
    assert_equal "writes output", data["testCases"][0]["story"]["scenario"]
    refute_nil data["startedAtMs"]
    refute_nil data["finishedAtMs"]
  end

  private

  def run_sample_test(output_path)
    script_path = File.join(@tmpdir, "sample_test.rb")
    lib_path = File.expand_path("../lib", __dir__)

    File.write(script_path, <<~RUBY)
      require "minitest/autorun"
      require "executable_stories"
      require "executable_stories/minitest"

      class SampleStoryTest < Minitest::Test
        def test_records_story
          story = ExecutableStories.init("writes output")
          story.given("a recorded step")
          story.record(status: "pass", source_file: __FILE__)
          assert true
        end
      end
    RUBY

    env = { "EXECUTABLE_STORIES_OUTPUT" => output_path }
    stdout, stderr, status = Open3.capture3(
      env, RbConfig.ruby,
      "-I", lib_path, script_path
    )

    assert status.success?, "subprocess failed\nstdout:\n#{stdout}\nstderr:\n#{stderr}"
    assert File.exist?(output_path), "expected #{output_path} to exist\nstdout:\n#{stdout}\nstderr:\n#{stderr}"

    JSON.parse(File.read(output_path))
  end
end

class TestRSpecAdapter < Minitest::Test
  def setup
    @tmpdir = Dir.mktmpdir("executable_stories_rspec")
  end

  def teardown
    FileUtils.rm_rf(@tmpdir) if @tmpdir
  end

  def test_rspec_plugin_writes_raw_run_that_formats_cleanly
    package_root = File.expand_path("..", __dir__)
    lib_path = File.join(package_root, "lib")
    rspec_executable = File.join(Gem.bindir, "rspec")
    spec_path = File.join(@tmpdir, "calculator_spec.rb")
    output_path = File.join(@tmpdir, "raw-run.json")

    File.write(
      spec_path,
      <<~RUBY
        require "executable_stories/rspec"

        ExecutableStories::RSpecPlugin.install!

        RSpec.describe "Arithmetic" do
          story "adds two numbers", tags: %w[smoke math], meta: { "component" => "calculator" } do |s|
            s.given("two numbers 5 and 3")
            a = 5
            b = 3

            s.when("they are added")
            result = a + b

            s.then("the result is 8")
            expect(result).to eq(8)

            s.note("calculation complete")
          end

          story "skips unavailable scenario", skip: "not ready" do |s|
            s.given("this block is never executed")
          end
        end
      RUBY
    )

    stdout = nil
    stderr = nil
    status = nil

    Dir.chdir(package_root) do
      stdout, stderr, status = Open3.capture3(
        { "EXECUTABLE_STORIES_OUTPUT" => output_path },
        RbConfig.ruby, "-I", lib_path, rspec_executable, "--format", "progress", spec_path
      )
    end

    assert status.success?, "RSpec run failed:\nSTDOUT:\n#{stdout}\nSTDERR:\n#{stderr}"
    assert File.exist?(output_path), "expected #{output_path} to exist\nSTDOUT:\n#{stdout}\nSTDERR:\n#{stderr}"

    raw = JSON.parse(File.read(output_path))
    assert_equal 1, raw["schemaVersion"]
    assert_equal 2, raw["testCases"].length

    pass_case = raw["testCases"].find { |tc| tc["status"] == "pass" }
    skip_case = raw["testCases"].find { |tc| tc["status"] == "skip" }

    refute_nil pass_case
    refute_nil skip_case

    assert_equal ["Arithmetic", "adds two numbers"], pass_case["titlePath"]
    assert_equal ["Arithmetic"], pass_case["story"]["suitePath"]
    assert_equal %w[smoke math], pass_case["story"]["tags"]
    assert_equal "calculator", pass_case["story"]["meta"]["component"]
    assert_operator pass_case["sourceLine"], :>, 0
    assert_equal 3, pass_case["story"]["steps"].length
    assert_equal "note", pass_case["story"]["steps"][2]["docs"][0]["kind"]

    assert_equal ["Arithmetic", "skips unavailable scenario"], skip_case["titlePath"]
    assert_operator skip_case["sourceLine"], :>, 0
    assert_equal [], skip_case["story"]["steps"]
  end
end

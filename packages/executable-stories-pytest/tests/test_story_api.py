"""Unit tests for the Story API."""

import json
import time

import pytest

from executable_stories._story_api import Story


class TestInit:
    def test_creates_context(self, fresh_story: Story):
        fresh_story.init("User logs in")
        meta = fresh_story._get_meta()
        assert meta is not None
        assert meta["scenario"] == "User logs in"

    def test_no_context_before_init(self, fresh_story: Story):
        assert fresh_story._get_meta() is None

    def test_tags_and_tickets(self, fresh_story: Story):
        fresh_story.init("Test", tags=["smoke"], ticket="JIRA-1")
        meta = fresh_story._get_meta()
        assert meta["tags"] == ["smoke"]
        assert meta["tickets"] == ["JIRA-1"]

    def test_ticket_list(self, fresh_story: Story):
        fresh_story.init("Test", ticket=["A-1", "B-2"])
        meta = fresh_story._get_meta()
        assert meta["tickets"] == ["A-1", "B-2"]

    def test_meta_dict(self, fresh_story: Story):
        fresh_story.init("Test", meta={"priority": "high"})
        meta = fresh_story._get_meta()
        assert meta["meta"] == {"priority": "high"}

    def test_clear(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story._clear()
        assert fresh_story._get_meta() is None


class TestSteps:
    def test_given_when_then(self, fresh_story: Story):
        fresh_story.init("Login flow")
        fresh_story.given("a registered user")
        fresh_story.when("they submit credentials")
        fresh_story.then("they see the dashboard")
        meta = fresh_story._get_meta()
        assert len(meta["steps"]) == 3
        assert meta["steps"][0]["keyword"] == "Given" and meta["steps"][0]["text"] == "a registered user"
        assert meta["steps"][1]["keyword"] == "When" and meta["steps"][1]["text"] == "they submit credentials"
        assert meta["steps"][2]["keyword"] == "Then" and meta["steps"][2]["text"] == "they see the dashboard"

    def test_and_but(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.given("setup")
        fresh_story.and_("more setup")
        fresh_story.but("not this")
        meta = fresh_story._get_meta()
        assert meta["steps"][1]["keyword"] == "And"
        assert meta["steps"][2]["keyword"] == "But"

    def test_auto_and_on_repeated_primary_keyword(self, fresh_story: Story):
        fresh_story.init("Auto-And across story")
        fresh_story.given("first given")
        fresh_story.when("a when in between")
        fresh_story.given("second given")
        meta = fresh_story._get_meta()
        assert meta["steps"][0]["keyword"] == "Given"
        assert meta["steps"][1]["keyword"] == "When"
        assert meta["steps"][2]["keyword"] == "And"

    def test_step_with_mode(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.given("something", mode="skip")
        meta = fresh_story._get_meta()
        assert meta["steps"][0]["mode"] == "skip"

    def test_step_before_init_raises(self, fresh_story: Story):
        with pytest.raises(RuntimeError, match="before story.init"):
            fresh_story.given("something")


class TestDocMethods:
    def test_note_before_steps_attaches_to_story(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.note("A note")
        meta = fresh_story._get_meta()
        assert len(meta["docs"]) == 1
        assert meta["docs"][0] == {"kind": "note", "text": "A note", "phase": "runtime"}
        assert "steps" not in meta

    def test_note_after_step_attaches_to_step(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.given("setup")
        fresh_story.note("Detail about setup")
        meta = fresh_story._get_meta()
        assert "docs" not in meta  # no story-level docs
        assert len(meta["steps"][0]["docs"]) == 1
        assert meta["steps"][0]["docs"][0]["kind"] == "note"

    def test_tag_doc(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.tag("important")
        meta = fresh_story._get_meta()
        assert meta["docs"][0] == {"kind": "tag", "names": ["important"], "phase": "runtime"}

    def test_tag_doc_list(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.tag(["a", "b"])
        meta = fresh_story._get_meta()
        assert meta["docs"][0]["names"] == ["a", "b"]

    def test_kv_doc(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.kv("user", "alice")
        meta = fresh_story._get_meta()
        assert meta["docs"][0] == {"kind": "kv", "label": "user", "value": "alice", "phase": "runtime"}

    def test_json_doc(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.json("payload", {"key": "value"})
        meta = fresh_story._get_meta()
        doc = meta["docs"][0]
        assert doc["kind"] == "code"
        assert doc["lang"] == "json"
        assert doc["label"] == "payload"
        assert json.loads(doc["content"]) == {"key": "value"}

    def test_code_doc(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.code("snippet", "print('hi')", lang="python")
        meta = fresh_story._get_meta()
        doc = meta["docs"][0]
        assert doc == {
            "kind": "code",
            "label": "snippet",
            "content": "print('hi')",
            "lang": "python",
            "phase": "runtime",
        }

    def test_code_doc_no_lang(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.code("snippet", "x = 1")
        meta = fresh_story._get_meta()
        doc = meta["docs"][0]
        assert "lang" not in doc

    def test_table_doc(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.table("Users", ["name", "age"], [["Alice", "30"]])
        meta = fresh_story._get_meta()
        doc = meta["docs"][0]
        assert doc["kind"] == "table"
        assert doc["columns"] == ["name", "age"]
        assert doc["rows"] == [["Alice", "30"]]

    def test_link_doc(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.link("Docs", "https://example.com")
        meta = fresh_story._get_meta()
        assert meta["docs"][0]["kind"] == "link"
        assert meta["docs"][0]["url"] == "https://example.com"

    def test_section_doc(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.section("Details", "Some **markdown**")
        meta = fresh_story._get_meta()
        assert meta["docs"][0]["kind"] == "section"
        assert meta["docs"][0]["markdown"] == "Some **markdown**"

    def test_mermaid_doc(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.mermaid("graph TD; A-->B", title="Flow")
        meta = fresh_story._get_meta()
        doc = meta["docs"][0]
        assert doc["kind"] == "mermaid"
        assert doc["code"] == "graph TD; A-->B"
        assert doc["title"] == "Flow"

    def test_mermaid_no_title(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.mermaid("graph TD; A-->B")
        meta = fresh_story._get_meta()
        assert "title" not in meta["docs"][0]

    def test_screenshot_doc(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.screenshot("/tmp/shot.png", alt="Login page")
        meta = fresh_story._get_meta()
        doc = meta["docs"][0]
        assert doc["kind"] == "screenshot"
        assert doc["path"] == "/tmp/shot.png"
        assert doc["alt"] == "Login page"

    def test_screenshot_no_alt(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.screenshot("/tmp/shot.png")
        meta = fresh_story._get_meta()
        assert "alt" not in meta["docs"][0]

    def test_custom_doc(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.custom("widget", {"color": "red"})
        meta = fresh_story._get_meta()
        doc = meta["docs"][0]
        assert doc == {
            "kind": "custom",
            "type": "widget",
            "data": {"color": "red"},
            "phase": "runtime",
        }

    def test_doc_before_init_raises(self, fresh_story: Story):
        with pytest.raises(RuntimeError, match="before story.init"):
            fresh_story.note("oops")

    def test_multiple_docs_on_step(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.given("setup")
        fresh_story.note("first")
        fresh_story.kv("key", "val")
        meta = fresh_story._get_meta()
        assert len(meta["steps"][0]["docs"]) == 2

    def test_docs_attach_to_latest_step(self, fresh_story: Story):
        fresh_story.init("Test")
        fresh_story.given("step 1")
        fresh_story.note("for step 1")
        fresh_story.when("step 2")
        fresh_story.note("for step 2")
        meta = fresh_story._get_meta()
        assert len(meta["steps"][0]["docs"]) == 1
        assert meta["steps"][0]["docs"][0]["text"] == "for step 1"
        assert len(meta["steps"][1]["docs"]) == 1
        assert meta["steps"][1]["docs"][0]["text"] == "for step 2"

    def test_inline_docs_on_step(self, fresh_story: Story):
        """Inline docs param attaches doc entries to that step (matches JS core behavior)."""
        fresh_story.init("Inline docs test")
        fresh_story.given("a step", docs=[{"kind": "note", "text": "a note", "phase": "runtime"}])
        fresh_story.given(
            "another step",
            docs=[
                {"kind": "note", "text": "second", "phase": "runtime"},
                {"kind": "kv", "label": "key", "value": "value", "phase": "runtime"},
            ],
        )
        meta = fresh_story._get_meta()
        assert len(meta["steps"][0]["docs"]) == 1
        assert meta["steps"][0]["docs"][0]["kind"] == "note"
        assert meta["steps"][0]["docs"][0]["text"] == "a note"
        assert len(meta["steps"][1]["docs"]) == 2
        assert meta["steps"][1]["docs"][0]["kind"] == "note"
        assert meta["steps"][1]["docs"][1]["kind"] == "kv"


class TestAAAAliases:
    def test_aaa_aliases_produce_correct_keywords(self, fresh_story: Story):
        fresh_story.init("AAA test")
        fresh_story.arrange("setup state")
        fresh_story.act("perform action")
        fresh_story.assert_("check result")
        meta = fresh_story._get_meta()
        assert len(meta["steps"]) == 3
        assert meta["steps"][0]["keyword"] == "Given"
        assert meta["steps"][1]["keyword"] == "When"
        assert meta["steps"][2]["keyword"] == "Then"

    def test_extra_aliases_produce_correct_keywords(self, fresh_story: Story):
        fresh_story.init("Extra aliases test")
        fresh_story.setup("initial state")
        fresh_story.context("additional context")
        fresh_story.execute("the operation")
        fresh_story.action("another action")
        fresh_story.verify("the outcome")
        meta = fresh_story._get_meta()
        assert len(meta["steps"]) == 5
        assert meta["steps"][0]["keyword"] == "Given"
        assert meta["steps"][1]["keyword"] == "And"
        assert meta["steps"][2]["keyword"] == "When"
        assert meta["steps"][3]["keyword"] == "And"
        assert meta["steps"][4]["keyword"] == "Then"


class TestFn:
    def test_fn_creates_wrapped_step(self, fresh_story: Story):
        fresh_story.init("fn test")
        called = False

        def body():
            nonlocal called
            called = True

        fresh_story.fn("Given", "a wrapped precondition", body)
        assert called
        meta = fresh_story._get_meta()
        assert len(meta["steps"]) == 1
        step = meta["steps"][0]
        assert step["keyword"] == "Given"
        assert step["text"] == "a wrapped precondition"
        assert step.get("wrapped") is True
        assert "durationMs" in step

    def test_fn_records_duration(self, fresh_story: Story):
        fresh_story.init("fn duration")
        fresh_story.fn("When", "I wait briefly", lambda: time.sleep(0.015))
        meta = fresh_story._get_meta()
        assert meta["steps"][0]["durationMs"] >= 10

    def test_fn_propagates_exceptions(self, fresh_story: Story):
        fresh_story.init("fn error")

        with pytest.raises(ValueError, match="boom"):
            fresh_story.fn("Then", "it fails", lambda: (_ for _ in ()).throw(ValueError("boom")))

    def test_fn_records_duration_on_error(self, fresh_story: Story):
        fresh_story.init("fn error duration")

        def failing_body():
            time.sleep(0.01)
            raise RuntimeError("fail")

        with pytest.raises(RuntimeError):
            fresh_story.fn("Then", "it fails", failing_body)

        meta = fresh_story._get_meta()
        assert meta["steps"][0]["durationMs"] >= 5

    def test_fn_auto_and_conversion(self, fresh_story: Story):
        fresh_story.init("fn auto-and")
        fresh_story.given("a text-only step")
        fresh_story.fn("Given", "a wrapped step", lambda: None)
        meta = fresh_story._get_meta()
        assert meta["steps"][0]["keyword"] == "Given"
        assert meta["steps"][1]["keyword"] == "And"
        assert meta["steps"][1].get("wrapped") is True

    def test_fn_returns_body_result(self, fresh_story: Story):
        fresh_story.init("fn return")
        result = fresh_story.fn("When", "I compute", lambda: 42)
        assert result == 42

    def test_fn_integration_with_markers(self, fresh_story: Story):
        fresh_story.init("fn + markers")
        fresh_story.given("a text-only precondition")
        fresh_story.fn("When", "I perform action", lambda: None)
        fresh_story.then("a text-only assertion")
        fresh_story.fn("Then", "the wrapped assertion", lambda: None)
        meta = fresh_story._get_meta()
        assert len(meta["steps"]) == 4
        assert meta["steps"][0].get("wrapped") is None or meta["steps"][0].get("wrapped") is False
        assert meta["steps"][1].get("wrapped") is True
        assert meta["steps"][2].get("wrapped") is None or meta["steps"][2].get("wrapped") is False
        assert meta["steps"][3].get("wrapped") is True


class TestExpect:
    def test_expect_creates_then_step(self, fresh_story: Story):
        fresh_story.init("expect test")
        called = False

        def body():
            nonlocal called
            called = True

        fresh_story.expect("the result is correct", body)
        assert called
        meta = fresh_story._get_meta()
        assert len(meta["steps"]) == 1
        step = meta["steps"][0]
        assert step["keyword"] == "Then"
        assert step["text"] == "the result is correct"
        assert step.get("wrapped") is True
        assert "durationMs" in step

    def test_expect_propagates_exceptions(self, fresh_story: Story):
        fresh_story.init("expect error")

        with pytest.raises(AssertionError):
            fresh_story.expect("it should fail", lambda: (_ for _ in ()).throw(AssertionError("wrong")))

    def test_expect_returns_body_result(self, fresh_story: Story):
        fresh_story.init("expect return")
        result = fresh_story.expect("check value", lambda: True)
        assert result is True


class TestStepTiming:
    def test_start_timer_end_timer_sets_duration_ms(self, fresh_story: Story):
        fresh_story.init("Timing test")
        fresh_story.given("a step")
        token = fresh_story.start_timer()
        time.sleep(0.015)  # 15ms
        fresh_story.end_timer(token)
        meta = fresh_story._get_meta()
        assert meta["steps"][0]["durationMs"] >= 10

    def test_double_end_timer_noop(self, fresh_story: Story):
        fresh_story.init("Double end test")
        fresh_story.given("a step")
        token = fresh_story.start_timer()
        time.sleep(0.01)
        fresh_story.end_timer(token)
        first = fresh_story._get_meta()["steps"][0]["durationMs"]
        time.sleep(0.02)
        fresh_story.end_timer(token)  # no-op
        second = fresh_story._get_meta()["steps"][0]["durationMs"]
        assert first == second

    def test_orphaned_timer_no_duration(self, fresh_story: Story):
        fresh_story.init("Orphaned test")
        fresh_story.given("a step")
        fresh_story.start_timer()
        meta = fresh_story._get_meta()
        assert "durationMs" not in meta["steps"][0]

"""Integration tests for the pytest plugin using pytester."""

import json
import os
import pathlib

import pytest

pytest_plugins = ["pytester"]

# Common args to disable conflicting third-party plugins in the subprocess
_DISABLE_PLUGINS = ["-p", "no:logfire", "-p", "no:langsmith_plugin", "-p", "no:anyio"]


@pytest.fixture()
def sample_test_file():
    """Return source code for a test file that uses the story API."""
    return """
from executable_stories import story

def test_with_story():
    story.init("User adds item to cart", tags=["e2e"])
    story.given("a logged-in user")
    story.when("they add a product to the cart")
    story.then("the cart count increases by 1")
    assert True

def test_without_story():
    assert 1 + 1 == 2

def test_failing():
    story.init("Failing scenario")
    story.given("something")
    assert False, "intentional failure"

def test_skipped():
    import pytest
    pytest.skip("not ready")
"""


class TestPluginOutput:
    def test_produces_json(self, pytester, sample_test_file):
        pytester.makepyfile(test_sample=sample_test_file)

        result = pytester.runpytest_subprocess(*_DISABLE_PLUGINS)
        result.assert_outcomes(passed=2, failed=1, skipped=1)

        output_path = pytester.path / ".executable-stories" / "raw-run.json"
        assert output_path.exists(), f"Expected output at {output_path}"

        raw_run = json.loads(output_path.read_text())

        assert raw_run["schemaVersion"] == 1
        assert raw_run["projectRoot"]
        assert isinstance(raw_run["testCases"], list)
        assert len(raw_run["testCases"]) == 4
        assert "startedAtMs" in raw_run
        assert "finishedAtMs" in raw_run

    def test_emits_schema_pointer(self, pytester, sample_test_file):
        """The $schema pointer lets editors validate the file as it is written,
        and `executable-stories doctor` reports whether it is present."""
        pytester.makepyfile(test_sample=sample_test_file)

        pytester.runpytest_subprocess(*_DISABLE_PLUGINS)

        output_path = pytester.path / ".executable-stories" / "raw-run.json"
        raw_run = json.loads(output_path.read_text())

        assert raw_run["$schema"].endswith("raw-run.schema.json")
        # It must lead the file so editors pick it up immediately.
        assert next(iter(raw_run)) == "$schema"

    def test_prints_next_command(self, pytester, sample_test_file):
        """Non-JS adapters hand off to the CLI, so the run must say what to do
        with the file it just wrote."""
        pytester.makepyfile(test_sample=sample_test_file)

        result = pytester.runpytest_subprocess(*_DISABLE_PLUGINS)

        stderr = "\n".join(result.errlines)
        assert "executable-stories format" in stderr
        assert "--format html" in stderr

    def test_next_command_silenced_by_quiet_env(self, pytester, sample_test_file, monkeypatch):
        """CI logs shouldn't carry the hint on every run."""
        pytester.makepyfile(test_sample=sample_test_file)
        monkeypatch.setenv("EXECUTABLE_STORIES_QUIET", "1")

        result = pytester.runpytest_subprocess(*_DISABLE_PLUGINS)

        assert "next: executable-stories format" not in "\n".join(result.errlines)

    def test_status_mapping(self, pytester, sample_test_file):
        pytester.makepyfile(test_sample=sample_test_file)

        pytester.runpytest_subprocess(*_DISABLE_PLUGINS)

        output_path = pytester.path / ".executable-stories" / "raw-run.json"
        raw_run = json.loads(output_path.read_text())

        statuses = {tc["title"]: tc["status"] for tc in raw_run["testCases"]}
        assert statuses["test_with_story"] == "pass"
        assert statuses["test_without_story"] == "pass"
        assert statuses["test_failing"] == "fail"
        assert statuses["test_skipped"] == "skip"

    def test_story_metadata_included(self, pytester, sample_test_file):
        pytester.makepyfile(test_sample=sample_test_file)

        pytester.runpytest_subprocess(*_DISABLE_PLUGINS)

        output_path = pytester.path / ".executable-stories" / "raw-run.json"
        raw_run = json.loads(output_path.read_text())

        story_test = next(tc for tc in raw_run["testCases"] if tc["title"] == "test_with_story")
        assert "story" in story_test
        story_meta = story_test["story"]
        assert story_meta["scenario"] == "User adds item to cart"
        assert story_meta["tags"] == ["e2e"]
        assert len(story_meta["steps"]) == 3
        assert story_meta["steps"][0]["keyword"] == "Given"
        assert story_meta["steps"][0]["text"] == "a logged-in user"

    def test_no_story_for_plain_test(self, pytester, sample_test_file):
        pytester.makepyfile(test_sample=sample_test_file)

        pytester.runpytest_subprocess(*_DISABLE_PLUGINS)

        output_path = pytester.path / ".executable-stories" / "raw-run.json"
        raw_run = json.loads(output_path.read_text())

        plain_test = next(tc for tc in raw_run["testCases"] if tc["title"] == "test_without_story")
        assert "story" not in plain_test

    def test_error_info_on_failure(self, pytester, sample_test_file):
        pytester.makepyfile(test_sample=sample_test_file)

        pytester.runpytest_subprocess(*_DISABLE_PLUGINS)

        output_path = pytester.path / ".executable-stories" / "raw-run.json"
        raw_run = json.loads(output_path.read_text())

        failed_test = next(tc for tc in raw_run["testCases"] if tc["title"] == "test_failing")
        assert "error" in failed_test
        assert "message" in failed_test["error"]

    def test_custom_output_path(self, pytester, tmp_path, monkeypatch):
        pytester.makepyfile(
            test_simple="""
def test_pass():
    assert True
"""
        )

        custom_path = str(tmp_path / "custom-output.json")
        monkeypatch.setenv("EXECUTABLE_STORIES_OUTPUT", custom_path)
        pytester.runpytest_subprocess(*_DISABLE_PLUGINS)

        assert pathlib.Path(custom_path).exists()
        raw_run = json.loads(pathlib.Path(custom_path).read_text())
        assert raw_run["schemaVersion"] == 1

    def test_no_output_when_no_tests(self, pytester):
        pytester.makepyfile(test_empty="# no tests here")

        pytester.runpytest_subprocess(*_DISABLE_PLUGINS)

        output_path = pytester.path / ".executable-stories" / "raw-run.json"
        assert not output_path.exists()

    def test_step_events_in_output_when_steps_have_duration(self, pytester):
        """When a test uses start_timer/end_timer, stepEvents appears in the test case."""
        pytester.makepyfile(
            test_timed="""
from executable_stories import story
import time

def test_with_timed_step():
    story.init("Timed scenario")
    story.given("first step")
    token = story.start_timer()
    time.sleep(0.02)
    story.end_timer(token)
    story.then("second step")
    assert True
"""
        )
        pytester.runpytest_subprocess(*_DISABLE_PLUGINS)

        output_path = pytester.path / ".executable-stories" / "raw-run.json"
        raw_run = json.loads(output_path.read_text())
        tc = next(t for t in raw_run["testCases"] if t["title"] == "test_with_timed_step")
        assert "stepEvents" in tc
        assert len(tc["stepEvents"]) == 1
        assert tc["stepEvents"][0]["index"] == 0
        assert tc["stepEvents"][0]["title"] == "first step"
        assert tc["stepEvents"][0]["durationMs"] >= 15


class TestPlannedScenarios:
    def test_planned_records_todo_status(self, pytester):
        pytester.makepyfile(
            test_planned="""
from executable_stories import story

def test_checkout_blocks_suspended_account():
    story.planned("checkout is blocked for a suspended account", tags=["checkout"])

def test_real_story():
    story.init("cart totals include quantity")
    story.given("a cart with two of one item")
    story.then("the total is doubled")
"""
        )

        result = pytester.runpytest_subprocess(*_DISABLE_PLUGINS)
        # The planned test itself passes; only its recorded status differs.
        result.assert_outcomes(passed=2)

        raw_run = json.loads(
            (pytester.path / ".executable-stories" / "raw-run.json").read_text()
        )
        by_status = {tc["status"]: tc for tc in raw_run["testCases"]}

        assert set(by_status) == {"todo", "pass"}
        planned = by_status["todo"]
        assert planned["story"]["scenario"] == "checkout is blocked for a suspended account"
        # The adapter omits empty fields; the ACL fills steps in downstream.
        assert planned["story"].get("steps", []) == []
        assert planned["story"]["tags"] == ["checkout"]

    def test_a_failure_after_planned_is_still_a_failure(self, pytester):
        pytester.makepyfile(
            test_planned_fail="""
from executable_stories import story

def test_declared_then_broke():
    story.planned("not built yet")
    raise AssertionError("something after the declaration blew up")

def test_ordinary_story():
    story.init("built and passing")
    story.then("it passes")
"""
        )

        result = pytester.runpytest_subprocess(*_DISABLE_PLUGINS)
        result.assert_outcomes(passed=1, failed=1)

        raw_run = json.loads(
            (pytester.path / ".executable-stories" / "raw-run.json").read_text()
        )
        statuses = {tc["title"]: tc["status"] for tc in raw_run["testCases"]}
        # Reporting this as "planned" would hide a broken test behind a plan.
        assert statuses["test_declared_then_broke"] == "fail"
        assert statuses["test_ordinary_story"] == "pass"

    def test_planned_does_not_leak_into_the_next_test(self, pytester):
        pytester.makepyfile(
            test_leak="""
from executable_stories import story

def test_planned_one():
    story.planned("not built yet")

def test_ordinary_story():
    story.init("built and passing")
    story.then("it passes")
"""
        )

        result = pytester.runpytest_subprocess(*_DISABLE_PLUGINS)
        result.assert_outcomes(passed=2)

        raw_run = json.loads(
            (pytester.path / ".executable-stories" / "raw-run.json").read_text()
        )
        statuses = sorted(tc["status"] for tc in raw_run["testCases"])
        assert statuses == ["pass", "todo"]

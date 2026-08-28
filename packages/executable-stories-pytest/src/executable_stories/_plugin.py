"""pytest plugin that hooks into test lifecycle to capture BDD story data.

Registered via the ``pytest11`` entry point in pyproject.toml.
"""

from __future__ import annotations

import os
import sys
import time
import traceback
from typing import Any

import pytest

from executable_stories._collector import _collector
from executable_stories._json_writer import write_raw_run
from executable_stories._story_api import story

#: Published raw-run schema, emitted as ``$schema`` so editors validate the
#: output file as the adapter writes it.
SCHEMA_URL = "https://executable-stories.dev/schemas/raw-run.schema.json"

# ── CI detection ──────────────────────────────────────────────────


def _detect_ci() -> dict[str, Any] | None:
    if os.environ.get("GITHUB_ACTIONS") == "true":
        ci: dict[str, Any] = {"name": "github"}
        build_num = os.environ.get("GITHUB_RUN_NUMBER")
        if build_num:
            ci["buildNumber"] = build_num
        server = os.environ.get("GITHUB_SERVER_URL")
        repo = os.environ.get("GITHUB_REPOSITORY")
        run_id = os.environ.get("GITHUB_RUN_ID")
        if server and repo and run_id:
            ci["url"] = f"{server}/{repo}/actions/runs/{run_id}"
        return ci
    if os.environ.get("CIRCLECI") == "true":
        ci = {"name": "circleci"}
        build_num = os.environ.get("CIRCLE_BUILD_NUM")
        if build_num:
            ci["buildNumber"] = build_num
        url = os.environ.get("CIRCLE_BUILD_URL")
        if url:
            ci["url"] = url
        return ci
    if os.environ.get("JENKINS_URL"):
        ci = {"name": "jenkins"}
        build_num = os.environ.get("BUILD_NUMBER")
        if build_num:
            ci["buildNumber"] = build_num
        url = os.environ.get("BUILD_URL")
        if url:
            ci["url"] = url
        return ci
    if os.environ.get("TRAVIS") == "true":
        ci = {"name": "travis"}
        build_num = os.environ.get("TRAVIS_BUILD_NUMBER")
        if build_num:
            ci["buildNumber"] = build_num
        url = os.environ.get("TRAVIS_BUILD_WEB_URL")
        if url:
            ci["url"] = url
        return ci
    if os.environ.get("GITLAB_CI") == "true":
        ci = {"name": "gitlab"}
        build_num = os.environ.get("CI_PIPELINE_IID")
        if build_num:
            ci["buildNumber"] = build_num
        url = os.environ.get("CI_PIPELINE_URL")
        if url:
            ci["url"] = url
        return ci
    if os.environ.get("CI") == "true":
        return {"name": "ci"}
    return None


# ── Session-level timestamps ───────────────────────────────────────

_started_at_ms: float = 0.0


def pytest_sessionstart(session: pytest.Session) -> None:
    global _started_at_ms
    _started_at_ms = time.time() * 1000
    _collector.clear()


# ── Per-test hooks ─────────────────────────────────────────────────

# We store per-test start times keyed by node id.
_test_start_times: dict[str, float] = {}


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_call(item: pytest.Item) -> Any:
    """Wrap test execution to set up / tear down the story context."""
    _test_start_times[item.nodeid] = time.time() * 1000
    yield
    # Story context is cleared after report is built (in makereport)


_STATUS_MAP = {
    "passed": "pass",
    "failed": "fail",
    "skipped": "skip",
}


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo[None]) -> Any:
    """Capture test result on the 'call' phase and record it."""
    outcome = yield
    report: pytest.TestReport = outcome.get_result()

    if report.when != "call":
        return

    # Build the test case dict
    start_ms = _test_start_times.pop(item.nodeid, 0.0)
    now_ms = time.time() * 1000
    duration_ms = now_ms - start_ms if start_ms else 0.0

    # Status mapping. A planned declaration only counts when the test itself
    # came out clean: code after story.planned() can still fail, and reporting
    # that failure as "planned" would hide it.
    if story.is_planned() and report.outcome == "passed":
        status = "todo"
    elif hasattr(report, "wasxfail"):
        status = "skip"
    else:
        status = _STATUS_MAP.get(report.outcome, "unknown")

    # Retry info from pytest-rerunfailures (if available)
    rerun = getattr(item, "execution_count", None)
    retry = (rerun - 1) if rerun is not None and rerun > 0 else 0
    reruns_count = getattr(item.session.config, "_rerun_count", None)
    retries = reruns_count if reruns_count is not None else 0

    test_case: dict[str, Any] = {
        "status": status,
        "externalId": item.nodeid,
        "title": item.name,
        "durationMs": round(duration_ms, 2),
        "retry": retry,
        "retries": retries,
    }

    # Source file info
    try:
        fspath = str(item.fspath)
        if fspath:
            test_case["sourceFile"] = fspath
        if item.location and item.location[1] is not None:
            test_case["sourceLine"] = item.location[1] + 1  # 0-based to 1-based
    except Exception:
        pass

    # Error info
    if report.failed and report.longrepr:
        error: dict[str, str] = {}
        if isinstance(report.longrepr, tuple):
            error["message"] = str(report.longrepr[2])
            error["stack"] = f"{report.longrepr[0]}:{report.longrepr[1]}"
        else:
            repr_str = str(report.longrepr)
            error["message"] = repr_str
            error["stack"] = repr_str
        test_case["error"] = error

    # Story metadata
    story_meta = story._get_meta()
    if story_meta is not None:
        test_case["story"] = story_meta
        # Build stepEvents from steps with durationMs
        step_events: list[dict[str, Any]] = []
        if "steps" in story_meta:
            for i, step in enumerate(story_meta["steps"]):
                if "durationMs" in step:
                    step_events.append(
                        {
                            "index": i,
                            "title": step["text"],
                            "durationMs": step["durationMs"],
                        }
                    )
        if step_events:
            test_case["stepEvents"] = step_events

    # Attachments
    attachments = story._get_attachments()
    if attachments:
        test_case["attachments"] = attachments

    _collector.record(test_case)

    # Clear story context for next test
    story._clear()


# ── Session finish — write output ──────────────────────────────────


def _run_scope(config: Any) -> str | None:
    """How much of each source file this run covered.

    ``"filtered"`` when either selector pytest narrows a run with is set (``-k``
    keyword or ``-m`` marker expression), ``"full"`` when both were inspected and
    neither was, and ``None`` when there is no option object to inspect — some
    entry points build a config without one. ``None`` means unknown, and a
    consumer keeps what an unknown-scope run did not report rather than retiring
    it on a guess.
    """
    option = getattr(config, "option", None)
    if option is None:
        return None
    if bool(getattr(option, "keyword", "")) or bool(getattr(option, "markexpr", "")):
        return "filtered"
    return "full"


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    test_cases = _collector.get_all()
    if not test_cases:
        return

    finished_at_ms = time.time() * 1000

    raw_run: dict[str, Any] = {
        # $schema first so editors pick it up and validate the file as it is
        # written; `executable-stories doctor` also reports its presence.
        "$schema": SCHEMA_URL,
        "schemaVersion": 1,
        "testCases": test_cases,
        "projectRoot": str(session.config.rootdir),  # type: ignore[attr-defined]
        "startedAtMs": round(_started_at_ms, 2),
        "finishedAtMs": round(finished_at_ms, 2),
    }

    features = _collector.get_features()
    if features:
        raw_run["features"] = features

    ci = _detect_ci()
    if ci is not None:
        raw_run["ci"] = ci

    # Absent means pytest gave us nothing to inspect; consumers then keep what
    # this run did not report rather than retiring it on a guess.
    scope = _run_scope(session.config)
    if scope is not None:
        raw_run["runScope"] = scope

    output_path = os.environ.get(
        "EXECUTABLE_STORIES_OUTPUT",
        os.path.join(str(session.config.rootdir), ".executable-stories", "raw-run.json"),  # type: ignore[attr-defined]
    )

    write_raw_run(raw_run, output_path)
    _print_next_step(output_path)


def _print_next_step(output_path: str) -> None:
    """Tell the user how to turn the run JSON into a report.

    The JS adapters render reports in-process, so their users never need to know
    the CLI exists. pytest hands off to the CLI instead, so without this the run
    ends with a file and no indication of what to do with it. stderr keeps piped
    output clean; EXECUTABLE_STORIES_QUIET silences it in CI.
    """
    if os.environ.get("EXECUTABLE_STORIES_QUIET"):
        return
    print(f"\nexecutable-stories: wrote {output_path}", file=sys.stderr)
    print(
        f"  next: executable-stories format {output_path} --format html",
        file=sys.stderr,
    )

"""pytest plugin that hooks into test lifecycle to capture BDD story data.

Registered via the ``pytest11`` entry point in pyproject.toml.
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from importlib.metadata import PackageNotFoundError, version
from typing import Any

import pytest

from executable_stories._collector import _collector
from executable_stories._json_writer import write_raw_run
from executable_stories._story_api import story

#: Published raw-run schema, emitted as ``$schema`` so editors validate the
#: output file as the adapter writes it.
SCHEMA_URL = "https://executable-stories.dev/schemas/raw-run.schema.json"

#: How long to wait for `git rev-parse` before giving up on the commit sha.
GIT_TIMEOUT_SECONDS = 5

#: Exit statuses that mean pytest got through everything it selected. Anything
#: else — an interrupt, an internal error, a usage error — left files it had
#: already visited only partly run.
_COMPLETED_EXIT_STATUSES = (int(pytest.ExitCode.OK), int(pytest.ExitCode.TESTS_FAILED))

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


# ── Session state ──────────────────────────────────────────────────

_started_at_ms: float = 0.0

#: Every file this run executed a test in, so a file emptied of scenarios is
#: distinguishable from one that never ran.
_covered_files: set[str] = set()

#: Files this run cannot speak for, so a consumer keeps what they last
#: documented rather than treating the run as authoritative.
_incomplete_files: set[str] = set()


def pytest_sessionstart(session: pytest.Session) -> None:
    global _started_at_ms
    _started_at_ms = time.time() * 1000
    _covered_files.clear()
    _incomplete_files.clear()
    _collector.clear()


def pytest_collectreport(report: pytest.CollectReport) -> None:
    """A module that failed to import reports none of the stories inside it."""
    if report.failed:
        source_file = report.nodeid.split("::")[0]
        if source_file:
            _incomplete_files.add(source_file)


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


def _record_file_inventory(report: pytest.TestReport, source_file: str, has_story: bool) -> None:
    """Note what this run can and cannot say about ``source_file``."""
    if report.skipped:
        # Scenario identity comes from the title the body passes to story.init,
        # and a body that never ran has none to give.
        _incomplete_files.add(source_file)
        return
    if report.when != "call":
        if report.failed:
            _incomplete_files.add(source_file)
        return
    _covered_files.add(source_file)
    if report.failed and not has_story:
        # It broke before it declared anything, so its scenario is missing
        # because the run failed rather than because someone deleted it.
        _incomplete_files.add(source_file)


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo[None]) -> Any:
    """Capture test result on the 'call' phase and record it."""
    outcome = yield
    report: pytest.TestReport = outcome.get_result()

    story_meta = story._get_meta() if report.when == "call" else None

    # The file the item was collected from, which is pytest's own
    # `report.fspath`. Not `item.location[0]`: that is where the test function
    # was defined, so an inherited method would be filed under its base class.
    source_file = item.nodeid.split("::")[0]
    if source_file:
        _record_file_inventory(report, source_file, story_meta is not None)

    if report.when != "call":
        return

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

    if source_file:
        test_case["sourceFile"] = source_file
    # Only when the body lives in the file it was collected from: an inherited
    # test's line points into another module.
    if item.location and item.location[1] is not None and item.location[0] == source_file:
        test_case["sourceLine"] = item.location[1] + 1  # 0-based to 1-based

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

    if story_meta is not None:
        test_case["story"] = story_meta
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

    attachments = story._get_attachments()
    if attachments:
        test_case["attachments"] = attachments

    _collector.record(test_case)

    story._clear()


# ── Session finish — write output ──────────────────────────────────


def _run_scope(config: Any) -> str | None:
    """How much of each source file this run covered.

    ``"filtered"`` when pytest was pointed at part of a file rather than all of
    it — ``-k``, ``-m``, ``--deselect``, ``--last-failed``, or a node id naming
    a single test — and ``"full"`` when none of those applied. ``None`` when
    there is no option object to inspect: some entry points build a config
    without one. ``None`` means unknown, and a consumer keeps what an
    unknown-scope run did not report rather than retiring it on a guess.
    """
    option = getattr(config, "option", None)
    if option is None:
        return None
    if bool(getattr(option, "keyword", "")) or bool(getattr(option, "markexpr", "")):
        return "filtered"
    if getattr(option, "deselect", None) or getattr(option, "lf", False):
        return "filtered"
    # `pytest tests/test_cart.py::test_totals` runs one test out of a file, so
    # the file's other scenarios simply were not part of this run.
    if any("::" in str(arg) for arg in getattr(option, "file_or_dir", None) or []):
        return "filtered"
    return "full"


def _relative_source(source: str, project_root: str) -> str:
    """``source`` relative to the project root, in POSIX form."""
    try:
        relative = os.path.relpath(source, project_root)
    except ValueError:  # a different drive on Windows
        return source
    if relative.startswith(".."):
        return source
    return relative.replace(os.sep, "/")


def _git_sha(project_root: str) -> str | None:
    """The commit this run describes, so a report says which code it documents.

    CI exports it, and asking Git is the fallback. The call is bounded: a Git
    that hangs would otherwise hold up the end of the test run.
    """
    for key in ("GITHUB_SHA", "GIT_COMMIT", "CI_COMMIT_SHA"):
        value = os.environ.get(key)
        if value:
            return value
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=project_root,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=GIT_TIMEOUT_SECONDS,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return None
    return result.stdout.strip() or None


def _package_version() -> str | None:
    """Version of this adapter, so a report says what produced it."""
    try:
        return version("executable-stories-pytest")
    except PackageNotFoundError:
        return None


def _resolve_output_path(project_root: str) -> str:
    """Where the run file lands.

    A relative ``EXECUTABLE_STORIES_OUTPUT`` is resolved against the project
    root rather than the working directory, so the file lands where the docs
    say it does however pytest was invoked. An absolute one passes through.
    """
    declared = os.environ.get("EXECUTABLE_STORIES_OUTPUT")
    if not declared:
        return os.path.join(project_root, ".executable-stories", "raw-run.json")
    return os.path.join(project_root, declared)


def _stopped_early(session: pytest.Session, exitstatus: int) -> bool:
    """Whether the run ended before it got through everything it selected.

    ``-x`` and ``--maxfail`` set a flag on the session. Ctrl-C, an internal
    error and a usage error do not, and only the exit status shows them. Either
    way a file this run visited was left partly run, so the run cannot be
    treated as the complete contents of that file.
    """
    if bool(getattr(session, "shouldstop", False)) or bool(getattr(session, "shouldfail", False)):
        return True
    try:
        return int(exitstatus) not in _COMPLETED_EXIT_STATUSES
    except (TypeError, ValueError):
        return True


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    test_cases = _collector.get_all()
    covered = sorted(_covered_files)
    incomplete = sorted(_incomplete_files)
    # A run that reached files but produced no scenario still has something to
    # say: those files are now empty, and only a written run retires them. So
    # does one that broke before reaching anything, which keeps them instead.
    if not test_cases and not covered and not incomplete:
        return

    finished_at_ms = time.time() * 1000
    project_root = str(session.config.rootpath)

    raw_run: dict[str, Any] = {
        # $schema first so editors pick it up and validate the file as it is
        # written; `executable-stories doctor` also reports its presence.
        "$schema": SCHEMA_URL,
        "schemaVersion": 1,
        "testCases": test_cases,
        "projectRoot": project_root,
        "startedAtMs": round(_started_at_ms, 2),
        "finishedAtMs": round(finished_at_ms, 2),
    }

    package_version = _package_version()
    if package_version is not None:
        raw_run["packageVersion"] = package_version

    git_sha = _git_sha(project_root)
    if git_sha is not None:
        raw_run["gitSha"] = git_sha

    features = _collector.get_features()
    if features:
        # Declarations run at import time, where the stack is the only source
        # of the module path, so they arrive absolute.
        for feature in features:
            declared_in = feature.get("sourceFile")
            if declared_in:
                feature["sourceFile"] = _relative_source(declared_in, project_root)
        raw_run["features"] = features

    ci = _detect_ci()
    if ci is not None:
        raw_run["ci"] = ci

    # Absent means pytest gave us nothing to inspect; consumers then keep what
    # this run did not report rather than retiring it on a guess.
    scope = _run_scope(session.config)
    if scope == "full" and _stopped_early(session, exitstatus):
        scope = "filtered"
    if scope is not None:
        raw_run["runScope"] = scope

    if covered:
        raw_run["coveredSourceFiles"] = covered

    if incomplete:
        raw_run["incompleteSourceFiles"] = incomplete

    output_path = _resolve_output_path(project_root)

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

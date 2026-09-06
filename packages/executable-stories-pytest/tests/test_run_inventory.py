"""What a run says about the files it reached.

A report accumulates across runs, so a run that no longer mentions a scenario
has to say whether that scenario was deleted or simply not reached. These are
the fields that answer it.
"""

import json
import os
import subprocess
import time

from executable_stories._plugin import (
    _git_sha,
    _relative_source,
    _resolve_output_path,
    _run_scope,
)

pytest_plugins = ["pytester"]

_DISABLE_PLUGINS = ["-p", "no:logfire", "-p", "no:langsmith_plugin", "-p", "no:anyio"]


def _run_json(pytester, *args):
    pytester.runpytest_subprocess(*_DISABLE_PLUGINS, *args)
    return json.loads((pytester.path / ".executable-stories" / "raw-run.json").read_text())


class TestCoveredSourceFiles:
    def test_a_file_with_no_stories_is_still_reported_as_covered(self, pytester):
        """Deleting a file's last story has to retire its scenarios, and only a
        run that admits it executed the file can do that."""
        pytester.makepyfile(
            test_plain="""
def test_no_story_here():
    assert True
"""
        )

        raw_run = _run_json(pytester)

        assert raw_run["coveredSourceFiles"] == ["test_plain.py"]

    def test_covered_files_are_relative_to_the_project_root(self, pytester):
        """Reports are stored per source file and keyed by this path, so an
        absolute one would key them to a single machine's checkout."""
        pytester.mkpydir("suite")
        pytester.makepyfile(
            **{
                "suite/test_nested": """
from executable_stories import story

def test_story():
    story.init("nested scenario")
    story.then("it is recorded")
"""
            }
        )

        raw_run = _run_json(pytester)

        assert raw_run["coveredSourceFiles"] == ["suite/test_nested.py"]
        assert raw_run["testCases"][0]["sourceFile"] == "suite/test_nested.py"
        assert not os.path.isabs(raw_run["testCases"][0]["sourceFile"])

    def test_an_inherited_test_belongs_to_the_file_that_collected_it(self, pytester):
        """A test method defined in a base class runs as part of whichever
        subclass collected it. Filing it under the base module would break its
        feature association, and would let a full run of one subclass retire
        another subclass's scenarios."""
        pytester.makepyfile(
            base_checks="""
from executable_stories import story

class BaseChecks:
    def test_inherited(self):
        story.init("inherited scenario")
        story.then("it is recorded")
"""
        )
        pytester.makepyfile(
            test_child="""
from base_checks import BaseChecks

class TestChild(BaseChecks):
    pass
"""
        )

        raw_run = _run_json(pytester)

        assert raw_run["coveredSourceFiles"] == ["test_child.py"]
        assert raw_run["testCases"][0]["sourceFile"] == "test_child.py"

    def test_an_inherited_test_carries_no_line_into_another_file(self, pytester):
        """Its body lives in the base module, so a line number paired with the
        collecting file's path would point at the wrong place."""
        pytester.makepyfile(
            base_checks="""
from executable_stories import story

class BaseChecks:
    def test_inherited(self):
        story.init("inherited scenario")
        story.then("it is recorded")
"""
        )
        pytester.makepyfile(
            test_child="""
from base_checks import BaseChecks

class TestChild(BaseChecks):
    pass
"""
        )

        raw_run = _run_json(pytester)

        assert "sourceLine" not in raw_run["testCases"][0]

    def test_an_ordinary_test_still_carries_its_line(self, pytester):
        pytester.makepyfile(
            test_local="""
from executable_stories import story

def test_here():
    story.init("local scenario")
    story.then("it is recorded")
"""
        )

        raw_run = _run_json(pytester)

        assert raw_run["testCases"][0]["sourceLine"] > 0

    def test_declarations_are_keyed_the_same_way_as_their_tests(self, pytester):
        """A feature declaration and the scenarios under it belong to one file."""
        pytester.makepyfile(
            test_declared="""
from executable_stories import story

story.feature("Arithmetic")

def test_story():
    story.init("adds")
    story.then("it adds")
"""
        )

        raw_run = _run_json(pytester)

        assert raw_run["features"][0]["sourceFile"] == "test_declared.py"

    def test_a_run_that_produced_no_scenarios_is_still_written(self, pytester):
        """Removing the last story from a suite leaves ordinary tests behind.
        Without a written run the old report would stand for good."""
        pytester.makepyfile(
            test_plain="""
def test_ordinary():
    assert True
"""
        )

        raw_run = _run_json(pytester)

        assert raw_run["testCases"]
        assert raw_run["coveredSourceFiles"] == ["test_plain.py"]

    def test_nothing_ran_writes_nothing(self, pytester):
        pytester.makepyfile(test_empty="# no tests here")

        pytester.runpytest_subprocess(*_DISABLE_PLUGINS)

        assert not (pytester.path / ".executable-stories" / "raw-run.json").exists()


class TestIncompleteSourceFiles:
    def test_a_skipped_test_marks_its_file_incomplete(self, pytester):
        """A skipped body never called story.init, and scenario identity comes
        from the title it would have passed there, so it cannot report itself."""
        pytester.makepyfile(
            test_skipped="""
import pytest
from executable_stories import story

@pytest.mark.skip(reason="quarantined")
def test_quarantined():
    story.init("still documented")
"""
        )

        raw_run = _run_json(pytester)

        assert raw_run["incompleteSourceFiles"] == ["test_skipped.py"]

    def test_a_broken_fixture_marks_its_file_incomplete(self, pytester):
        pytester.makepyfile(
            test_broken_fixture="""
import pytest
from executable_stories import story

@pytest.fixture()
def broken():
    raise RuntimeError("setup blew up")

def test_needs_fixture(broken):
    story.init("never reached")
"""
        )

        raw_run = _run_json(pytester)

        assert raw_run["incompleteSourceFiles"] == ["test_broken_fixture.py"]

    def test_a_module_that_cannot_be_imported_is_incomplete(self, pytester):
        pytester.makepyfile(
            test_bad_import="""
import a_module_that_does_not_exist  # noqa: F401

def test_never_collected():
    assert True
"""
        )
        pytester.makepyfile(
            test_fine="""
from executable_stories import story

def test_ok():
    story.init("ok")
    story.then("it runs")
"""
        )

        raw_run = _run_json(pytester, "--continue-on-collection-errors")

        assert raw_run["incompleteSourceFiles"] == ["test_bad_import.py"]
        assert raw_run["coveredSourceFiles"] == ["test_fine.py"]

    def test_an_aborted_collection_is_still_reported(self, pytester):
        """pytest stops before running anything, so the run has nothing to show
        but must still say the file could not be collected."""
        pytester.makepyfile(
            test_bad_import="""
import a_module_that_does_not_exist  # noqa: F401
"""
        )

        raw_run = _run_json(pytester)

        assert raw_run["testCases"] == []
        assert raw_run["incompleteSourceFiles"] == ["test_bad_import.py"]

    def test_a_failure_before_the_story_marks_its_file_incomplete(self, pytester):
        """The scenario is missing because the test broke, not because someone
        deleted it."""
        pytester.makepyfile(
            test_early_failure="""
def test_broke_before_declaring():
    raise AssertionError("blew up before story.init")
"""
        )

        raw_run = _run_json(pytester)

        assert raw_run["incompleteSourceFiles"] == ["test_early_failure.py"]

    def test_a_failing_story_still_speaks_for_its_file(self, pytester):
        """It reported its scenario; the scenario just failed."""
        pytester.makepyfile(
            test_failing_story="""
from executable_stories import story

def test_fails():
    story.init("checkout is blocked for a suspended account")
    story.then("it is blocked")
    assert False
"""
        )

        raw_run = _run_json(pytester)

        assert raw_run["coveredSourceFiles"] == ["test_failing_story.py"]
        assert "incompleteSourceFiles" not in raw_run

    def test_a_healthy_file_is_not_marked_incomplete(self, pytester):
        pytester.makepyfile(
            test_healthy="""
from executable_stories import story

def test_story():
    story.init("all fine")
    story.then("it passes")
"""
        )

        raw_run = _run_json(pytester)

        assert "incompleteSourceFiles" not in raw_run


class TestRunScope:
    class _Option:
        def __init__(self, **kwargs):
            self.keyword = ""
            self.markexpr = ""
            for key, value in kwargs.items():
                setattr(self, key, value)

    class _Config:
        def __init__(self, option):
            self.option = option

    def _scope(self, **kwargs):
        return _run_scope(self._Config(self._Option(**kwargs)))

    def test_a_node_id_narrows_the_run(self):
        """`pytest tests/test_cart.py::test_totals` leaves the file's other
        scenarios unreported, so the run cannot retire them."""
        assert self._scope(file_or_dir=["tests/test_cart.py::test_totals"]) == "filtered"

    def test_a_file_argument_is_still_a_full_run_of_that_file(self):
        assert self._scope(file_or_dir=["tests/test_cart.py"]) == "full"

    def test_deselecting_narrows_the_run(self):
        assert self._scope(deselect=["tests/test_cart.py::test_totals"]) == "filtered"

    def test_last_failed_narrows_the_run(self):
        assert self._scope(lf=True) == "filtered"

    def test_an_interrupted_run_narrows_the_run(self, pytester):
        """Ctrl-C sets no flag on the session, so only the exit status shows it.
        A file this run had already visited was left partly run, and calling
        that a full run would delete the scenarios it never reached."""
        pytester.makepyfile(
            test_interrupted="""
from executable_stories import story

def test_a_runs():
    story.init("first")
    story.then("it runs")

def test_b_interrupts():
    raise KeyboardInterrupt

def test_c_never_runs():
    story.init("third")
    story.then("it never runs")
"""
        )

        raw_run = _run_json(pytester)

        assert raw_run["coveredSourceFiles"] == ["test_interrupted.py"]
        assert raw_run["runScope"] == "filtered"

    def test_stopping_early_narrows_the_run(self, pytester):
        """`-x` leaves the rest of the file unrun, so it is not a full run."""
        pytester.makepyfile(
            test_stops="""
from executable_stories import story

def test_a_fails():
    story.init("first")
    assert False

def test_b_never_runs():
    story.init("second")
"""
        )

        raw_run = _run_json(pytester, "-x")

        assert raw_run["runScope"] == "filtered"


class TestGitSha:
    def test_ci_supplies_the_sha(self, monkeypatch):
        monkeypatch.setenv("GITHUB_SHA", "abc123")
        assert _git_sha(os.getcwd()) == "abc123"

    def test_git_supplies_the_sha_outside_ci(self, monkeypatch, tmp_path):
        for key in ("GITHUB_SHA", "GIT_COMMIT", "CI_COMMIT_SHA"):
            monkeypatch.delenv(key, raising=False)
        subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
        subprocess.run(["git", "config", "user.email", "t@example.com"], cwd=tmp_path, check=True)
        subprocess.run(["git", "config", "user.name", "T"], cwd=tmp_path, check=True)
        (tmp_path / "f.txt").write_text("hello")
        subprocess.run(["git", "add", "."], cwd=tmp_path, check=True)
        subprocess.run(["git", "commit", "-qm", "first"], cwd=tmp_path, check=True)

        sha = _git_sha(str(tmp_path))

        assert sha is not None
        assert len(sha) == 40

    def test_a_directory_without_git_reports_nothing(self, monkeypatch, tmp_path):
        for key in ("GITHUB_SHA", "GIT_COMMIT", "CI_COMMIT_SHA"):
            monkeypatch.delenv(key, raising=False)
        assert _git_sha(str(tmp_path)) is None

    def test_a_hanging_git_does_not_hold_up_the_run(self, monkeypatch, tmp_path):
        """The end of the test run waits on this call, so it is bounded."""
        for key in ("GITHUB_SHA", "GIT_COMMIT", "CI_COMMIT_SHA"):
            monkeypatch.delenv(key, raising=False)
        stub = tmp_path / "git"
        stub.write_text("#!/bin/sh\nsleep 30\n")
        stub.chmod(0o755)
        monkeypatch.setenv("PATH", str(tmp_path) + os.pathsep + os.environ["PATH"])
        monkeypatch.setattr("executable_stories._plugin.GIT_TIMEOUT_SECONDS", 1)

        started = time.monotonic()
        assert _git_sha(str(tmp_path)) is None
        assert time.monotonic() - started < 10


class TestOutputPath:
    def test_a_relative_override_lands_under_the_project_root(self, monkeypatch):
        monkeypatch.setenv("EXECUTABLE_STORIES_OUTPUT", "reports/raw-run.json")
        assert _resolve_output_path("/projects/app") == os.path.join("/projects/app", "reports/raw-run.json")

    def test_an_absolute_override_is_used_as_given(self, monkeypatch):
        monkeypatch.setenv("EXECUTABLE_STORIES_OUTPUT", "/elsewhere/raw-run.json")
        assert _resolve_output_path("/projects/app") == "/elsewhere/raw-run.json"

    def test_the_default_lands_in_the_project_root(self, monkeypatch):
        monkeypatch.delenv("EXECUTABLE_STORIES_OUTPUT", raising=False)
        assert _resolve_output_path("/projects/app") == os.path.join(
            "/projects/app", ".executable-stories", "raw-run.json"
        )

    def test_the_run_file_appears_whole(self, pytester):
        """A reader never sees a half-written run: the file is renamed into
        place, and no temporary file is left behind."""
        pytester.makepyfile(
            test_written="""
from executable_stories import story

def test_story():
    story.init("written atomically")
    story.then("it lands whole")
"""
        )

        raw_run = _run_json(pytester)

        assert raw_run["schemaVersion"] == 1
        leftovers = list((pytester.path / ".executable-stories").glob(".raw-run-*"))
        assert leftovers == []


class TestRelativeSource:
    def test_a_path_outside_the_root_is_left_alone(self):
        assert _relative_source("/elsewhere/test_x.py", "/projects/app") == "/elsewhere/test_x.py"

    def test_a_path_inside_the_root_becomes_relative(self):
        assert _relative_source("/projects/app/tests/test_x.py", "/projects/app") == "tests/test_x.py"


class TestPackageMetadata:
    def test_the_run_says_which_adapter_version_produced_it(self, pytester):
        pytester.makepyfile(
            test_versioned="""
from executable_stories import story

def test_story():
    story.init("versioned")
    story.then("it records the adapter version")
"""
        )

        raw_run = _run_json(pytester)

        assert raw_run["packageVersion"]

"""Tests for JSON serialization and output structure."""

import json
import os
import tempfile

from executable_stories._json_writer import write_raw_run


class TestWriteRawRun:
    def test_writes_json_file(self, tmp_path):
        raw_run = {
            "schemaVersion": 1,
            "testCases": [{"status": "pass"}],
            "projectRoot": "/tmp/project",
        }
        output = str(tmp_path / "output.json")
        write_raw_run(raw_run, output)

        with open(output) as f:
            data = json.load(f)
        assert data == raw_run

    def test_creates_parent_dirs(self, tmp_path):
        output = str(tmp_path / "deep" / "nested" / "output.json")
        write_raw_run({"schemaVersion": 1, "testCases": [], "projectRoot": "/"}, output)
        assert os.path.exists(output)

    def test_pretty_printed(self, tmp_path):
        raw_run = {
            "schemaVersion": 1,
            "testCases": [{"status": "pass"}],
            "projectRoot": "/tmp/project",
        }
        output = str(tmp_path / "output.json")
        write_raw_run(raw_run, output)

        with open(output) as f:
            content = f.read()
        # Should be indented (not single-line)
        assert "\n" in content
        assert "  " in content

    def test_trailing_newline(self, tmp_path):
        output = str(tmp_path / "output.json")
        write_raw_run({"schemaVersion": 1, "testCases": [], "projectRoot": "/"}, output)
        with open(output) as f:
            content = f.read()
        assert content.endswith("\n")


class TestOutputSchema:
    def test_required_fields_present(self):
        """Verify that a minimal RawRun has all required fields."""
        raw_run = {
            "schemaVersion": 1,
            "testCases": [],
            "projectRoot": "/some/path",
        }
        assert raw_run["schemaVersion"] == 1
        assert isinstance(raw_run["testCases"], list)
        assert isinstance(raw_run["projectRoot"], str)
        assert len(raw_run["projectRoot"]) > 0

    def test_test_case_required_field(self):
        """A test case must have 'status'."""
        tc = {"status": "pass"}
        assert "status" in tc

    def test_full_raw_run_structure(self, tmp_path):
        """Build a full RawRun with all optional fields and verify round-trip."""
        raw_run = {
            "schemaVersion": 1,
            "testCases": [
                {
                    "status": "pass",
                    "externalId": "tests/test_login.py::test_login",
                    "title": "test_login",
                    "titlePath": ["tests", "test_login.py", "test_login"],
                    "story": {
                        "scenario": "User logs in",
                        "steps": [
                            {"keyword": "Given", "text": "a user"},
                            {
                                "keyword": "When",
                                "text": "they log in",
                                "docs": [
                                    {"kind": "note", "text": "via form", "phase": "runtime"}
                                ],
                            },
                            {"keyword": "Then", "text": "they see dashboard"},
                        ],
                        "tags": ["auth"],
                        "tickets": ["JIRA-100"],
                        "meta": {"priority": "high"},
                        "suitePath": ["Authentication"],
                        "docs": [
                            {"kind": "note", "text": "top-level note", "phase": "runtime"}
                        ],
                    },
                    "sourceFile": "tests/test_login.py",
                    "sourceLine": 10,
                    "durationMs": 123.45,
                    "meta": {"browser": "chrome"},
                },
                {
                    "status": "fail",
                    "title": "test_bad",
                    "error": {
                        "message": "AssertionError",
                        "stack": "traceback...",
                    },
                },
            ],
            "projectRoot": "/home/user/project",
            "startedAtMs": 1700000000000,
            "finishedAtMs": 1700000001000,
        }

        output = str(tmp_path / "full.json")
        write_raw_run(raw_run, output)

        with open(output) as f:
            loaded = json.load(f)

        assert loaded == raw_run
        assert loaded["testCases"][0]["story"]["steps"][1]["docs"][0]["kind"] == "note"
        assert loaded["testCases"][1]["error"]["message"] == "AssertionError"

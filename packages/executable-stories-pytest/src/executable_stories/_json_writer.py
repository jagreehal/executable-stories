"""Simple JSON serialization for RawRun output."""

from __future__ import annotations

import json
import os
import tempfile
from typing import Any


def write_raw_run(raw_run: dict[str, Any], output_path: str) -> None:
    """Write a RawRun dict to a JSON file.

    Creates parent directories if they don't exist. The file appears whole:
    it is written alongside the destination and then renamed over it, so a
    reader never sees a half-written run and a crash mid-write leaves the
    previous file intact.
    """
    parent = os.path.dirname(output_path) or "."
    os.makedirs(parent, exist_ok=True)

    fd, temp_path = tempfile.mkstemp(dir=parent, prefix=".raw-run-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(raw_run, f, indent=2)
            f.write("\n")
        os.replace(temp_path, output_path)
    except BaseException:
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        raise

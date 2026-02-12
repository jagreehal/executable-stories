"""Simple JSON serialization for RawRun output."""

from __future__ import annotations

import json
import os
from typing import Any


def write_raw_run(raw_run: dict[str, Any], output_path: str) -> None:
    """Write a RawRun dict to a JSON file.

    Creates parent directories if they don't exist.
    """
    parent = os.path.dirname(output_path)
    if parent:
        os.makedirs(parent, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(raw_run, f, indent=2)
        f.write("\n")

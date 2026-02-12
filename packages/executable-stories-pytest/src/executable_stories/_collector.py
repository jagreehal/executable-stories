"""Thread-safe test case collector.

Accumulates RawTestCase dicts as tests complete, then hands them off
to the JSON writer at session end.
"""

from __future__ import annotations

import threading
from typing import Any


class _Collector:
    """Thread-safe registry for completed test case results."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._cases: list[dict[str, Any]] = []

    def record(self, test_case: dict[str, Any]) -> None:
        """Append a completed RawTestCase dict."""
        with self._lock:
            self._cases.append(test_case)

    def get_all(self) -> list[dict[str, Any]]:
        """Return all collected test cases."""
        with self._lock:
            return list(self._cases)

    def clear(self) -> None:
        """Reset the collector."""
        with self._lock:
            self._cases.clear()


# Module-level singleton
_collector = _Collector()

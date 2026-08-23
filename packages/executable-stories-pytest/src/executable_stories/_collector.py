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
        self._features: dict[str, dict[str, Any]] = {}

    def record(self, test_case: dict[str, Any]) -> None:
        """Append a completed RawTestCase dict."""
        with self._lock:
            self._cases.append(test_case)

    def get_all(self) -> list[dict[str, Any]]:
        """Return all collected test cases."""
        with self._lock:
            return list(self._cases)

    def record_feature(self, feature: dict[str, Any]) -> None:
        """Store a declaration, replacing an earlier one for the same file.

        A re-declaration then reads the way it does in source order.
        """
        with self._lock:
            self._features[feature.get("sourceFile", "")] = feature

    def get_features(self) -> list[dict[str, Any]]:
        """Return all declared features."""
        with self._lock:
            return list(self._features.values())

    def clear(self) -> None:
        """Reset the collector."""
        with self._lock:
            self._cases.clear()
            self._features.clear()


# Module-level singleton
_collector = _Collector()

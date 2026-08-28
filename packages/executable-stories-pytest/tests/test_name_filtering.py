"""A run narrowed with `-k` or `-m` reports only the matching tests, so it is
not the complete contents of the files it touches. Consumers use the flag to
decide whether a run replaces a file's scenarios or only updates some."""

from executable_stories._plugin import _run_scope


class _Option:
    def __init__(self, keyword: str = "", markexpr: str = "") -> None:
        self.keyword = keyword
        self.markexpr = markexpr


class _Config:
    def __init__(self, option: _Option) -> None:
        self.option = option


def test_plain_run_reports_full_scope() -> None:
    assert _run_scope(_Config(_Option())) == "full"


def test_keyword_filter_reports_filtered_scope() -> None:
    assert _run_scope(_Config(_Option(keyword="refuses"))) == "filtered"


def test_marker_filter_reports_filtered_scope() -> None:
    assert _run_scope(_Config(_Option(markexpr="smoke"))) == "filtered"


def test_config_without_options_reports_unknown_scope() -> None:
    # Nothing was inspected, so nothing is claimed: a consumer keeps what this
    # run did not report rather than retiring it on a guess.
    assert _run_scope(object()) is None

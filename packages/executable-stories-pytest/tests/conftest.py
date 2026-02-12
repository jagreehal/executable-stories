"""Shared test fixtures for executable-stories-pytest tests."""

import pytest

from executable_stories._story_api import Story


@pytest.fixture()
def fresh_story():
    """Provide a fresh Story instance (not the module singleton) for isolation."""
    s = Story()
    yield s
    s._clear()

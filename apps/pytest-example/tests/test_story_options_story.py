"""Demonstrates story options: tags, ticket, meta via story.init()."""

from executable_stories import story


def test_story_with_single_tag():
    story.init("Story with single tag", tags=["smoke"])
    story.note("Single tag for basic categorization")
    story.given("a tagged story")
    story.when("tests are filtered")
    story.then("this story matches the 'smoke' tag")
    assert True


def test_story_with_multiple_tags():
    story.init("Story with multiple tags", tags=["smoke", "regression", "critical"])
    story.note("Multiple tags for flexible filtering")
    story.given("a story with multiple tags")
    story.when("tests are filtered by any tag")
    story.then("this story matches multiple filters")
    assert True


def test_story_with_ticket():
    story.init("Story with ticket", ticket="JIRA-123")
    story.note("Links story to a single issue tracker ticket")
    story.given("a story linked to JIRA-123")
    story.when("documentation is generated")
    story.then("ticket reference appears in docs")
    assert True


def test_story_with_meta():
    story.init("Story with metadata", meta={"priority": "high", "owner": "team-backend"})
    story.note("Custom metadata attached to story")
    story.given("a story with custom metadata")
    story.then("metadata is available in reports")
    assert True

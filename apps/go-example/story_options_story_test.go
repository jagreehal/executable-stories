package example

import (
	"testing"

	es "github.com/anthropics/executable-stories/packages/executable-stories-go"
)

func TestStoryWithSingleTag(t *testing.T) {
	s := es.Init(t, "Story with single tag", es.WithTags("smoke"))
	s.Note("Single tag for basic categorization")
	s.Given("a tagged story")
	s.When("tests are filtered")
	s.Then("this story matches the 'smoke' tag")
}

func TestStoryWithMultipleTags(t *testing.T) {
	s := es.Init(t, "Story with multiple tags", es.WithTags("smoke", "regression", "critical"))
	s.Note("Multiple tags for flexible filtering")
	s.Given("a story with multiple tags")
	s.When("tests are filtered by any tag")
	s.Then("this story matches multiple filters")
}

func TestStoryWithTicket(t *testing.T) {
	s := es.Init(t, "Story with ticket", es.WithTicket("JIRA-123"))
	s.Note("Links story to a single issue tracker ticket")
	s.Given("a story linked to JIRA-123")
	s.When("documentation is generated")
	s.Then("ticket reference appears in docs")
}

func TestStoryWithMeta(t *testing.T) {
	s := es.Init(t, "Story with metadata", es.WithMeta(map[string]any{"priority": "high", "owner": "team-backend"}))
	s.Note("Custom metadata attached to story")
	s.Given("a story with custom metadata")
	s.Then("metadata is available in reports")
}

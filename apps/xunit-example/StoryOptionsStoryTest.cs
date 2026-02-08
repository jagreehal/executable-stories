using ExecutableStories.Xunit;
using Xunit;

namespace XunitExample.Tests;

public class StoryOptionsStoryTest
{
    [Fact]
    public void Story_with_single_tag()
    {
        Story.Init("Story with single tag", "smoke");
        Story.Note("Single tag for basic categorization");
        Story.Given("a tagged story");
        Story.When("tests are filtered");
        Story.Then("this story matches the 'smoke' tag");
        Story.RecordAndClear();
    }

    [Fact]
    public void Story_with_multiple_tags()
    {
        Story.Init("Story with multiple tags", "smoke", "regression", "critical");
        Story.Note("Multiple tags for flexible filtering");
        Story.Given("a story with multiple tags");
        Story.When("tests are filtered by any tag");
        Story.Then("this story matches multiple filters");
        Story.RecordAndClear();
    }

    [Fact]
    public void Story_with_feature_tags()
    {
        Story.Init("Story with feature tags", "feature:auth", "feature:login");
        Story.Note("Tags can use prefixes for organization");
        Story.Given("a story tagged by feature");
        Story.Then("feature filtering is possible");
        Story.RecordAndClear();
    }
}

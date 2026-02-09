package example

import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertTrue

class StoryOptionsStoryTest {

    @Test
    fun storyWithSingleTag() {
        Story.init("Story with single tag", "smoke")
        Story.note("Single tag for basic categorization")
        Story.given("a tagged story")
        Story.`when`("tests are filtered")
        Story.then("this story matches the 'smoke' tag")
        assertTrue(true)
    }

    @Test
    fun storyWithMultipleTags() {
        Story.init("Story with multiple tags", "smoke", "regression", "critical")
        Story.note("Multiple tags for flexible filtering")
        Story.given("a story with multiple tags")
        Story.`when`("tests are filtered by any tag")
        Story.then("this story matches multiple filters")
        assertTrue(true)
    }

    @Test
    fun storyWithFeatureTags() {
        Story.init("Story with feature tags", "feature:auth", "feature:login")
        Story.note("Tags can use prefixes for organization")
        Story.given("a story tagged by feature")
        Story.then("feature filtering is possible")
        assertTrue(true)
    }

    @Test
    fun storyWithOnlyTags() {
        Story.init("Story with only tags option", "minimal")
        Story.given("story with only tags option")
        Story.then("other options are optional")
        assertTrue(true)
    }
}

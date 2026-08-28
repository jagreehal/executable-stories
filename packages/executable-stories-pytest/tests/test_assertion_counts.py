"""Assertions attributable to a step.

pytest has no assertion counter to read, so a step's count is only known when
the author routes the claim through a wrapped body. Bare markers stay
unobserved: absent is honest, zero would be an accusation.
"""

from executable_stories._story_api import Story


class TestAssertionCounts:
    def test_expect_records_an_assertion(self, fresh_story: Story):
        fresh_story.init("a checked claim")
        fresh_story.given("two numbers 5 and 3")
        fresh_story.expect("the result is 8", lambda: None)

        meta = fresh_story._get_meta()
        assert meta is not None
        assert meta["steps"][1].get("assertions") == 1

    def test_marker_steps_stay_unobserved(self, fresh_story: Story):
        fresh_story.init("an unwrapped claim")
        fresh_story.given("two numbers 5 and 3")
        fresh_story.then("the result is 8")

        meta = fresh_story._get_meta()
        assert meta is not None
        for step in meta["steps"]:
            assert "assertions" not in step

    def test_wrapped_setup_does_not_count_as_a_claim(self, fresh_story: Story):
        fresh_story.init("wrapped setup")
        fresh_story.fn("Given", "an expensive fixture", lambda: None)

        meta = fresh_story._get_meta()
        assert meta is not None
        assert "assertions" not in meta["steps"][0]

    def test_second_wrapped_claim_still_counts(self, fresh_story: Story):
        # Auto-And rewrites a repeated Then before the step is stored. The
        # second claim is still a claim.
        fresh_story.init("two claims")
        fresh_story.given("two numbers 5 and 3")
        fresh_story.expect("the result is 8", lambda: None)
        fresh_story.expect("the result is positive", lambda: None)

        meta = fresh_story._get_meta()
        assert meta is not None
        assert meta["steps"][2]["keyword"] == "And"
        assert meta["steps"][2].get("assertions") == 1

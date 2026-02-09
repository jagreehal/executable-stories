"""Demonstrates step keyword variety: given/when/then plus and_() and but()."""

from executable_stories import story


def test_explicit_and_and_but_steps():
    story.init("Order with explicit And and But steps")
    story.given("the user is logged in")
    story.and_("the user has a valid payment method")
    story.and_("the user has items in cart")
    story.when("the user clicks checkout")
    story.and_("confirms the order")
    story.then("the order should be created")
    story.and_("the payment should be processed")
    story.but("the inventory is not yet decremented")
    assert True


def test_but_for_negative_assertion():
    story.init("Login blocked for suspended user")
    story.given("the user account exists")
    story.given("the account is suspended")
    story.when("the user submits valid credentials")
    story.then("the user should see an error message")
    story.but("the user should not be logged in")
    story.but("the session should not be created")
    assert True


def test_mixed_given_when_then_with_and():
    story.init("Sum calculation using and")
    story.given("numbers 1, 2, 3, 4, 5")
    story.and_("an accumulator initialized to zero")
    total = 1 + 2 + 3 + 4 + 5
    story.when("the sum is calculated")
    story.then("the result is 15")
    story.and_("the result is positive")
    assert total == 15
    assert total > 0

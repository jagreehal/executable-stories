"""Gherkin-style patterns: multiple given/when/then (auto-And), explicit and_/but."""

from executable_stories import story


def test_multiple_given_auto_and():
    story.init("User logs in successfully")
    story.given("the user account exists")
    story.given("the user is on the login page")
    story.given("the account is active")
    story.when("the user submits valid credentials")
    story.then("the user should see the dashboard")
    assert True


def test_multiple_when_auto_and():
    story.init("User updates profile settings")
    story.given("the user is logged in")
    story.when("the user navigates to settings")
    story.when("the user changes their display name")
    story.then("the changes should be saved")
    assert True


def test_multiple_then_auto_and():
    story.init("Successful order confirmation")
    story.given("the user has items in cart")
    story.when("the user completes checkout")
    story.then("the order should be created")
    story.then("a confirmation email should be sent")
    story.then("the inventory should be updated")
    assert True


def test_but_keyword_for_contrast():
    story.init("Login blocked for suspended user")
    story.given("the user account exists")
    story.given("the account is suspended")
    story.when("the user submits valid credentials")
    story.then("the user should see an error message")
    story.but("the user should not be logged in")
    story.but("the session should not be created")
    assert True


def test_explicit_and_steps():
    story.init("Order with explicit And steps")
    story.given("the user is logged in")
    story.and_("the user has a valid payment method")
    story.and_("the user has items in cart")
    story.when("the user clicks checkout")
    story.and_("confirms the order")
    story.then("the order should be created")
    story.and_("the payment should be processed")
    assert True

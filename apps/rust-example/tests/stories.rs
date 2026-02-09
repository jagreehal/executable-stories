//! All story-based tests in one file so they run in one process; dtor writes raw-run.json at exit.

use executable_stories::Story;
use rust_example::{add, divide, multiply, subtract};

// Register destructor to write raw-run.json when the test binary exits.
#[ctor::dtor]
fn write_story_results() {
    executable_stories::write_results();
}

// --- Calculator story tests ---

#[test]
fn test_calculator_adds_two_numbers() {
    let mut s = Story::new("Calculator adds two numbers");
    s.given("two numbers 5 and 3");
    let (a, b) = (5, 3);
    s.when("the numbers are added");
    let result = add(a, b);
    s.then("the result is 8");
    assert_eq!(result, 8);
    s.pass();
}

#[test]
fn test_calculator_subtracts_two_numbers() {
    let mut s = Story::new("Calculator subtracts two numbers");
    s.given("two numbers 10 and 4");
    let (a, b) = (10, 4);
    s.when("the second is subtracted from the first");
    let result = subtract(a, b);
    s.then("the result is 6");
    assert_eq!(result, 6);
    s.pass();
}

#[test]
fn test_calculator_multiplies_two_numbers() {
    let mut s = Story::new("Calculator multiplies two numbers");
    s.given("two numbers 7 and 6");
    let (a, b) = (7, 6);
    s.note("This is a note");
    s.when("the numbers are multiplied");
    let result = multiply(a, b);
    s.then("the result is 42");
    assert_eq!(result, 42);
    s.pass();
}

#[test]
fn test_calculator_divides_two_numbers() {
    let mut s = Story::new("Calculator divides two numbers");
    s.given("two numbers 20 and 4");
    let (a, b) = (20, 4);
    s.when("the first is divided by the second");
    let result = divide(a, b);
    s.then("the result is 5");
    assert_eq!(result, 5);
    s.pass();
}

#[test]
fn test_calculator_throws_on_division_by_zero() {
    let mut s = Story::new("Calculator throws error on division by zero");
    s.note("Division by zero should throw an error");
    s.given("a number 10 and zero");
    let (a, b) = (10, 0);
    s.when("division is attempted");
    let result = std::panic::catch_unwind(|| divide(a, b));
    assert!(result.is_err());
    s.then("an error is thrown");
    s.pass();
}

// --- Story options ---

#[test]
fn test_story_with_single_tag() {
    let mut s = Story::new("Story with single tag").with_tags(&["smoke"]);
    s.note("Single tag for basic categorization");
    s.given("a tagged story");
    s.when("tests are filtered");
    s.then("this story matches the 'smoke' tag");
    s.pass();
}

#[test]
fn test_story_with_multiple_tags() {
    let mut s = Story::new("Story with multiple tags").with_tags(&["smoke", "regression", "critical"]);
    s.note("Multiple tags for flexible filtering");
    s.given("a story with multiple tags");
    s.when("tests are filtered by any tag");
    s.then("this story matches multiple filters");
    s.pass();
}

#[test]
fn test_story_with_ticket() {
    let mut s = Story::new("Story with ticket").with_tickets(&["JIRA-123"]);
    s.note("Links story to a single issue tracker ticket");
    s.given("a story linked to JIRA-123");
    s.when("documentation is generated");
    s.then("ticket reference appears in docs");
    s.pass();
}

// --- Step aliases (and / but) ---

#[test]
fn test_explicit_and_and_but_steps() {
    let mut s = Story::new("Order with explicit And and But steps");
    s.given("the user is logged in")
        .and("the user has a valid payment method")
        .and("the user has items in cart")
        .when("the user clicks checkout")
        .and("confirms the order")
        .then("the order should be created")
        .and("the payment should be processed")
        .but("the inventory is not yet decremented");
    s.pass();
}

#[test]
fn test_but_for_negative_assertion() {
    let mut s = Story::new("Login blocked for suspended user");
    s.given("the user account exists");
    s.given("the account is suspended");
    s.when("the user submits valid credentials");
    s.then("the user should see an error message");
    s.but("the user should not be logged in");
    s.but("the session should not be created");
    s.pass();
}

#[test]
fn test_mixed_given_when_then_with_and() {
    let mut s = Story::new("Sum calculation using and");
    s.given("numbers 1, 2, 3, 4, 5");
    s.and("an accumulator initialized to zero");
    let total = 1 + 2 + 3 + 4 + 5;
    s.when("the sum is calculated");
    s.then("the result is 15");
    s.and("the result is positive");
    assert_eq!(total, 15);
    assert!(total > 0);
    s.pass();
}

// --- Gherkin patterns ---

#[test]
fn test_multiple_given_auto_and() {
    let mut s = Story::new("User logs in successfully");
    s.given("the user account exists");
    s.given("the user is on the login page");
    s.given("the account is active");
    s.when("the user submits valid credentials");
    s.then("the user should see the dashboard");
    s.pass();
}

#[test]
fn test_multiple_when_auto_and() {
    let mut s = Story::new("User updates profile settings");
    s.given("the user is logged in");
    s.when("the user navigates to settings");
    s.when("the user changes their display name");
    s.then("the changes should be saved");
    s.pass();
}

#[test]
fn test_multiple_then_auto_and() {
    let mut s = Story::new("Successful order confirmation");
    s.given("the user has items in cart");
    s.when("the user completes checkout");
    s.then("the order should be created");
    s.then("a confirmation email should be sent");
    s.then("the inventory should be updated");
    s.pass();
}

#[test]
fn test_but_keyword_for_contrast() {
    let mut s = Story::new("Login blocked for suspended user");
    s.given("the user account exists");
    s.given("the account is suspended");
    s.when("the user submits valid credentials");
    s.then("the user should see an error message");
    s.but("the user should not be logged in");
    s.but("the session should not be created");
    s.pass();
}

#[test]
fn test_explicit_and_steps() {
    let mut s = Story::new("Order with explicit And steps");
    s.given("the user is logged in")
        .and("the user has a valid payment method")
        .and("the user has items in cart")
        .when("the user clicks checkout")
        .and("confirms the order")
        .then("the order should be created")
        .and("the payment should be processed");
    s.pass();
}

// --- Wrapped steps (fn_step / expect_step) ---

#[test]
fn test_wrapped_steps_addition() {
    let mut s = Story::new("Calculator adds two numbers using fn_step and expect_step");
    let a = s.fn_step("Given", "number a is 5", || 5);
    let b = s.fn_step("Given", "number b is 3", || 3);
    let result = s.fn_step("When", "the numbers are added", || add(a, b));
    s.expect_step("the result is 8", || {
        assert_eq!(result, 8);
    });
    s.pass();
}

#[test]
fn test_wrapped_steps_subtraction() {
    let mut s = Story::new("Calculator subtracts using fn_step with timing");
    s.fn_step("Given", "two numbers 10 and 4", || {});
    let result = s.fn_step("When", "the second is subtracted from the first", || {
        subtract(10, 4)
    });
    s.expect_step("the result is 6", || {
        assert_eq!(result, 6);
    });
    s.pass();
}

#[test]
fn test_wrapped_steps_division_by_zero() {
    let mut s = Story::new("Calculator division by zero captured in fn_step");
    s.fn_step("Given", "a number 10 and zero", || {});
    s.expect_step("division by zero panics", || {
        let result = std::panic::catch_unwind(|| divide(10, 0));
        assert!(result.is_err());
    });
    s.pass();
}

#[test]
fn test_wrapped_steps_mixed() {
    let mut s = Story::new("Mixed markers and wrapped steps");
    s.given("the calculator is ready");
    let result = s.fn_step("When", "we multiply 7 by 6", || multiply(7, 6));
    s.expect_step("the result is 42", || {
        assert_eq!(result, 42);
    });
    s.and("the result is a positive number");
    assert!(result > 0);
    s.pass();
}

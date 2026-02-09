using ExecutableStories.Xunit;
using Xunit;

namespace XunitExample.Tests;

public class GherkinPatternsStoryTest
{
    [Fact]
    public void Multiple_Given_auto_And()
    {
        Story.Init("User logs in successfully");
        Story.Given("the user account exists");
        Story.Given("the user is on the login page");
        Story.Given("the account is active");
        Story.When("the user submits valid credentials");
        Story.Then("the user should see the dashboard");
        Story.RecordAndClear();
    }

    [Fact]
    public void Multiple_When_auto_And()
    {
        Story.Init("User updates profile settings");
        Story.Given("the user is logged in");
        Story.When("the user navigates to settings");
        Story.When("the user changes their display name");
        Story.Then("the changes should be saved");
        Story.RecordAndClear();
    }

    [Fact]
    public void Multiple_Then_auto_And()
    {
        Story.Init("Successful order confirmation");
        Story.Given("the user has items in cart");
        Story.When("the user completes checkout");
        Story.Then("the order should be created");
        Story.Then("a confirmation email should be sent");
        Story.Then("the inventory should be updated");
        Story.RecordAndClear();
    }

    [Fact]
    public void But_keyword_for_contrast()
    {
        Story.Init("Login blocked for suspended user");
        Story.Given("the user account exists");
        Story.Given("the account is suspended");
        Story.When("the user submits valid credentials");
        Story.Then("the user should see an error message");
        Story.But("the user should not be logged in");
        Story.But("the session should not be created");
        Story.RecordAndClear();
    }

    [Fact]
    public void Explicit_And_steps()
    {
        Story.Init("Order with explicit And steps");
        Story.Given("the user is logged in");
        Story.And("the user has a valid payment method");
        Story.And("the user has items in cart");
        Story.When("the user clicks checkout");
        Story.And("confirms the order");
        Story.Then("the order should be created");
        Story.And("the payment should be processed");
        Story.RecordAndClear();
    }
}

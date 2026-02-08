using ExecutableStories.Xunit;
using Xunit;

namespace XunitExample.Tests;

public class StepAliasesStoryTest
{
    [Fact]
    public void Explicit_And_and_But_steps()
    {
        Story.Init("Order with explicit And and But steps");
        Story.Given("the user is logged in");
        Story.And("the user has a valid payment method");
        Story.And("the user has items in cart");
        Story.When("the user clicks checkout");
        Story.And("confirms the order");
        Story.Then("the order should be created");
        Story.And("the payment should be processed");
        Story.But("the inventory is not yet decremented");
        Story.RecordAndClear();
    }

    [Fact]
    public void But_for_negative_assertion()
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
    public void Mixed_given_when_then_with_And()
    {
        Story.Init("Sum calculation using and");
        Story.Given("numbers 1, 2, 3, 4, 5");
        Story.And("an accumulator initialized to zero");
        var total = 1 + 2 + 3 + 4 + 5;
        Story.When("the sum is calculated");
        Story.Then("the result is 15");
        Story.And("the result is positive");
        Assert.Equal(15, total);
        Assert.True(total > 0);
        Story.RecordAndClear();
    }
}

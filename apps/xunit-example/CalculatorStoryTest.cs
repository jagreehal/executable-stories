using ExecutableStories.Xunit;
using Xunit;
using XunitExample;

namespace XunitExample.Tests;

public class CalculatorStoryTest
{
    [Fact]
    public void Calculator_adds_two_numbers()
    {
        Story.Init("Calculator adds two numbers");
        Story.Given("two numbers 5 and 3");
        var (a, b) = (5, 3);
        Story.When("the numbers are added");
        var result = Calculator.Add(a, b);
        Story.Then("the result is 8");
        Assert.Equal(8, result);
        Story.RecordAndClear();
    }

    [Fact]
    public void Calculator_subtracts_two_numbers()
    {
        Story.Init("Calculator subtracts two numbers");
        Story.Given("two numbers 10 and 4");
        var (a, b) = (10, 4);
        Story.When("the second is subtracted from the first");
        var result = Calculator.Subtract(a, b);
        Story.Then("the result is 6");
        Assert.Equal(6, result);
        Story.RecordAndClear();
    }

    [Fact]
    public void Calculator_multiplies_two_numbers()
    {
        Story.Init("Calculator multiplies two numbers");
        Story.Given("two numbers 7 and 6");
        var (a, b) = (7, 6);
        Story.Note("This is a note");
        Story.When("the numbers are multiplied");
        var result = Calculator.Multiply(a, b);
        Story.Then("the result is 42");
        Assert.Equal(42, result);
        Story.RecordAndClear();
    }

    [Fact]
    public void Calculator_divides_two_numbers()
    {
        Story.Init("Calculator divides two numbers");
        Story.Given("two numbers 20 and 4");
        var (a, b) = (20, 4);
        Story.When("the first is divided by the second");
        var result = Calculator.Divide(a, b);
        Story.Then("the result is 5");
        Assert.Equal(5, result);
        Story.RecordAndClear();
    }

    [Fact]
    public void Calculator_throws_on_division_by_zero()
    {
        Story.Init("Calculator throws error on division by zero");
        Story.Note("Division by zero should throw an error");
        Story.Given("a number 10 and zero");
        var (a, b) = (10, 0);
        Story.When("division is attempted");
        Assert.Throws<DivideByZeroException>(() => Calculator.Divide(a, b));
        Story.Then("an error is thrown");
        Story.RecordAndClear();
    }
}

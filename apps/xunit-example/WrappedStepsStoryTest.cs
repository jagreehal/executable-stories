using ExecutableStories.Xunit;
using Xunit;
using XunitExample;

namespace XunitExample.Tests;

public class WrappedStepsStoryTest
{
    [Fact]
    public void Calculator_adds_using_Fn_and_Expect()
    {
        Story.Init("Calculator adds two numbers using Fn and Expect");

        var a = Story.Fn("Given", "number a is 5", () => 5);
        var b = Story.Fn("Given", "number b is 3", () => 3);

        var result = Story.Fn("When", "the numbers are added", () => Calculator.Add(a, b));

        Story.Expect("the result is 8", () => Assert.Equal(8, result));

        Story.RecordAndClear();
    }

    [Fact]
    public void Calculator_subtracts_using_Fn_with_timing()
    {
        Story.Init("Calculator subtracts using Fn with timing");

        Story.Fn("Given", "two numbers 10 and 4", () => { });

        var result = Story.Fn("When", "the second is subtracted from the first",
            () => Calculator.Subtract(10, 4));

        Story.Expect("the result is 6", () => Assert.Equal(6, result));

        Story.RecordAndClear();
    }

    [Fact]
    public void Calculator_division_by_zero_captured_in_Fn()
    {
        Story.Init("Calculator division by zero captured in Fn");

        Story.Fn("Given", "a number 10 and zero", () => { });

        Story.Expect("division by zero throws an error", () =>
            Assert.Throws<DivideByZeroException>(() => Calculator.Divide(10, 0)));

        Story.RecordAndClear();
    }

    [Fact]
    public void Mixed_markers_and_wrapped_steps()
    {
        Story.Init("Mixed markers and wrapped steps");

        Story.Given("the calculator is ready");

        var result = Story.Fn("When", "we multiply 7 by 6", () => Calculator.Multiply(7, 6));

        Story.Expect("the result is 42", () => Assert.Equal(42, result));

        Story.And("the result is a positive number");
        Assert.True(result > 0);

        Story.RecordAndClear();
    }
}

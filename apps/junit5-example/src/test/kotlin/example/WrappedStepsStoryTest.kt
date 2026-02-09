package example

import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import java.util.function.Supplier

class WrappedStepsStoryTest {

    @Test
    fun calculatorAddsUsingFnAndExpect() {
        Story.init("Calculator adds two numbers using fn and expect")

        val a = Story.fn("Given", "number a is 5", Supplier { 5 })
        val b = Story.fn("Given", "number b is 3", Supplier { 3 })

        val result = Story.fn("When", "the numbers are added", Supplier { Calculator.add(a, b) })

        Story.expect("the result is 8", Runnable { assertEquals(8, result) })
    }

    @Test
    fun calculatorSubtractsUsingFnWithTiming() {
        Story.init("Calculator subtracts using fn with timing")

        Story.fn("Given", "two numbers 10 and 4", Runnable {})

        val result = Story.fn("When", "the second is subtracted from the first",
            Supplier { Calculator.subtract(10, 4) })

        Story.expect("the result is 6", Runnable { assertEquals(6, result) })
    }

    @Test
    fun calculatorDivisionByZeroCapturedInFn() {
        Story.init("Calculator division by zero captured in fn")

        Story.fn("Given", "a number 10 and zero", Runnable {})

        Story.expect("division by zero throws an error",
            Runnable { assertThrows(ArithmeticException::class.java) { Calculator.divide(10, 0) } })
    }

    @Test
    fun mixedMarkersAndWrappedSteps() {
        Story.init("Mixed markers and wrapped steps")

        Story.given("the calculator is ready")

        val result = Story.fn("When", "we multiply 7 by 6", Supplier { Calculator.multiply(7, 6) })

        Story.expect("the result is 42", Runnable { assertEquals(42, result) })

        Story.and("the result is a positive number")
        assert(result > 0)
    }
}

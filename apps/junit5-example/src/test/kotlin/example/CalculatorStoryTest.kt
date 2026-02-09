package example

import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows

class CalculatorStoryTest {

    @Test
    fun calculatorAddsTwoNumbers() {
        Story.init("Calculator adds two numbers")

        Story.given("two numbers 5 and 3")
        val a = 5
        val b = 3

        Story.`when`("the numbers are added")
        val result = Calculator.add(a, b)

        Story.then("the result is 8")
        assertEquals(8, result)
    }

    @Test
    fun calculatorSubtractsTwoNumbers() {
        Story.init("Calculator subtracts two numbers")

        Story.given("two numbers 10 and 4")
        val a = 10
        val b = 4

        Story.`when`("the second is subtracted from the first")
        val result = Calculator.subtract(a, b)

        Story.then("the result is 6")
        assertEquals(6, result)
    }

    @Test
    fun calculatorMultipliesTwoNumbers() {
        Story.init("Calculator multiplies two numbers")

        Story.given("two numbers 7 and 6")
        val a = 7
        val b = 6

        Story.note("This is a note")

        Story.`when`("the numbers are multiplied")
        val result = Calculator.multiply(a, b)

        Story.then("the result is 42")
        assertEquals(42, result)
    }

    @Test
    fun calculatorDividesTwoNumbers() {
        Story.init("Calculator divides two numbers")

        Story.given("two numbers 20 and 4")
        val a = 20
        val b = 4

        Story.`when`("the first is divided by the second")
        val result = Calculator.divide(a, b)

        Story.then("the result is 5")
        assertEquals(5, result)
    }

    @Test
    fun calculatorThrowsOnDivisionByZero() {
        Story.init("Calculator throws error on division by zero")

        Story.note("Division by zero should throw an error")

        Story.given("a number 10 and zero")
        val a = 10
        val b = 0

        Story.`when`("division is attempted")
        assertThrows(ArithmeticException::class.java) { Calculator.divide(a, b) }

        Story.then("an error is thrown")
    }
}

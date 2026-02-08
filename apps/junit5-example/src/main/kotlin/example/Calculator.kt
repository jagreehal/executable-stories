package example

object Calculator {

    @JvmStatic
    fun add(a: Int, b: Int): Int = a + b

    @JvmStatic
    fun subtract(a: Int, b: Int): Int = a - b

    @JvmStatic
    fun multiply(a: Int, b: Int): Int = a * b

    @JvmStatic
    fun divide(a: Int, b: Int): Int {
        if (b == 0) throw ArithmeticException("Cannot divide by zero")
        return a / b
    }
}

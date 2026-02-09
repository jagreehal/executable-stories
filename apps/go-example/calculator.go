// Package example provides a simple calculator matching the Playwright/Vitest examples.
package example

// Add returns a + b.
func Add(a, b int) int {
	return a + b
}

// Subtract returns a - b.
func Subtract(a, b int) int {
	return a - b
}

// Multiply returns a * b.
func Multiply(a, b int) int {
	return a * b
}

// Divide returns a / b. It panics if b is 0.
func Divide(a, b int) int {
	if b == 0 {
		panic("Cannot divide by zero")
	}
	return a / b
}

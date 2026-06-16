# frozen_string_literal: true

# A simple calculator matching the Playwright/Vitest/Go examples.
module Calculator
  module_function

  def add(a, b)
    a + b
  end

  def subtract(a, b)
    a - b
  end

  def multiply(a, b)
    a * b
  end

  # Raises ArgumentError when dividing by zero.
  def divide(a, b)
    raise ArgumentError, "Cannot divide by zero" if b.zero?

    a / b
  end
end

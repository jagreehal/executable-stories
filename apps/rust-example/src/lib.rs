//! Simple calculator matching the behavior of the Playwright/Vitest examples.

/// Returns a + b.
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

/// Returns a - b.
pub fn subtract(a: i32, b: i32) -> i32 {
    a - b
}

/// Returns a * b.
pub fn multiply(a: i32, b: i32) -> i32 {
    a * b
}

/// Returns a / b. Panics if b is 0.
pub fn divide(a: i32, b: i32) -> i32 {
    if b == 0 {
        panic!("Cannot divide by zero");
    }
    a / b
}

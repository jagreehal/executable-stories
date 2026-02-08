# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-04T20:55:30.340Z |
| Version | 1.0.0 |
| Git SHA | 3149bef |

## src/calculator.story.spec.ts

### Calculator

#### ✅ Calculator adds two numbers

- **Given** two numbers 5 and 3
- **When** the numbers are added
- **Then** the result is 8

#### ✅ Calculator subtracts two numbers

- **Given** two numbers 10 and 4
- **When** the second is subtracted from the first
- **Then** the result is 6

#### ✅ Calculator multiplies two numbers

- **Given** two numbers 7 and 6
    > This is a note3
- **When** the numbers are multiplied
- **Then** the result is 42

#### ✅ Calculator divides two numbers

- **Given** two numbers 20 and 4
- **When** the first is divided by the second
- **Then** the result is 5

#### ✅ Calculator throws error on division by zero

> Division by zero should throw an error
- **Given** a number 10 and zero
- **When** division is attempted
- **Then** an error is thrown
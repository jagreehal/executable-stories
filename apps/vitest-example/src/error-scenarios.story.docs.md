# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-03T22:33:38.390Z |
| Version | 1.0.0 |
| Git SHA | afb3e1f |

## ✅ Async error handling patterns

- **Given** an async function that can fail
- **When** async error is caught with try/catch
- **And** async error is caught with rejects
- **Then** successful async operation works

## ✅ Async failures with .fails modifier

- **Given** setup for async failure
- **When** async operation fails as expected _(expected to fail)_
- **Then** test continues after async failure

## ⚠️ Conditional skipping based on environment

- **Given** environment is checked
- **When** Windows-only operation _(skipped)_
- **And** platform-aware operation
- **Then** test completes appropriately

## ✅ Documenting error scenarios

- **Given** a validation function
- **When** empty input is validated
- **And** short input is validated
- **And** valid input is validated
- **Then** all error cases are documented

## ⏩ Entire story skipped for maintenance

- **Given** this won't run
- **Then** nothing is tested

## ✅ Error recovery and fallback patterns

- **Given** a safe wrapper function
- **When** successful operation is wrapped
- **And** failing operation is wrapped
- **Then** errors are handled gracefully

## ✅ Expected failures with .fails modifier

- **Given** a function that throws
- **When** the function is called and throws _(expected to fail)_
- **Then** test continues after expected failure

## ✅ Multiple expected failures in sequence

- **Given** setup that throws _(expected to fail)_
- **When** action that throws _(expected to fail)_
- **Then** assertion that throws _(expected to fail)_
- **And** normal step after failures

## ⚠️ Skip based on feature flags

- **Given** feature flags are configured
- **When** new UI is used _(skipped)_
- **And** beta feature is accessed _(skipped)_
- **And** experimental API is called
- **Then** only enabled features are tested

## ✅ Testing custom error types

- **Given** custom error classes exist
- **When** validation error is thrown
- **And** network error is thrown
- **Then** custom errors are properly typed

## ✅ Testing errors with Vitest toThrow

- **Given** functions that throw different errors
- **Then** toThrow matches any error
- **And** toThrow matches specific message
- **And** toThrow matches error type
- **And** toThrow matches with regex

## ✅ Testing thrown errors with try/catch

- **Given** a function that will throw
- **When** the function is called in try/catch
- **Then** error is caught
- **And** error message is correct
- **And** error is an instance of Error

## ⚠️ Todo as documentation for future work

- **Given** current state is stable
- **When** phase 1 feature is used
- **And** phase 2 feature is used _(todo)_
- **And** phase 3 feature is used _(todo)_
- **Then** phase 1 works
- **And** phase 2 works _(todo)_
- **And** phase 3 works _(todo)_

## ⚠️ Todo steps for planned functionality

- **Given** existing functionality is tested
- **When** new feature is implemented _(todo)_
- **Then** new feature works correctly _(todo)_
- **And** new feature handles edge cases _(todo)_
- **And** existing assertions still pass

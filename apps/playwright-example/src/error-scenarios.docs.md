# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-03T22:33:41.259Z |
| Version | 1.0.0 |
| Git SHA | afb3e1f |

## ✅ Async error handling patterns

- **Given** an async function that can fail
- **When** async error is caught with try/catch
- **And** async error is caught with rejects
- **Then** successful async operation works

## ⚠️ Conditional skipping based on environment

- **Given** environment is checked
    **CI Environment:** false
    **Production:** false
- **When** Windows-only operation _(skipped)_
- **And** platform-aware operation
- **Then** test completes appropriately

## ✅ Documenting error scenarios

- **Given** a validation function
    **Validation Rules**
    
    ```markdown
    - Input is required
    - Minimum length: 3
    - Maximum length: 100
    ```
    
- **When** empty input is validated
    **Validation Result (empty)**
    
    ```json
    {
      "valid": false,
      "errors": [
        "Input is required",
        "Input too short"
      ]
    }
    ```
    
- **And** short input is validated
    **Validation Result (short)**
    
    ```json
    {
      "valid": false,
      "errors": [
        "Input too short"
      ]
    }
    ```
    
- **And** valid input is validated
    **Validation Result (valid)**
    
    ```json
    {
      "valid": true,
      "errors": []
    }
    ```
    
- **Then** all error cases are documented
    **Error Scenarios**
    
    | Input | Expected Errors |
    | --- | --- |
    | (empty) | Input is required, Input too short |
    | ab | Input too short |
    | valid input | None |
    

## ⏩ Entire story marked as fixme

- **Given** this won't run until fixed
- **When** bug is present
- **Then** test would fail

## ⏩ Entire story skipped for maintenance

- **Given** this won't run
- **Then** nothing is tested

## ✅ Error recovery and fallback patterns

- **Given** a safe wrapper function
- **When** successful operation is wrapped
- **And** failing operation is wrapped
- **Then** errors are handled gracefully
    **Error Handling Patterns**
    
    | Pattern | Use Case | Playwright |
    | --- | --- | --- |
    | .fail | Expected failures | Yes |
    | .fixme | Known issues | Yes |
    | try/catch | Runtime capture | Standard |
    | toThrow | Error assertion | Standard |
    | Result type | Graceful degradation | Pattern |
    

## ❌ Expected failures with .fail modifier

- **Given** a function that throws
- **When** the function is called and throws _(expected to fail)_
- **Then** test continues after expected failure
**Failure**

```text
Error: This error is expected

[90m   at [39msrc/error-scenarios.story.spec.ts:28

  26 |
  27 |   when.fail("the function is called and throws", async () => {
> 28 |     throw new Error("This error is expected");
     |           ^
  29 |   });
  30 |
  31 |   then("test continues after expected failure", async () => {

Error: This error is expected
    at run (/Users/jreehal/dev/js/executable-stories/apps/playwright-example/src/error-scenarios.story.spec.ts:28:11)
    at wrapped (/Users/jreehal/dev/js/executable-stories/packages/playwright-executable-stories/src/bdd.ts:450:13)
    at wrappedWithDestructure (/Users/jreehal/dev/js/executable-stories/packages/playwright-executable-stories/src/bdd.ts:553:10)
```


## ⚠️ Fixme modifier for known issues

- **Given** setup for fixme test
- **When** action with known bug _(fixme)_
- **Then** test continues after fixme step

## ❌ Multiple expected failures in sequence

- **Given** setup that throws _(expected to fail)_
- **When** action that throws _(expected to fail)_
- **Then** assertion that throws _(expected to fail)_
- **And** normal step after failures
**Failure**

```text
Error: Setup error

[90m   at [39msrc/error-scenarios.story.spec.ts:40

  38 |
  39 |   given.fail("setup that throws", async () => {
> 40 |     throw new Error("Setup error");
     |           ^
  41 |   });
  42 |
  43 |   when.fail("action that throws", async () => {

Error: Setup error
    at run (/Users/jreehal/dev/js/executable-stories/apps/playwright-example/src/error-scenarios.story.spec.ts:40:11)
    at wrapped (/Users/jreehal/dev/js/executable-stories/packages/playwright-executable-stories/src/bdd.ts:450:13)
    at wrappedWithDestructure (/Users/jreehal/dev/js/executable-stories/packages/playwright-executable-stories/src/bdd.ts:553:10)
```


## ⏩ Page-level error handling

- **Given** a page with error-prone content
- **When** page error is expected
- **Then** page errors can be asserted

## ⚠️ Skip based on browser

- **Given** browser is detected
    **Browser:** chromium
- **When** webkit-only feature _(skipped)_
- **Then** test completes for other browsers

## ✅ Testing custom error types

- **Given** custom error classes exist
    **Error Classes**
    
    ```typescript
    class ValidationError extends Error {
      field: string;
      code: string;
    }
    
    class NetworkError extends Error {
      statusCode: number;
    }
    ```
    
- **When** validation error is thrown
- **And** network error is thrown
- **Then** custom errors are properly typed

## ✅ Testing errors with Playwright toThrow

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

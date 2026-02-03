# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-03T22:33:41.259Z |
| Version | 1.0.0 |
| Git SHA | afb3e1f |

## ✅ Async iteration over collections

- **Given** a collection of items
- **When** items are processed asynchronously
- **Then** all items are processed

## ⏩ Async page interactions

- **Given** a page is available
- **When** page content is set
- **And** button is clicked
- **Then** result is updated

## ✅ Async setup and teardown pattern

- **Given** database connection is established
    **Connection ID:** conn-123
- **And** transaction is started
    **Transaction ID:** tx-1770158032825
- **When** data is saved
- **Then** transaction can be committed
- **And** connection is still open for cleanup

## ✅ Async steps with runtime documentation

- **Given** async operation is prepared
    _Note:_ Preparation complete
    **Prep Time:** 5ms
- **When** async data is fetched
    **Fetched Data**
    
    ```json
    {
      "id": "789",
      "name": "User 789"
    }
    ```
    
- **Then** runtime docs contain async results
    **Final Verification:** passed

## ✅ Basic async/await in Playwright steps

- **Given** user ID is known
- **When** user data is fetched
- **Then** user data is available

## ✅ Custom timeout handling

- **Given** timer starts
- **When** operation with delay completes
- **Then** elapsed time is measurable
    **Elapsed (ms):** 169

## ✅ Error handling in async steps

- **Given** an async operation that might fail
- **When** the operation fails
- **Then** error is caught and can be asserted

## ❌ Expected async failure with .fail modifier

- **Given** setup for failing operation
- **When** async operation throws _(expected to fail)_
- **Then** test continues after expected failure
**Failure**

```text
Error: Expected async error

[90m   at [39msrc/async-patterns.story.spec.ts:264

  262 |   when.fail("async operation throws", async () => {
  263 |     await delay(5);
> 264 |     throw new Error("Expected async error");
      |           ^
  265 |   });
  266 |
  267 |   then("test continues after expected failure", async () => {

Error: Expected async error
    at /Users/jreehal/dev/js/executable-stories/apps/playwright-example/src/async-patterns.story.spec.ts:264:11
    at /Users/jreehal/dev/js/executable-stories/packages/playwright-executable-stories/src/bdd.ts:450:7
```


## ✅ Parallel async operations with Promise.all

- **Given** user is authenticated
- **When** user data and orders are fetched in parallel
    **Parallel Fetch Count:** 3
- **Then** all data is available
- **And** total order value is calculated

## ✅ Parallel iteration with Promise.all and map

- **Given** a collection of numbers
- **When** items are processed in parallel
- **Then** all items are doubled

## ⏩ Real-world async page test pattern

- **Given** user navigates to a form page
- **When** user fills the form
- **And** form is submitted
- **Then** submission message appears

## ✅ Sequential async operations

- **Given** nothing is loaded yet
- **When** user is fetched first
    **User fetched:** 456
- **And** then orders are fetched using user ID
    **Orders fetched:** 2
- **Then** both user and orders are available

## ⏩ Working with Playwright waits

- **Given** page with delayed content
- **When** waiting for text change
- **Then** content is loaded

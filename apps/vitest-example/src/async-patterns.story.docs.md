# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-03T22:33:38.390Z |
| Version | 1.0.0 |
| Git SHA | afb3e1f |

## ✅ Async iteration over collections

- **Given** a collection of items
- **When** items are processed asynchronously
- **Then** all items are processed

## ✅ Async setup and teardown pattern

- **Given** database connection is established
- **And** transaction is started
- **When** data is saved
- **Then** transaction can be committed
- **And** connection is still open for cleanup

## ✅ Async steps with callback parameter

- **Given** async setup via callback
- **When** async action via callback
- **Then** async assertion via callback

## ✅ Async steps with runtime documentation

- **Given** async operation is prepared
    _Note:_ Preparation complete
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

## ✅ Basic async/await in steps

- **Given** user ID is known
- **When** user data is fetched
- **Then** user data is available

## ✅ Concurrent steps with .concurrent modifier

- **Given** setup for concurrent execution
- **When** first concurrent operation _(concurrent)_
- **And** second concurrent operation _(concurrent)_
- **And** third concurrent operation _(concurrent)_
- **Then** all concurrent operations complete

## ✅ Error handling in async steps

- **Given** an async operation that might fail
- **When** the operation fails
- **Then** error is caught and can be asserted

## ✅ Expected async failure with .fails modifier

- **Given** setup for failing operation
- **When** async operation throws _(expected to fail)_
- **Then** test continues after expected failure

## ✅ Parallel async operations with Promise.all

- **Given** user is authenticated
- **When** user data and orders are fetched in parallel
- **Then** all data is available
- **And** total order value is calculated

## ✅ Parallel iteration with Promise.all and map

- **Given** a collection of numbers
- **When** items are processed in parallel
- **Then** all items are doubled

## ✅ Real-world async API test pattern

- **Given** API client is configured
- **When** GET request is made
- **And** POST request is made
- **Then** GET response is valid
- **And** POST response is valid
- **And** both responses have timestamps

## ✅ Sequential async operations

- **Given** nothing is loaded yet
- **When** user is fetched first
- **And** then orders are fetched using user ID
- **Then** both user and orders are available

## ✅ Working with timeouts and delays

- **Given** timer starts
- **When** operation with delay completes
- **Then** elapsed time is measurable

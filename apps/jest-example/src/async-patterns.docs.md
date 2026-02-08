# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-04T16:27:05.950Z |
| Version | 1.0.0 |
| Git SHA | 73f2377 |

#### ✅ Basic async/await in steps

> Steps can be async functions using async/await syntax
- **Given** user ID is known
- **When** user data is fetched
- **Then** user data is available

#### ✅ Parallel async operations with Promise.all

> Multiple async operations can run in parallel using Promise.all
- **Given** user is authenticated
- **When** user data and orders are fetched in parallel
- **Then** all data is available
- **And** total order value is calculated

#### ✅ Sequential async operations

> Some operations must be sequential due to dependencies
- **Given** nothing is loaded yet
- **When** user is fetched first
- **And** then orders are fetched using user ID
- **Then** both user and orders are available

#### ✅ Async setup and teardown pattern

> Setup and teardown can be async for database connections, etc.
- **Given** database connection is established
- **Given** transaction is started
- **When** data is saved
- **Then** transaction can be committed
- **Then** connection is still open for cleanup

#### ✅ Error handling in async steps

> Async errors should be properly caught and handled
- **Given** an async operation that might fail
- **When** the operation fails
- **Then** error is caught and can be asserted

#### ✅ Working with timeouts and delays

> Async operations can include deliberate delays for timing
- **Given** timer starts
- **When** operation with delay completes
- **Then** elapsed time is measurable

#### ✅ Async iteration over collections

> Processing collections asynchronously
- **Given** a collection of items
- **When** items are processed asynchronously
- **Then** all items are processed

#### ✅ Parallel iteration with Promise.all and map

> Processing all items in parallel for better performance
- **Given** a collection of numbers
- **When** items are processed in parallel
- **Then** all items are doubled

#### ✅ Real-world async API test pattern

> Simulates a complete async API test scenario
`async`
- **Given** API client is configured
- **When** GET request is made
- **When** POST request is made
- **Then** GET response is valid
- **Then** POST response is valid
- **Then** both responses have timestamps

#### ✅ Async steps with runtime documentation

> Runtime docs capture async operation results
- **Given** async operation is prepared
- **When** async data is fetched
- **Then** runtime docs contain async results

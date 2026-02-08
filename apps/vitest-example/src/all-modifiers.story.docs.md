# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-04T16:27:05.585Z |
| Version | 1.0.0 |
| Git SHA | 73f2377 |

## All Modifiers

### ✅ Skip modifier demonstration - normal steps only

> Step-level .skip is not supported; use it.skip() for whole test.
> Use it.skip() for the whole test instead

- **Given** a normal precondition
- **When** a normal action
- **Then** a normal assertion

### ✅ Todo modifier demonstration - implemented test

> Step-level .todo is not supported; use it.todo() for whole test.
> Use it.todo() for the whole test instead
`todo` `planning`

- **Given** setup is complete
- **When** user performs an action
- **Then** expected outcome is verified

### ✅ Fails modifier demonstration - using try/catch pattern

> Step-level .fails is not supported; use try/catch or expect().toThrow().
> Use try/catch or expect().toThrow() patterns instead
`error-handling`

- **Given** a precondition that should throw
- **When** an action that throws an error
- **Then** error is caught
- **Then** normal step continues after expected failure

### ✅ Fails modifier using expect().toThrow()

> Alternative pattern using Vitest toThrow matcher

- **Given** functions that throw errors
- **Then** toThrow catches the error

### ✅ Mixed modifiers in a realistic scenario

> Demonstrates combining patterns in a real-world scenario
`mixed`

- **Given** user is logged in
- **And** user has admin privileges
- **When** user accesses admin panel
- **Then** admin dashboard is displayed
- **But** no sensitive data is exposed

### ✅ Standard test with story markers

> Use standard it() tests with story markers

- **Given** normal step via story.given()
- **When** action via story.when()
- **Then** assertion via story.then()

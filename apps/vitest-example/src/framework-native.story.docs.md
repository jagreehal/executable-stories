# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-04T16:27:05.585Z |
| Version | 1.0.0 |
| Git SHA | 73f2377 |

## ✅ Framework-native test with story.init()


## ✅ Another framework-native test


## ✅ Framework-native test with multiple operations


## ✅ Using story markers for documentation

> The story callback receives steps from story.init(task)

- **Given** initial value
- **When** value is doubled
- **Then** value equals 20
    - **Final Value:** 20

## ✅ Using step aliases

> step.* aliases work with story.*

- **Given** message is set
- **When** message is appended
- **Then** message is complete

## ✅ Using steps object style

> Module-level steps via story.* methods

- **Given** count starts at zero
- **When** count is incremented
- **Then** count equals one

## ✅ Optional step callbacks for documentation-only steps

> Steps without callbacks are valid for documentation purposes

- **Given** user is logged in
- **Given** user has admin role
- **When** admin panel is accessed
- **Then** admin features are visible
- **Then** audit log is updated

## ✅ Using Vitest matchers in story steps

> All Vitest matchers work normally in story steps

- **Given** a user object
- **Then** toBe works
- **Then** toEqual works for objects
- **Then** toContain works for arrays
- **Then** toMatch works for strings
- **Then** toHaveLength works
- **Then** toHaveProperty works
- **Then** toBeDefined and toBeTruthy work

## ✅ Full doc API demonstration

> This story uses all doc API methods
`framework-native` `comprehensive`
- **Test Type:** Story
**Test Configuration**

```json
{
  "framework": "vitest",
  "pattern": "story-init",
  "hasStory": true
}
```

**Supported Patterns**

| Pattern | Supported |
| --- | --- |
| story.init(task) | Yes |
| story.note() | Yes |
| story.kv() | Yes |
| story.json() | Yes |
| story.table() | Yes |


- **Given** configuration is documented
- **Then** test passes with rich documentation

## ✅ Story with documentation only

> A story can exist with minimal implementation
`edge-case`
- **Has Steps:** true

- **Then** documentation is generated

## ✅ Story with options
Tags: `vitest`, `options`
Tickets: `VIT-001`

> Combining options with story.init pattern

- **Given** setup via options
- **When** action
- **Then** assertion

## Calculator operations - mixed patterns

### ✅ simple addition check


### ✅ Addition with story pattern

- **Given** two positive numbers
- **When** they are added
- **Then** the sum is returned

### ✅ multiplication check


## Stories with Vitest hooks

### ✅ Story demonstrating hook behavior

- **Given** state starts at zero
- **When** state is modified
- **Then** state reflects changes

### ✅ Another story with independent state

- **Given** state starts fresh for each story
- **Then** each story has its own state

## Parameterized tests with it.each

### ✅ add(1, 2) should return 3

- **Given** inputs 1 and 2
- **When** addition is performed
- **Then** result is 3

### ✅ add(5, 5) should return 10

- **Given** inputs 5 and 5
- **When** addition is performed
- **Then** result is 10

### ✅ add(-1, 1) should return 0

- **Given** inputs -1 and 1
- **When** addition is performed
- **Then** result is 0

## Edge cases - positive numbers

### ✅ adds two positives


## Edge cases - zero

### ✅ add with zero

> NOTE!!!!!


### ✅ add with one

> NOTE 2!!!!!

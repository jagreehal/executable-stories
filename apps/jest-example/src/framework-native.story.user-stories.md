# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-04T20:55:29.252Z |
| Version | 1.0.0 |
| Git SHA | 3149bef |

## src/framework-native.story.test.ts

#### ✅ Framework-native test with doc.story()


#### ✅ Another framework-native test


#### ✅ Framework-native test with multiple operations


#### ✅ doc.story() used as story() replacement

- **Given** numbers are ready
- **When** addition is performed
- **Then** result is correct

#### ✅ Calculator operations - mixed patterns simple addition check


#### ✅ Calculator operations - mixed patterns Addition with story pattern

- **Given** two positive numbers
- **When** they are added
- **Then** the sum is returned

#### ✅ Calculator operations - mixed patterns multiplication check


#### ✅ Using story object from module

> Module-level story object for global access
- **Given** count starts at zero
- **When** count is incremented
- **Then** count equals one

#### ✅ Stories with Jest hooks Story demonstrating hook behavior

- **Given** state starts at zero
- **When** state is modified
- **Then** state reflects changes

#### ✅ Stories with Jest hooks Another story with independent state

- **Given** state starts fresh for each story
- **Then** each story has its own state

#### ✅ Optional step callbacks for documentation-only steps

> Steps without callbacks are valid for documentation purposes
- **Given** user is logged in
- **Given** user has admin role
- **When** admin panel is accessed
- **Then** admin features are visible
- **Then** audit log is updated

#### ✅ Using Jest matchers in story steps

> All Jest matchers work normally in story steps
- **Given** a user object
- **Then** toBe works
- **Then** toEqual works for objects
- **Then** toContain works for arrays
- **Then** toMatch works for strings
- **Then** toHaveLength works
- **Then** toHaveProperty works
- **Then** toBeDefined and toBeTruthy work

#### ✅ Parameterized tests with describe.each add(1, 2) should return 3


#### ✅ Parameterized tests with describe.each add(5, 5) should return 10


#### ✅ Parameterized tests with describe.each add(-1, 1) should return 0


#### ✅ Framework-native test with full doc API

> This test uses doc API methods in a framework-native test
`framework-native` `comprehensive`
- **Test Type:** Native
**Test Configuration**

```json
{
  "framework": "jest",
  "pattern": "native",
  "hasStory": true
}
```

**Supported Patterns**

| Pattern | Supported |
| --- | --- |
| doc.story() | Yes |
| doc.note() | Yes |
| doc.kv() | Yes |
| doc.json() | Yes |
| doc.table() | Yes |
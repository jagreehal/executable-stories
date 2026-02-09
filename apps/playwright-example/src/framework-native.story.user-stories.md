# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-04T20:55:30.340Z |
| Version | 1.0.0 |
| Git SHA | 3149bef |

## src/framework-native.story.spec.ts

#### ✅ Framework-native test with doc.story()


#### ✅ Another framework-native test


#### ✅ Framework-native test with multiple operations


#### ✅ doc.story() used as story() replacement

- **Given** numbers are ready
- **When** addition is performed
- **Then** result is correct

#### ✅ Using story object from module

> Module-level story object for global access
- **Given** count starts at zero
- **When** count is incremented
- **Then** count equals one

#### ✅ Optional step callbacks for documentation-only steps

> Steps without callbacks are valid for documentation purposes
- **Given** user is logged in
- **Given** user has admin role
- **When** admin panel is accessed
- **Then** admin features are visible
- **Then** audit log is updated

#### ✅ Using Playwright expect in story steps

> All Playwright expect work normally in story steps
- **Given** a user object
- **Then** toBe works
- **Then** toEqual works for objects
- **Then** toContain works for arrays
- **Then** toMatch works for strings
- **Then** toHaveLength works
- **Then** toHaveProperty works
- **Then** toBeDefined and toBeTruthy work

#### ✅ Framework-native test with full doc API

> This test uses doc API methods in a framework-native test
`framework-native` `comprehensive`
- **Test Type:** Native
**Test Configuration**

```json
{
  "framework": "playwright",
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


### Calculator operations - mixed patterns

#### ✅ simple addition check


#### ✅ Addition with story pattern

- **Given** two positive numbers
- **When** they are added
- **Then** the sum is returned

#### ✅ multiplication check


### Stories with Playwright hooks

#### ✅ Story demonstrating hook behavior

- **Given** state starts at zero
- **When** state is modified
- **Then** state reflects changes

#### ✅ Another story with independent state

- **Given** state starts fresh for each story
- **Then** each story has its own state
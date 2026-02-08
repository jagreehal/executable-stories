# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-04T16:27:07.599Z |
| Version | 1.0.0 |
| Git SHA | 73f2377 |

### Step Aliases

#### ✅ AAA Pattern: Arrange-Act-Assert

> Classic testing pattern using arrange/act/assert aliases
`aaa-pattern`
- **Given** calculator is initialized
- **Given** input values are prepared
- **When** addition is performed
- **Then** result equals expected value
- **Then** result is a number

#### ✅ Setup-Execute-Verify Pattern

> Alternative naming using setup/execute/verify
`sev-pattern`
- **Given** service is configured
- **Given** dependencies are mocked
- **When** service processes input
- **Then** output is transformed correctly
- **Then** output is not empty

#### ✅ Context-Action Pattern

> Using context to establish state and action for operations
`context-action`
- **Given** user context is established
- **Given** permissions are set
- **When** user performs privileged operation
- **Then** operation succeeds

#### ✅ Mixed pattern usage

> Different aliases can be combined in the same story
`mixed`
- **Given** initial data exists
- **Given** data is validated
- **Given** sum accumulator is initialized
- **When** sum is calculated
- **Then** sum is correct
- **Then** sum is positive

#### ✅ User registration flow using aliases

> Realistic example using arrange/act/assert pattern
`user-flow` `registration`
- **Given** valid user data is prepared
- **Given** email is unique in the system
- **When** registration is submitted
- **Then** registration succeeds
- **Then** user ID is generated
- **Then** no error is returned

#### ✅ All alias styles comparison

> Comparison of all available step function aliases
**Step Function Aliases**

| Purpose | BDD Style | AAA Pattern | Alternative 1 | Alternative 2 |
| --- | --- | --- | --- | --- |
| Setup/Context | given | arrange | setup | context |
| Action/Execute | when | act | execute | action |
| Verify/Assert | then | assert | verify | - |
| Continue | and | - | - | - |
| Negative | but | - | - | - |

- **Given** BDD given step
- **When** BDD when step
- **Then** BDD then step
- **Given** AAA arrange step
- **When** AAA act step
- **Then** AAA assert step
- **Given** alternative setup step
- **When** alternative execute step
- **Then** alternative verify step
- **Given** alternative context step
- **When** alternative action step
- **And** continuation step
- **But** negative case step

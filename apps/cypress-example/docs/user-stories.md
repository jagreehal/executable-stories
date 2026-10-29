# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-10-29T12:10:42.985Z |
| Version | 1.0.0 |
| Git SHA | 6a0b9ee |
| Source | accumulated from 6 runs (2026-10-29T12:10:35.418Z to 2026-10-29T12:10:43.088Z) |

## cypress/e2e/calculator.story.cy.ts

### Calculator

### ✅ Calculator adds two numbers

- **Given** two numbers 5 and 3
- **When** the numbers are added
    **calculator**
    
    <details>
    <summary>snapshot</summary>
    
    ```json
    {
      "a": 5,
      "b": 3,
      "result": 8
    }
    ```
    
    </details>
    
- **Then** the result is 8

### ✅ Calculator subtracts two numbers

- **Given** two numbers 10 and 4
- **When** the second is subtracted from the first
- **Then** the result is 6

### ✅ Calculator multiplies two numbers

- **Given** two numbers 7 and 6
    > This is a note3
- **When** the numbers are multiplied
- **Then** the result is 42

### ✅ Calculator divides two numbers

- **Given** two numbers 20 and 4
- **When** the first is divided by the second
- **Then** the result is 5

### ✅ Calculator throws error on division by zero

> Division by zero should throw an error
- **Given** a number 10 and zero
- **When** division is attempted
- **Then** an error is thrown

## cypress/e2e/gherkin-patterns.story.cy.ts

### Gherkin patterns

### ✅ User logs in successfully

- **Given** the user account exists
- **And** the user is on the login page
- **And** the account is active
- **When** the user submits valid credentials
- **Then** the user should see the dashboard

### ✅ User updates profile settings

- **Given** the user is logged in
- **When** the user navigates to settings
- **And** the user changes their display name
- **Then** the changes should be saved

### ✅ Successful order confirmation

- **Given** the user has items in cart
- **When** the user completes checkout
- **Then** the order should be created
- **And** a confirmation email should be sent
- **And** the inventory should be updated

### ✅ Login blocked for suspended user

- **Given** the user account exists
- **And** the account is suspended
- **When** the user submits valid credentials
- **Then** the user should see an error message
- **But** the user should not be logged in
- **But** the session should not be created

### ✅ Bulk user creation with table

- **Given** the following users exist
    **Users**
    
    | email | role | status |
    | --- | --- | --- |
    | alice@example.com | admin | active |
    | bob@example.com | user | active |
    | charlie@example.com | viewer | pending |
    
- **When** admin imports the list
- **Then** all users are created

## cypress/e2e/step-aliases.story.cy.ts

### Step Aliases

### ✅ AAA Pattern: Arrange-Act-Assert

> Classic testing pattern using arrange/act/assert aliases
`aaa-pattern`
- **Given** calculator is initialized
- **And** input values are prepared
- **When** addition is performed
- **Then** result equals expected value
- **And** result is a number

### ✅ Setup-Execute-Verify Pattern

> Alternative naming using setup/execute/verify
`sev-pattern`
- **Given** service is configured
- **And** dependencies are mocked
- **When** service processes input
- **Then** output is transformed correctly
- **And** output is not empty

### ✅ Context-Action Pattern

> Using context to establish state and action for operations
`context-action`
- **Given** user context is established
- **And** permissions are set
- **When** user performs privileged operation
- **Then** operation succeeds

### ✅ Mixed pattern usage

> Different aliases can be combined in the same story
`mixed`
- **Given** initial data exists
- **And** data is validated
- **And** sum accumulator is initialized
- **When** sum is calculated
- **Then** sum is correct
- **And** sum is positive

## cypress/e2e/step-callbacks.story.cy.ts

### Step Callbacks

### ✅ Calculator adds two numbers using step callbacks

- **Given** number a is 5
- **And** number b is 3
- **When** the numbers are added
- **Then** the result is 8

### ✅ Mixed markers and step callbacks

- **Given** the calculator is ready
- **When** we multiply 7 by 6
- **Then** the result is 42
- **And** the result is a positive number

### ✅ Step callbacks with inline docs still use marker-only

- **Given** valid credentials
    **Credentials**
    
    ```json
    {
      "email": "user@example.com"
    }
    ```
    
- **When** login is attempted
- **Then** user is authenticated
- **But** rate limit is not exceeded

## cypress/e2e/story-options.story.cy.ts

### Story options

### ✅ Story with single tag
Tags: `smoke`

> Single tag for basic categorization
- **Given** a tagged story
- **When** tests are filtered
- **Then** this story matches the 'smoke' tag

### ✅ Story with multiple tags
Tags: `critical`, `regression`, `smoke`

> Multiple tags for flexible filtering
- **Given** a story with multiple tags
- **When** tests are filtered by any tag
- **Then** this story matches multiple filters

### ✅ Story with single ticket
Tickets: `JIRA-123`

> Links story to a single issue tracker ticket
- **Given** a story linked to JIRA-123
- **When** documentation is generated
- **Then** ticket reference appears in docs

### ✅ Story with multiple tickets
Tickets: `JIRA-123`, `JIRA-456`, `JIRA-789`

> Story can be linked to multiple tickets
- **Given** a story linked to multiple tickets
- **When** requirements are tracked
- **Then** all ticket references are documented

### ✅ Story with simple metadata

> Custom metadata attached to story
- **Given** a story with custom metadata
- **Then** metadata is available in reports

### ✅ Story with all options combined
Tags: `critical`, `feature:checkout`, `smoke` | Tickets: `PROJ-456`

> All story options used together
- **Given** a fully configured story
- **When** documentation is generated
- **Then** all options appear in output

### ✅ Login feature - happy path
Tags: `auth`, `login`, `smoke` | Tickets: `AUTH-001`

- **Given** user is on login page
- **When** user enters valid credentials
- **Then** user is logged in successfully

## cypress/e2e/wrapped-steps.story.cy.ts

### Wrapped Steps (fn/expect)

### ✅ Calculator adds two numbers using fn and expect

- **Given** number a is 5
- **And** number b is 3
- **When** the numbers are added
- **Then** the result is 8

### ✅ Calculator subtracts using fn with timing

- **Given** two numbers 10 and 4
- **When** the second is subtracted from the first
- **Then** the result is 6

### ✅ Calculator division by zero captured in fn

- **Given** a number 10 and zero
- **Then** division by zero throws an error

### ✅ Mixed markers and wrapped steps

- **Given** the calculator is ready
- **When** we multiply 7 by 6
- **Then** the result is 42
- **And** the result is a positive number
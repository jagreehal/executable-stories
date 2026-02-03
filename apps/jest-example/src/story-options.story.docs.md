# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-03T22:33:39.192Z |
| Version | 1.0.0 |
| Git SHA | afb3e1f |

## ✅ Complete story configuration example
Tags: `integration`, `api`, `v2`, `feature:user-management`
Tickets: `EPIC-100`, `STORY-201`, `TASK-302`

- **Given** complete story configuration
- **When** documentation is generated
- **Then** rich metadata enables advanced reporting

## ✅ Login feature - happy path
Tags: `smoke`, `auth`, `login`
Tickets: `AUTH-001`

- **Given** user is on login page
- **When** user enters valid credentials
- **Then** user is logged in successfully

## ✅ Login feature - invalid password
Tags: `regression`, `auth`, `login`, `negative`
Tickets: `AUTH-001`, `AUTH-015`

- **Given** user is on login page
- **When** user enters invalid password
- **Then** error message is displayed

## ✅ Payment processing
Tags: `critical`, `payment`, `checkout`
Tickets: `PAY-100`

- **Given** user has items in cart
- **When** user completes payment
- **Then** payment is processed successfully

## ✅ Story options combined with doc API
Tags: `api`, `comprehensive`
Tickets: `DOC-789`

- **Given** story with options and doc methods
- **When** both are used
- **Then** they work together seamlessly

## ✅ Story with all options combined
Tags: `smoke`, `critical`, `feature:checkout`
Tickets: `PROJ-456`

- **Given** a fully configured story
- **When** documentation is generated
- **Then** all options appear in output

## ✅ Story with complex metadata

- **Given** a story with rich metadata
- **When** reports are generated
- **Then** all metadata is preserved

## ✅ Story with different ticket formats
Tickets: `JIRA-123`, `GH-456`, `BUG-789`

- **Given** tickets from JIRA, GitHub, and bug tracker
- **Then** all formats are supported

## ✅ Story with empty meta object

- **Given** story with empty meta
- **Then** story still works

## ✅ Story with empty tags array

- **Given** story with empty tags
- **Then** story still works

## ✅ Story with feature tags
Tags: `feature:auth`, `feature:login`

- **Given** a story tagged by feature
- **Then** feature filtering is possible

## ✅ Story with multiple tags
Tags: `smoke`, `regression`, `critical`

- **Given** a story with multiple tags
- **When** tests are filtered by any tag
- **Then** this story matches multiple filters

## ✅ Story with multiple tickets
Tickets: `JIRA-123`, `JIRA-456`, `JIRA-789`

- **Given** a story linked to multiple tickets
- **When** requirements are tracked
- **Then** all ticket references are documented

## ✅ Story with only meta

- **Given** story with only meta option
- **Then** other options are optional

## ✅ Story with only tags
Tags: `minimal`

- **Given** story with only tags option
- **Then** other options are optional

## ✅ Story with only ticket
Tickets: `MIN-001`

- **Given** story with only ticket option
- **Then** other options are optional

## ✅ Story with simple metadata

- **Given** a story with custom metadata
- **Then** metadata is available in reports

## ✅ Story with single tag
Tags: `smoke`

- **Given** a tagged story
- **When** tests are filtered
- **Then** this story matches the 'smoke' tag

## ✅ Story with single ticket
Tickets: `JIRA-123`

- **Given** a story linked to JIRA-123
- **When** documentation is generated
- **Then** ticket reference appears in docs

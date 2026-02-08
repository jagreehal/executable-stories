# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-04T20:55:30.340Z |
| Version | 1.0.0 |
| Git SHA | 3149bef |

## src/story-options.story.spec.ts

#### ✅ Story with single tag
Tags: `smoke`

> Single tag for basic categorization
- **Given** a tagged story
- **When** tests are filtered
- **Then** this story matches the 'smoke' tag

#### ✅ Story with multiple tags
Tags: `critical`, `regression`, `smoke`

> Multiple tags for flexible filtering
- **Given** a story with multiple tags
- **When** tests are filtered by any tag
- **Then** this story matches multiple filters

#### ✅ Story with feature tags
Tags: `feature:auth`, `feature:login`

> Tags can use prefixes for organization
- **Given** a story tagged by feature
- **Then** feature filtering is possible

#### ✅ Story with single ticket
Tickets: `JIRA-123`

> Links story to a single issue tracker ticket
- **Given** a story linked to JIRA-123
- **When** documentation is generated
- **Then** ticket reference appears in docs

#### ✅ Story with multiple tickets
Tickets: `JIRA-123`, `JIRA-456`, `JIRA-789`

> Story can be linked to multiple tickets
- **Given** a story linked to multiple tickets
- **When** requirements are tracked
- **Then** all ticket references are documented

#### ✅ Story with different ticket formats
Tickets: `JIRA-123`, `GH-456`, `BUG-789`

> Different ticket systems can be referenced
- **Given** tickets from JIRA, GitHub, and bug tracker
- **Then** all formats are supported

#### ✅ Story with simple metadata

> Custom metadata attached to story
- **Given** a story with custom metadata
- **Then** metadata is available in reports

#### ✅ Story with complex metadata

> Metadata can contain nested structures and arrays
- **Given** a story with rich metadata
- **When** reports are generated
- **Then** all metadata is preserved

#### ✅ Story with all options combined
Tags: `critical`, `feature:checkout`, `smoke` | Tickets: `PROJ-456`

> All story options used together
- **Given** a fully configured story
- **When** documentation is generated
- **Then** all options appear in output

#### ✅ Complete story configuration example
Tags: `api`, `feature:user-management` | Tickets: `EPIC-100`, `STORY-201`, `TASK-302`

> Comprehensive example with realistic metadata
`documentation-example`
- **Given** complete story configuration
- **When** documentation is generated
- **Then** rich metadata enables advanced reporting

#### ✅ Story options combined with doc API
Tags: `api`, `comprehensive` | Tickets: `DOC-789`

> Story options and doc API complement each other
`additional-tag`
- **Additional Key:** Additional Value
**Options vs Doc API**

| Aspect | Story Options | Doc API |
| --- | --- | --- |
| When Set | Declaration time | Anytime |
| Structure | Fixed schema | Flexible |
| Use Case | Filtering/Reporting | Rich docs |

- **Given** story with options and doc methods
- **When** both are used
- **Then** they work together seamlessly

#### ✅ Login feature - happy path
Tags: `auth`, `login`, `smoke` | Tickets: `AUTH-001`

- **Given** user is on login page
- **When** user enters valid credentials
- **Then** user is logged in successfully

#### ✅ Login feature - invalid password
Tags: `auth`, `login`, `negative`, `regression` | Tickets: `AUTH-001`, `AUTH-015`

- **Given** user is on login page
- **When** user enters invalid password
- **Then** error message is displayed

#### ✅ Payment processing
Tags: `checkout`, `critical`, `payment` | Tickets: `PAY-100`

> Payment tests require special handling
- **Given** user has items in cart
- **When** user completes payment
- **Then** payment is processed successfully

#### ✅ Story with empty tags array

- **Given** story with empty tags
- **Then** story still works

#### ✅ Story with empty meta object

- **Given** story with empty meta
- **Then** story still works

#### ✅ Story with only tags
Tags: `minimal`

- **Given** story with only tags option
- **Then** other options are optional

#### ✅ Story with only ticket
Tickets: `MIN-001`

- **Given** story with only ticket option
- **Then** other options are optional

#### ✅ Story with only meta

- **Given** story with only meta option
- **Then** other options are optional
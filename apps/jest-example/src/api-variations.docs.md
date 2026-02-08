# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-04T16:27:05.950Z |
| Version | 1.0.0 |
| Git SHA | 73f2377 |

#### ✅ Framework native with doc.story


#### ✅ Optional callbacks for all step keywords

- **Given** given context without callback
- **When** when action without callback
- **Then** then assertion without callback
- **And** and additional step without callback
- **Given** arrange context without callback
- **When** act action without callback
- **Then** assert with callback
- **Given** setup context without callback
- **Given** context setup without callback
- **When** execute action without callback
- **When** action execute without callback
- **Then** verify with callback

#### ✅ Multiple steps become And

- **Given** first given
- **Given** second given becomes And
- **When** first when
- **When** second when becomes And
- **Then** first then
- **Then** second then becomes And

#### ✅ Story with metadata
Tags: `smoke`, `api` | Tickets: `JIRA-123`

- **Given** context
- **Then** assertion

#### ✅ Story with notes and tags

> This is a note about the story
`smoke`
`api` `important`
- **Given** context
    - **key:** value
- **Then** assertion

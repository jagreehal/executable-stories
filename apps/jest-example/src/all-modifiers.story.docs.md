# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-03T18:04:09.763Z |
| Version | 1.0.0 |
| Git SHA | 6177ca3 |

## ⏩ Entirely skipped story

- **Given** this will not run
- **When** this will not run either
- **Then** and this definitely will not run

## ✅ Fails modifier demonstration

- **Given** a precondition that should throw
- **When** an action that throws an error _(expected to fail)_
- **And** a precondition that throws _(expected to fail)_
- **Then** an assertion that throws _(expected to fail)_
- **And** normal step continues after expected failures

## ⚠️ Mixed modifiers in a realistic scenario

- **Given** user is logged in
- **And** user has admin privileges
- **When** user accesses admin panel
- **Then** admin dashboard is displayed
- **And** user sees pending notifications _(skipped)_
- **And** user clicks on analytics widget _(todo)_
- **And** detailed analytics are shown _(todo)_
- **But** no sensitive data is exposed

## ⚠️ Skip modifier demonstration

- **Given** a normal precondition
- **And** a skipped precondition _(skipped)_
- **When** a normal action
- **And** a skipped action _(skipped)_
- **Then** a normal assertion
- **And** a skipped assertion _(skipped)_
- **And** a skipped and step _(skipped)_
- **But** a skipped but step _(skipped)_

## ⚠️ Todo modifier demonstration

- **Given** setup is complete
- **When** user performs an action that is not yet implemented _(todo)_
- **Then** expected outcome to be verified later _(todo)_
- **And** additional verification pending _(todo)_
- **But** negative case to be added _(todo)_

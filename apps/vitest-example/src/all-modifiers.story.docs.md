# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-03T22:33:38.390Z |
| Version | 1.0.0 |
| Git SHA | afb3e1f |

## ✅ Concurrent modifier demonstration

- **Given** setup for concurrent steps
- **When** first concurrent action _(concurrent)_
- **And** second concurrent action _(concurrent)_
- **And** third concurrent action _(concurrent)_
- **Then** all concurrent actions complete

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

## ⚠️ Modifiers via callback parameter

- **Given** normal step via callback
- **And** skipped step via callback _(skipped)_
- **When** todo step via callback _(todo)_
- **And** failing step via callback _(expected to fail)_
- **And** concurrent step via callback _(concurrent)_
- **Then** assertion via callback

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

# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-03T22:33:41.259Z |
| Version | 1.0.0 |
| Git SHA | afb3e1f |

## ⏩ Entirely skipped story

- **Given** this will not run
- **When** this will not run either
- **Then** and this definitely will not run

## ❌ Fail modifier demonstration

- **Given** setup for failing test
- **When** action that is expected to fail _(expected to fail)_
- **Then** test continues after expected failure
**Failure**

```text
Error: This failure is expected

[90m   at [39msrc/all-modifiers.story.spec.ts:106

  104 |
  105 |   when.fail("action that is expected to fail", async () => {
> 106 |     throw new Error("This failure is expected");
      |           ^
  107 |   });
  108 |
  109 |   then("test continues after expected failure", async () => {

Error: This failure is expected
    at run (/Users/jreehal/dev/js/executable-stories/apps/playwright-example/src/all-modifiers.story.spec.ts:106:11)
    at wrapped (/Users/jreehal/dev/js/executable-stories/packages/playwright-executable-stories/src/bdd.ts:450:13)
    at wrappedWithDestructure (/Users/jreehal/dev/js/executable-stories/packages/playwright-executable-stories/src/bdd.ts:553:10)
```


## ⚠️ Fixme modifier demonstration

- **Given** a precondition for fixme test
- **When** action that needs fixing _(fixme)_
- **Then** test continues

## ⚠️ Mixed modifiers in a realistic scenario

- **Given** user is logged in
- **And** user has admin privileges
- **When** user accesses admin panel
- **Then** admin dashboard is displayed
- **And** user sees pending notifications _(skipped)_
- **And** user clicks on analytics widget _(todo)_
- **And** detailed analytics are shown _(todo)_
- **And** user exports data _(fixme)_
- **But** no sensitive data is exposed

## ⚠️ Modifiers with Playwright fixtures

- **Given** page is available
- **When** skipped step with fixtures _(skipped)_
- **Then** fixtures are accessible in all step types

## ⚠️ Skip modifier demonstration

- **Given** a normal precondition
- **And** a skipped precondition _(skipped)_
- **When** a normal action
- **And** a skipped action _(skipped)_
- **Then** a normal assertion
- **And** a skipped assertion _(skipped)_
- **And** a skipped and step _(skipped)_
- **But** a skipped but step _(skipped)_

## ✅ Slow modifier demonstration

- **Given** setup for slow test
- **When** slow action with extended timeout _(slow)_
- **Then** slow test completes

## ✅ Slow story with extended timeout

- **Given** setup for slow operations
- **When** slow operations run
- **Then** slow story completes

## ⏩ Story marked as fixme

- **Given** this won't run until fixed
- **Then** story is skipped until fixed

## ⚠️ Todo modifier demonstration

- **Given** setup is complete
- **When** user performs an action that is not yet implemented _(todo)_
- **Then** expected outcome to be verified later _(todo)_
- **And** additional verification pending _(todo)_
- **But** negative case to be added _(todo)_

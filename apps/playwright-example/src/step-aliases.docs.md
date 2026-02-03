# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-03T22:33:41.259Z |
| Version | 1.0.0 |
| Git SHA | afb3e1f |

## ✅ AAA Pattern: Arrange-Act-Assert

- **Given** calculator is initialized
- **And** input values are prepared
- **When** addition is performed
- **Then** result equals expected value
- **And** result is a number

## ⚠️ Aliases support all Playwright modifiers

- **Given** normal arrangement
- **And** skipped arrangement _(skipped)_
- **And** todo arrangement _(todo)_
- **And** fixme arrangement _(fixme)_
- **When** normal action
- **And** skipped action _(skipped)_
- **And** todo action _(todo)_
- **Then** normal assertion
- **And** skipped assertion _(skipped)_
- **And** todo assertion _(todo)_
- **And** skipped setup _(skipped)_
- **And** todo setup _(todo)_
- **And** skipped execution _(skipped)_
- **And** todo execution _(todo)_
- **And** final verification
- **And** skipped verification _(skipped)_
- **And** todo verification _(todo)_
- **And** skipped context _(skipped)_
- **And** todo context _(todo)_
- **And** skipped action step _(skipped)_
- **And** todo action step _(todo)_

## ❌ Aliases with fail modifier

- **Given** setup complete
- **And** arrangement that should fail _(expected to fail)_
- **When** action that should fail _(expected to fail)_
- **Then** assertion that should fail _(expected to fail)_
- **And** test continues after expected failures
**Failure**

```text
Error: Expected arrangement error

[90m   at [39msrc/step-aliases.story.spec.ts:259

  257 |
  258 |   arrange.fail("arrangement that should fail", async () => {
> 259 |     throw new Error("Expected arrangement error");
      |           ^
  260 |   });
  261 |
  262 |   act.fail("action that should fail", async () => {

Error: Expected arrangement error
    at run (/Users/jreehal/dev/js/executable-stories/apps/playwright-example/src/step-aliases.story.spec.ts:259:11)
    at wrapped (/Users/jreehal/dev/js/executable-stories/packages/playwright-executable-stories/src/bdd.ts:450:13)
    at wrappedWithDestructure (/Users/jreehal/dev/js/executable-stories/packages/playwright-executable-stories/src/bdd.ts:553:10)
```


## ✅ Aliases with slow modifier

- **Given** setup complete
- **And** slow arrangement _(slow)_
- **When** slow action _(slow)_
- **Then** slow assertion _(slow)_
- **And** all slow operations complete

## ✅ All alias styles comparison

- **Given** BDD given step
- **When** BDD when step
- **Then** BDD then step
- **And** AAA arrange step
- **And** AAA act step
- **And** AAA assert step
- **And** alternative setup step
- **And** alternative execute step
- **And** alternative verify step
- **And** alternative context step
- **And** alternative action step
- **And** continuation step
- **But** negative case step

## ✅ Context-Action Pattern

- **Given** user context is established
- **And** permissions are set
- **When** user performs privileged operation
- **Then** operation succeeds

## ✅ Mixed pattern usage

- **Given** initial data exists
- **And** data is validated
- **And** sum accumulator is initialized
- **When** sum is calculated
- **Then** sum is correct
- **And** sum is positive

## ✅ Setup-Execute-Verify Pattern

- **Given** service is configured
- **And** dependencies are mocked
- **When** service processes input
- **Then** output is transformed correctly
- **And** output is not empty

## ✅ User registration flow using aliases

- **Given** valid user data is prepared
- **And** email is unique in the system
- **When** registration is submitted
- **Then** registration succeeds
- **And** user ID is generated
- **And** no error is returned

## ⏩ Using aliases with Playwright fixtures

- **Given** page fixture is available in arrange
- **When** page fixture is available in act
- **Then** page fixture is available in assert

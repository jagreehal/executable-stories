---
'executable-stories-init': minor
---

`--from-cucumber` converts a CucumberJS suite. For every `.feature` file it
writes a `.story.test.ts` beside it, keeping the Gherkin text on `story.given` /
`when` / `then` markers, a Background as a function each scenario calls, tags on
`story.init`, data tables as `story.table`, doc strings as `story.code`, a Rule
as a nested `describe`, and one test per `Examples` row. Keywords are read
through the parser's dialect table, so non-English feature files convert too.

Step definitions are not ported, because the runner reaches them through a regex
and a shared World. Each converted scenario ends in an `unported()` call that
throws, so the suite is red until someone supplies the code, and the failing
count is the migration burndown.

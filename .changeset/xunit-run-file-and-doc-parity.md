---
"executable-stories-formatters": patch
---

xUnit: the run file lands in your project, and the report carries more of the run

`dotnet test` runs the test host out of `bin/<config>/<tfm>`. The xUnit adapter
now resolves the project directory from the test assembly, so
`.executable-stories/raw-run.json` sits beside your test project and `projectRoot`
names the directory the report's relative paths are meant to resolve against. A
relative `EXECUTABLE_STORIES_OUTPUT` anchors to the same place, and
`EXECUTABLE_STORIES_PROJECT_ROOT` sets it outright for a layout that puts build
output elsewhere. The file is renamed into place, so a watch task reading it while
a run finishes always sees a whole document.

Runs now report `coveredSourceFiles`, every test class the recording attribute
saw, so a class emptied of scenarios is distinguishable from one the run never
reached and a `full`-scope run can retire what it no longer names. That holds for
a run whose classes told no story at all, which is the case the inventory exists
for. Runs also carry `gitSha`, resolved from CI first and `git rev-parse`
otherwise, so a report states the commit it describes.

`Story.Planned` keys a plan to its own class — through xUnit's test context, so it
holds when the plan is declared after an `await` — and it groups with that class's
scenarios and its feature declaration. `Story.Video(path, caption?, poster?)`
completes the doc-entry surface against the raw-run schema.

The xUnit reference and the `xunit-story-api` skill now cover feature
declarations, planned scenarios, video, and the real signatures for attachments,
timing, `Story.Fn` and `Story.Expect`; prerequisites read .NET 10 and xUnit v3
throughout. `verify:xunit` exercises the default output path and asserts the
covered-class inventory and a plan's source key.

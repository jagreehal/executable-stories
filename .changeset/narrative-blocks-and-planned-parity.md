---
"executable-stories-react": minor
"executable-stories-playwright": minor
"executable-stories-cypress": minor
---

Narrative blocks, planned scenarios in every adapter, and marked authorship

**Narrative blocks.** Two `story.custom` types render in every report surface with
no setup: `file-tree` (directories derived from a flat path list) and
`data-model` (fields as a table). They ride the existing custom-entry API, so all
eleven adapters can emit them without an adapter change. Both take an optional
`change` of `added` / `modified` / `removed` / `renamed`, rendered as an
uncoloured badge, because colour in this report means test status and a green
"added" beside a failing scenario would misread. A payload that does not parse
renders as its raw data marked "unrecognised shape" rather than vanishing.
Exported as `FileTreeBlock`, `DataModelBlock`, and `narrativeBlockRenderers`; a
`customRenderers` entry for the same type still wins.

**Marked authorship.** `authored: "agent"` on either payload renders
"AI-authored, not verified by a run". A block drawn from a diff never executed,
and left unmarked it would sit beside real evidence looking equally trustworthy.

**Planned scenarios everywhere.** `RawStatus` has always had `todo`, the ACL has
always turned it into `scenario.planned`, and both formatters have always
rendered it. Only Vitest and Jest ever emitted one. Playwright now reads
`test.fixme("title")` off the suite in `onEnd`, and Cypress reads a bodyless
`it("title")`, which Mocha reports as pending with no `fn`. `it.skip(title, fn)`
keeps its body and stays a skip. Both keep the rule that only files containing
real story tests contribute.

The six non-JS adapters gain an explicit call: `es.Planned(t, "…")` in Go,
`ExecutableStories.planned` in Ruby, `Story::planned` in Rust, `story.planned` in
pytest, `Story.planned` in JUnit 5, and `Story.Planned` in xUnit. They take a
call rather than reusing `t.Skip`, `@Disabled`, `#[ignore]`, or `Skip = "…"`,
because those mean "do not run this now", which is a different claim from "we
have not built this yet". Conflating them would drop every quarantined test into
your plan.

A planned declaration only becomes `todo` when the test itself came out clean.
Code after the declaration can still fail, and reporting that failure as
"planned" would hide a broken test behind a plan, so pytest, JUnit 5, and Go keep
the real outcome. Ruby, Rust, and xUnit record at the point of the call because
their hosts offer no later hook; their docs say so.

Playwright deduplicates by test id, and its planned cases carry `projectName`
like every other scenario. A story that runs and then calls `test.fixme()` is
already collected as skipped and would otherwise have been counted a second time
as planned; eligibility is keyed on project plus source file, so a spec with
story tests under one project does not vouch for another. Ruby fills the source
location from the caller, so a planned scenario sits with the rest of its file
instead of under an unknown feature.

Each example app now declares a planned scenario, and `validate_raw_run` fails
any adapter whose run contains none, so the parity cannot quietly rot.

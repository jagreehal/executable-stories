---
name: cloud-migrate
description: Use when a team is moving manual test cases into Executable Stories Cloud from TestRail, Xray, Qase, Zephyr, Testmo, QTest, Testomat or a spreadsheet — preparing the CSV so the importer maps it without a column picker, running the TestRail importer, or moving a whole organisation between instances. Triggers include "import our TestRail cases", "migrate from Qase", "bring this spreadsheet in", "move our org to the new instance".
---

# Migrate into the cloud

Two doors, both idempotent on section + title, so re-running an import never
duplicates a case: the **TestRail importer** (direct, keeps run history) and
**CSV import** (any tool that can export a spreadsheet). Moving an
organisation between instances is export + restore, in `executable-stories-cloud`.

Cases arrive as manual behaviours in the catalogue. They sit beside the
code-derived ones, take the same tags, priority and parameters, and run in
the same manual runner. Nothing about a case is lost by importing: the raw
source row is kept on the behaviour.

## TestRail

`/import` in the UI: TestRail base URL, email, API key, project id. Sections
become section paths, cases become manual behaviours, and the raw case JSON
is kept. Run history comes across as executions. Re-run it after the cutover
date to pick up anything added since; existing cases are matched, not
duplicated.

## Any other tool: CSV

Export from the source tool, then upload or paste at `/import`. The preview
shows the cases it will create, the columns it mapped and the columns it
ignored **before anything is written**. Read the preview to the user; the
ignored columns are where a migration silently loses data.

Headers are matched by synonym, so there is no source picker. Rename columns
in the export to one of these when the preview misses them:

| Field | Accepted headers |
| --- | --- |
| title (required) | title, name, summary, case, test case, test, scenario |
| section | section, suite, folder, feature, group, path |
| steps | steps, steps_actions, step, action, and the TestRail / Qase / Zephyr step columns |
| expected | expected, expected result, expected results, steps_result |
| priority | priority, severity (words like "high", "P1", "critical" are read) |

One row per step (Zephyr, Testmo, QTest exports) is folded into one case: rows
with an empty title continue the case above. A multi-line steps cell is one
step per line.

Before uploading:

1. Export with sections or folder paths included; without them every case
   lands in one section.
2. Check the title column is unique within a section. Two rows with the same
   section and title are one case to the importer.
3. Strip tool-specific ids you do not want in titles (`C1234 Login works`
   → `Login works`); put the id in a tag column if it matters.

## After the import

- Catalogue query `source == manual` lists everything that came in;
  `source == manual and priority == critical` narrows to what needs a run
  first.
- Tag imported cases (`bulk → tag`) with the source, e.g. `from:testrail`,
  so the origin is filterable later.
- Cases that a test already proves should be retired, not kept as manual
  twins: `test-management-bridge` finds them.

## Rules

- Never write without showing the preview first.
- Never merge two organisations with restore; it refuses a non-empty target
  by design.
- Report the ignored-columns list every time, even when it is empty.

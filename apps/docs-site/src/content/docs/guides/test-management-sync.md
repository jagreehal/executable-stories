---
title: TestRail and Xray sync
description: Compare your stories against a test-management system, then push cases, executions, and evidence from the same run
---

Your tests already describe the behaviour. A test-management system holds a second, hand-maintained copy of the same descriptions, and someone updates it by hand after every release.

Two commands close that gap:

- `coverage` reads the system and reports what your tests already cover. Read-only, needs nothing but an API key.
- `sync` pushes cases authored from your tests, records executions against them, and attaches evidence.

Supported targets: TestRail and Xray (Jira Cloud).

## Jira: pick the workflow you want

Three features touch Jira and they do unrelated things. Pick by what you want to land there:

| You want | Use |
| --- | --- |
| Test cases and executions in Jira | `sync xray`, this page |
| Your living docs in a Jira issue or Confluence page | `publish-jira` and `publish-confluence`, see [Publishing to Confluence & Jira](/guides/publishing-to-atlassian/) |
| A scenario that links out to its ticket | `story.init(task, { ticket: "PROJ-42" })`, see [Vitest story API](/reference/vitest-story-api/) |

Plain Jira holds no test cases, so nothing on this page works against Jira alone. Xray supplies the case and execution model that `sync` writes to. We have not built a Zephyr adapter yet.

## Before you start

You need a raw run JSON file. Your reporter writes it, so run your tests first and check the path. Vitest, Jest, Playwright, and Cypress write wherever `rawRunPath` points; the Go, Ruby, Rust, pytest, JUnit 5, and xUnit adapters default to `.executable-stories/raw-run.json`. See [Setup decision tree](/guides/setup-decision-tree/) if you have not wired a reporter yet.

Point these commands at that raw run. A StoryReport has already dropped the attachment bodies and source paths that `sync` uploads, so the CLI stops and says so rather than syncing a stripped copy.

## Start read-only

```bash
executable-stories coverage testrail reports/raw-run.json
```

```
testrail: ACME / Web Regression (412 cases)

   118  automated        already covered by a story
    31  duplicated       manual case duplicates an automated story
     7  possible dupe    similar to a story, needs a human to confirm
   249  manual only      no automated equivalent
    14  untracked        story with no case

Biggest overlap: "Checkout" section, 47 of 52 automated.
```

Three files come out of this: the summary above on stdout, `reports/sync-coverage.testrail.json` for CI and agents, and `reports/sync-coverage.testrail.md` to paste into Slack or publish with `publish-confluence`.

The `duplicated` line is the interesting one. Those are manual cases an automated story already covers, listed individually in the Markdown under "Retire these first".

## Configure

Credentials come from the environment, never the config file, so the config is safe to commit.

```bash
executable-stories sync testrail --init
```

That prints a block for `executable-stories.config.mjs`:

```js
export default {
  sync: {
    testrail: {
      url: "https://acme.testrail.io",
      projectId: 1,
      suiteId: 1,
      sectionId: 1,
      // statusIds: { skipped: 6 },
    },
  },
};
```

| Provider | Environment |
| --- | --- |
| TestRail | `TESTRAIL_USERNAME` (login email), `TESTRAIL_API_KEY` (My Settings, API Keys) |
| Xray | `XRAY_CLIENT_ID`, `XRAY_CLIENT_SECRET` (Jira, Apps, Xray, API Keys) |
| Xray (optional) | `JIRA_EMAIL`, `JIRA_TOKEN`, needed only to edit an existing test's summary or description |

### Where the TestRail ids come from

TestRail puts every id in the URL, so open the project, suite, or section and read it off the address bar:

| Setting | Where to look | The URL you land on | Value |
| --- | --- | --- | --- |
| `projectId` | Open the project | `/index.php?/projects/overview/5` | `5` |
| `suiteId` | Open the test suite | `/index.php?/suites/view/12` | `12` |
| `sectionId` | Open a section in that suite | `/index.php?/suites/view/12&group_id=340` | `340` |

Leave `suiteId` out on a single-suite project. Leave `sectionId` out and `coverage` still works, but `sync` stops before creating anything and tells you to set it. TestRail offers no default landing place for new cases, and moving a few hundred of them afterwards takes a long time.

`url` is the instance root with nothing after it, such as `https://acme.testrail.io`. Paste a deeper URL and TestRail answers with a login page, which the CLI names in the error.

Two more worth setting on a real instance:

- `statusIds.skipped`. TestRail ships Passed as 1 and Failed as 5 and has no stock "skipped", so skipped tests go unrecorded until you point this at a custom status.
- `fields`. Only for a customised case template, where the steps and description live somewhere other than `custom_steps_separated` and `custom_preconds`.

### Where the Xray ids come from

`jiraBaseUrl` is your site, such as `https://acme.atlassian.net`. `projectKey` is the prefix on every issue key in that project, so `PROJ` for `PROJ-42`. Set `testPlanKey` to file each execution under a plan, and `jql` to narrow which existing tests get reconciled on a large project.

### A repo with no JavaScript

Put the same `sync` object in `executable-stories.config.json`. The same CLI reads it, with no `export default` to write:

```json
{
  "sync": {
    "testrail": {
      "url": "https://acme.testrail.io",
      "projectId": 1,
      "suiteId": 1,
      "sectionId": 1
    }
  }
}
```

Keep one config file per directory. If both a `.mjs` and a `.json` are present the CLI refuses to guess which wins.

## From Go, Ruby, Python, Rust, Kotlin, or C#

Nothing here is JavaScript-specific. Every adapter writes the same raw run JSON, and the sync engine lives in one CLI that ships as a standalone binary, so there is no Node install and no per-language client to maintain.

```bash
# Download the binary for your platform from the releases page, then:
./executable-stories coverage testrail reports/raw-run.json
```

Point it at whatever your adapter wrote (`go test` with the Go adapter, `pytest` with the pytest plugin, and so on). The commands, the config, the lockfile, and the safety rules are identical in every language.

## Plan before you write

`sync` changes nothing until you pass `--apply`.

```bash
executable-stories sync testrail reports/raw-run.json
```

```
testrail: ACME / Web Regression

  + create      12 cases
  ~ update       4 cases
  = unchanged  118 cases
  ! skipped      2 cases  (edited in testrail since last sync)
  ? orphaned     3 cases  (story deleted from codebase, never removed)
  → results    134 executions
  ↑ upload       7 attachments (4 screenshots, 3 videos, 12.4 MB)

Nothing was written. Run the same command with --apply to make these changes.
```

Then:

```bash
executable-stories sync testrail reports/raw-run.json --apply
```

## What it will not do

**It never overwrites a case a human edited.** Every case this tool writes has a hash of the provider's own normalized copy recorded in the lockfile. If the remote no longer matches, the case is skipped and listed, not overwritten.

That check needs the provider to hand back the case body. TestRail and Xray both do. A provider that only returns ids and titles cannot be checked, so the plan says so on its own line rather than implying a guarantee it is not making:

```
  ! 12 case(s): acme returned no body, so a hand edit to them cannot be detected
```

**It never touches a hand-authored case.** A case reached through a `story.tickets` id belongs to whoever wrote it. Executions are recorded against it and the body is left alone.

**It never deletes.** When a story is removed from the codebase, its case is reported as orphaned and left in place.

**It never binds on a guess.** Similarity is used to label a case "possible duplicate" in the report and nothing else. Only a lockfile entry or an explicit ticket id creates a binding.

## The lockfile

`.executable-stories/sync.lock.json` binds each behaviour to its case. Commit it.

The key is a content fingerprint of the scenario's steps, not its title or file path, so renaming a test or moving a file keeps the binding. When CI creates a case, the lockfile diff appears in the pull request that caused it, so a reviewer sees the new case and its link before anyone opens the test-management system.

## Linking a story to an existing case

Point a story at a case that already exists using a ticket reference:

```ts
it("User signs in", ({ task }) => {
  story.init(task, { ticket: "C1234" }); // TestRail case 1234
  story.given("a registered user");
});
```

TestRail ids are numeric, so the `C` is stripped. Xray ids are Jira issue keys (`PROJ-42`) and are used whole.

## Evidence

Screenshots and video attach to the recorded execution, which is what lets an automated result replace a manual tester's hand-attached screenshot.

The default is failure-only, because nobody watches a passing test's video and storage quotas are real.

```bash
executable-stories sync testrail reports/raw-run.json --apply --attach all
```

`--attach none` still links each execution back to the scenario in your published report, so the evidence is one click away at zero storage cost. Pair it with `--report-url`:

```bash
executable-stories sync testrail reports/raw-run.json --apply \
  --attach none --report-url https://docs.acme.dev/stories
```

Files over the provider's limit are reported in the plan rather than failing the run mid-upload.

## In CI

```yaml
- run: pnpm test
- run: executable-stories sync testrail reports/raw-run.json --apply
  env:
    TESTRAIL_USERNAME: ${{ secrets.TESTRAIL_USERNAME }}
    TESTRAIL_API_KEY: ${{ secrets.TESTRAIL_API_KEY }}
```

A failed sync exits non-zero, because a system of record that silently stopped updating is worse than a red build. Use `--continue-on-error` to make it advisory.

Run it on your default branch only. A filtered or partial run (a `-t` flag, a single file) makes every unrun story look orphaned. Nothing is ever deleted, but the report says so, and the plan warns when more than a quarter of bindings would orphan at once.

## Xray notes

Xray splits its API in two: GraphQL for test definitions, REST for importing execution results. Both are handled for you.

Creating a test needs only the Xray API key pair. Updating an existing test's summary or description needs Jira credentials as well, because those are Jira fields Xray does not own; without them the steps are still updated and a warning explains what was left alone.

Evidence rides along inside the execution import as base64, so there is no separate upload step.

## When it does not work

Every message below comes from a first run against a real instance.

**`TestRail get_cases returned HTML rather than JSON`**

`url` points at a page instead of the instance root, so TestRail served a login screen. Cut it back to the host: `https://acme.testrail.io`.

**`TestRail get_cases failed (401)`**

Use the login email for `TESTRAIL_USERNAME` and an API key for `TESTRAIL_API_KEY`, generated under My Settings, API Keys. Once an instance enforces API keys, TestRail rejects the password outright.

**`TestRail get_cases failed (403)`**

TestRail took the credentials and refused the request. An admin enables the API under Administration, Site Settings, API.

**`Xray authentication failed (401)`**

A Jira API token and an Xray API key look alike, and you need the Xray one here. Generate it under Jira, Apps, Xray, API Keys, then set `XRAY_CLIENT_ID` and `XRAY_CLIENT_SECRET`. `JIRA_EMAIL` and `JIRA_TOKEN` are the other pair, needed only to edit an existing test's summary or description.

**`No TestRail config found`**

The CLI found no `sync` key. Run `executable-stories sync testrail --init` for a block to paste, and remember that `--config` overrides discovery when the file sits outside the working directory.

**`is a StoryReport, which has already dropped the attachment bodies`**

Point at the raw run your reporter wrote, not at a generated report.

**Skipped cases you did not expect**

Someone edited those cases in the provider's UI after the last sync. The plan lists each one with its id and URL. Nothing overwrites them until you reconcile the two by hand.

**Every story wants a new case on the second run**

Check that `.executable-stories/sync.lock.json` is committed. Without it CI starts from an empty lockfile and finds nothing bound.

## Adding another provider

The port is four methods (`listCases`, `createCase`, `updateCase`, `recordResults`), and every one except `listCases` is optional: a read-only provider implements the first and still produces a full coverage report. Matching, planning, drift detection, and reporting live in the engine, so an adapter only translates.

See `packages/executable-stories-formatters/src/sync/port.ts`.

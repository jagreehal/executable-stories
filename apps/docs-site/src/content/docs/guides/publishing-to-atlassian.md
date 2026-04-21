---
title: Publishing to Confluence & Jira
description: Generate Atlassian Document Format (ADF) JSON and push it to Confluence pages or Jira issues
---

Generate your story docs once, publish them anywhere in Atlassian. The `confluence` output format emits Atlassian Document Format (ADF) JSON, and the `publish-confluence` and `publish-jira` subcommands push it via the REST API — no copy-paste, no markdown quirks, no clipboard conversion.

This is useful when your team lives in Confluence for specs and Jira for tickets, and you want each feature's living documentation to land next to the work that produced it.

## Why ADF, not markdown

Confluence accepts pasted markdown, but the conversion is lossy — code blocks lose their language, tables mangle, and nested lists flatten. ADF is Confluence's and Jira's native JSON document format, so round-tripping is exact. A doc generated from one test run looks the same whether it lands in a Confluence page, a Jira issue description, or a Jira comment.

## Generate the ADF file

Use `--format confluence` when you run the formatter. The output has extension `.adf.json`:

```bash
npx executable-stories format raw-run.json \
  --format confluence \
  --output-dir reports
# → reports/index.adf.json
```

The generated ADF tree maps cleanly onto Atlassian node types:

| Your content | ADF node |
| ------------ | -------- |
| Scenario heading with status emoji | `heading` |
| `story.note(...)` | `panel` (info) |
| `story.code(...)` | `codeBlock` with `language` attr |
| `story.table(...)` | `table` with `tableRow` / `tableCell` |
| `story.link(...)` | inline `text` with `link` mark |
| `story.mermaid(...)` | `codeBlock` with `language=mermaid` |
| Failing scenario error | `panel` (warning) + `codeBlock` |
| Tickets | inline `link` marks (uses `ticketUrlTemplate`) |

## Authentication

Both publishers use Atlassian's standard Basic auth: your account email plus an API token.

Generate a token at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens). The same token works for Confluence and Jira.

Pass credentials via flags or env vars:

| Flag | Env var | Used by |
| ---- | ------- | ------- |
| `--email` | `CONFLUENCE_EMAIL` / `JIRA_EMAIL` | both |
| `--token` | `CONFLUENCE_TOKEN` / `JIRA_TOKEN` | both |
| `--base-url` | `CONFLUENCE_BASE_URL` / `JIRA_BASE_URL` | both |

## Publishing to Confluence

### Update an existing page

The common case: you have a Confluence page and you want CI to keep it in sync with the latest test run.

```bash
npx executable-stories publish-confluence reports/index.adf.json \
  --page-id 123456 \
  --base-url https://acme.atlassian.net/wiki
```

The publisher reads the current page to get its version number, increments it, and PUTs the new ADF. Output:

```
Updated "User Stories" (v8) → https://acme.atlassian.net/wiki/spaces/DEV/pages/123456
```

Override the page title with `--title "My Feature"` if you want the page renamed when it's updated.

### Create a new page

Supply `--space-id` and `--title` instead of `--page-id`:

```bash
npx executable-stories publish-confluence reports/index.adf.json \
  --space-id 98765 \
  --title "Checkout — Living Documentation" \
  --parent-id 11111 \
  --base-url https://acme.atlassian.net/wiki
```

`--parent-id` is optional; without it, the page lives at the space root.

## Publishing to Jira

### Add as a comment (default)

The safest default — appends a comment with your latest run. Nothing existing gets overwritten:

```bash
npx executable-stories publish-jira reports/index.adf.json \
  --issue PROJ-123 \
  --base-url https://acme.atlassian.net
```

Output:

```
Added comment to PROJ-123 (comment 10001) → https://acme.atlassian.net/browse/PROJ-123?focusedCommentId=10001
```

The URL includes `focusedCommentId`, so clicking it scrolls straight to the new comment.

### Replace the issue description

If you want the ticket description to be the source of truth for what the feature does, use `--mode description`:

```bash
npx executable-stories publish-jira reports/index.adf.json \
  --issue PROJ-123 \
  --mode description \
  --base-url https://acme.atlassian.net
```

This **replaces** `fields.description` in full. Manually written context in the description will be lost, so prefer `comment` mode unless you're certain.

## Dry-run before wiring CI

Both publishers accept `--dry-run` — it validates the ADF, parses credentials, and prints the request plan without sending anything:

```bash
npx executable-stories publish-jira reports/index.adf.json \
  --issue PROJ-123 \
  --base-url https://acme.atlassian.net \
  --dry-run
```

Output:

```json
{
  "action": "comment-added",
  "baseUrl": "https://acme.atlassian.net",
  "issueKey": "PROJ-123",
  "mode": "comment",
  "adfBytes": 64965
}
```

Credentials aren't required for `--dry-run`, so you can sanity-check the generated ADF and flag parsing without leaking secrets.

## Recipes

### Update a Confluence page on every main-branch push

```yaml
# .github/workflows/publish-docs.yml
name: Publish living docs
on:
  push:
    branches: [main]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install
      - run: pnpm test
      - run: |
          npx executable-stories format reports/raw-run.json \
            --format confluence \
            --output-dir reports
      - run: |
          npx executable-stories publish-confluence reports/index.adf.json \
            --page-id ${{ vars.CONFLUENCE_PAGE_ID }}
        env:
          CONFLUENCE_BASE_URL: ${{ vars.CONFLUENCE_BASE_URL }}
          CONFLUENCE_EMAIL: ${{ vars.CONFLUENCE_EMAIL }}
          CONFLUENCE_TOKEN: ${{ secrets.CONFLUENCE_TOKEN }}
```

### Attach a failing test summary to a Jira ticket

Run conditionally on test failure and post a comment with the results:

```yaml
      - name: Run tests
        id: tests
        run: pnpm test
        continue-on-error: true

      - name: Publish failure summary to Jira
        if: steps.tests.outcome == 'failure'
        run: |
          npx executable-stories format reports/raw-run.json \
            --format confluence --output-dir reports
          npx executable-stories publish-jira reports/index.adf.json \
            --issue ${{ github.event.pull_request.title }} \
            --base-url ${{ vars.JIRA_BASE_URL }}
        env:
          JIRA_EMAIL: ${{ vars.JIRA_EMAIL }}
          JIRA_TOKEN: ${{ secrets.JIRA_TOKEN }}

      - name: Re-raise test failure
        if: steps.tests.outcome == 'failure'
        run: exit 1
```

## Programmatic use

Both publishers are available as library functions for custom CI scripts:

```ts
import {
  ConfluenceFormatter,
  publishConfluencePage,
  publishJiraIssue,
} from "executable-stories-formatters";

const formatter = new ConfluenceFormatter({
  title: "Checkout — Living Documentation",
  ticketUrlTemplate: "https://acme.atlassian.net/browse/{ticket}",
});
const adf = formatter.format(canonicalRun);

// Confluence — update existing page
await publishConfluencePage(
  { adf, pageId: "123456", baseUrl: "https://acme.atlassian.net/wiki" },
  { auth: { email: process.env.CONFLUENCE_EMAIL!, token: process.env.CONFLUENCE_TOKEN! } },
);

// Jira — comment on every ticket that was referenced in the run
const tickets = new Set(
  canonicalRun.testCases.flatMap((tc) => tc.story.tickets?.map((t) => t.id) ?? []),
);
for (const issueKey of tickets) {
  await publishJiraIssue(
    { adf, issueKey, baseUrl: "https://acme.atlassian.net" },
    { auth: { email: process.env.JIRA_EMAIL!, token: process.env.JIRA_TOKEN! } },
  );
}
```

Both functions accept a `fetch` dep for testing — use `msw`, `nock`, or a hand-rolled mock when writing your own publish scripts.

## Reference

| Subcommand | Target | Required flags |
| ---------- | ------ | -------------- |
| `publish-confluence` | Update page | `--page-id`, `--base-url` |
| `publish-confluence` | Create page | `--space-id`, `--title`, `--base-url` |
| `publish-jira` (default) | Comment | `--issue`, `--base-url` |
| `publish-jira` description mode | Description | `--issue`, `--mode description`, `--base-url` |

Exit codes: `0` on success, `3` on API failure, `4` on missing/invalid flags.

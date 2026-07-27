---
title: Multi-repo docs hub
description: Collate stories from many repositories into one statically hosted Astro site
---

One team's stories live happily in their own repo. At company scale you want
the opposite view: every product's living documentation collated into a single
site, built on a schedule, hosted statically, searchable in one place.

The pieces already exist. Each product repo **publishes** its run JSON to a
stable URL; a hub repo **fetches** those files at build time and renders them
as named suites with `sources: [...]`. No shared tokens for public repos, no
artifact expiry, no cross-repo API calls.

```
repo A ─ tests ─ publish-run ─┐
repo B ─ tests ─ publish-run ─┼─→ hub repo: fetch → astro build → static host
repo C ─ tests ─ publish-run ─┘
```

## 1. Each repo publishes its run JSON

Add a `publish-run` step to each product repo's CI, after tests. The
[GitHub Action](/guides/github-action/) commits the run JSON to an orphan
branch (`executable-stories-runs`, created automatically) so it is served at a
stable `raw.githubusercontent.com` URL:

```yaml
# .github/workflows/ci.yml in each product repo
permissions:
  contents: write   # commit to the runs branch

steps:
  - uses: actions/checkout@v4
  - run: npm test   # reporter writes reports/raw-run.json
  - uses: jagreehal/executable-stories-action@v2
    with:
      mode: publish-run
      raw-run: reports/raw-run.json
```

The file is now available at:

```
https://raw.githubusercontent.com/<owner>/<repo>/executable-stories-runs/raw-run.json
```

Unchanged runs are skipped, so scheduled builds never pile up empty commits.
Invalid run structures are rejected before the branch is touched. When jobs
overlap, a late older `finishedAtMs` cannot replace the newer published run;
large screenshot-heavy blobs receive the same ordering protection. A repo with
several suites publishes each under its own `runs-path`.

Non-GitHub CI works the same way with three lines of git: commit the run JSON
to a dedicated branch, or upload it to any URL your hub can fetch (S3, GCS, an
internal artifact store). The hub only needs files.

## 2. The hub repo renders them

The hub is a normal Astro site using `executable-stories-astro`. Scaffold one
with `executable-stories init-astro`, or wire the integration into an
[existing Astro site](/guides/existing-astro-site/). List one source per repo:

```js
// executable-stories.config.mjs
import { defineExecutableStories } from 'executable-stories-astro';

export default defineExecutableStories({
  sources: [
    { name: 'web',      label: 'Web app',  source: 'reports/web.json' },
    { name: 'api',      label: 'API',      source: 'reports/api.json' },
    { name: 'payments', label: 'Payments', source: 'reports/payments.json' },
  ],
  groupBy: 'source',   // the index groups scenarios by repo
});
```

The hub's workflow fetches each file before building:

```yaml
# .github/workflows/publish.yml in the hub repo
name: Publish docs hub
on:
  schedule:
    - cron: '0 6 * * *'   # daily; add repository_dispatch for on-demand rebuilds
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Fetch run JSON from each repo
        run: |
          mkdir -p reports
          curl -fsSL -o reports/web.json      https://raw.githubusercontent.com/acme/web/executable-stories-runs/raw-run.json
          curl -fsSL -o reports/api.json      https://raw.githubusercontent.com/acme/api/executable-stories-runs/raw-run.json
          curl -fsSL -o reports/payments.json https://raw.githubusercontent.com/acme/payments/executable-stories-runs/raw-run.json
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: corepack enable && pnpm install
      - run: pnpm build   # astro build → dist/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Deploy anywhere static: GitHub Pages as above, or Vercel, Netlify, Cloudflare
Pages with the same fetch-then-build step.

## Private repositories

`raw.githubusercontent.com` needs auth for private repos. Give the hub workflow
a token with read access to each product repo (a fine-grained PAT or a GitHub
App token) and pass it as a header:

```yaml
- name: Fetch run JSON from each repo
  env:
    GH_TOKEN: ${{ secrets.HUB_READ_TOKEN }}
  run: |
    mkdir -p reports
    curl -fsSL -H "Authorization: Bearer $GH_TOKEN" \
      -o reports/web.json \
      https://raw.githubusercontent.com/acme/web/executable-stories-runs/raw-run.json
```

## Rebuilding when a repo updates

The daily cron is the simple baseline. For fresher docs, have each product
repo's publish job also fire a
[`repository_dispatch`](https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event)
event at the hub:

```yaml
- name: Trigger hub rebuild
  env:
    GH_TOKEN: ${{ secrets.HUB_DISPATCH_TOKEN }}
  run: |
    gh api repos/acme/docs-hub/dispatches \
      -f event_type=stories-updated
```

and add `repository_dispatch: types: [stories-updated]` to the hub workflow's
`on:` block.

## What the hub gives you

Everything a single-repo site gets, across every repo at once:

- `/stories` grouped by repo (or by tag, feature, or status via `groupBy`)
- the searchable Scenario Explorer across all suites
- `/llms.txt` plus a Markdown twin per story, so the hub is agent-readable
- `include`/`exclude` filters, e.g. a hub showing only `security`-tagged
  scenarios from every repo

Agents consume the same collated view: point them at the deployed hub's
`/llms.txt`, or run the [MCP server](/guides/mcp-server/) against the fetched
JSON files.

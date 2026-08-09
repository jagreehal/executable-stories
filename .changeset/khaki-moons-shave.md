---
"executable-stories-formatters": minor
---

Add test-management sync, and make `check-links` check the links it was silently skipping.

## `coverage` and `sync`

`executable-stories coverage <provider> <run.json>` is read-only. It reports how many cases in a test-management system your stories already cover, which manual cases duplicate an automated story, and which stories have no case. Output goes to stdout, JSON, and Markdown.

`executable-stories sync <provider> <run.json>` authors case bodies from stories, records executions against them, and attaches screenshots and video as evidence. Dry run by default; `--apply` writes.

Safety rules the engine enforces for every provider: a case edited by a human is skipped rather than overwritten (drift is detected by hashing the provider's own normalized copy), a hand-authored case reached through `story.tickets` never has its body touched, deleted stories orphan their case rather than removing it, and similarity never creates a binding.

A provider that will not hand back a case body cannot be drift-checked at all, so the engine falls back to the hash it stored on the last write — enough to keep an unchanged body out of the plan — and reports the count it could not verify rather than implying a guarantee it is not making.

Bindings live in a committed `.executable-stories/sync.lock.json`, keyed on a content fingerprint so renaming a test or moving its file keeps the binding.

Adding a provider is one adapter file plus one registry line: `listCases`, `createCase`, `updateCase`, and `recordResults`, with everything but `listCases` optional.

`sync` and `coverage` are in the shell completion scripts, including the provider positional, and `--apply`, `--attach`, and `--report-url` complete as flags.

First-run failures name their fix. The dry-run plan pointed at "run without --dry-run", which is not a flag this CLI has; it now says `--apply`. TestRail's client parses the response before branching on the status code, so a `url` pointing at a page rather than the instance root (a login page returned with a 200) names the setting to fix instead of surfacing `Unexpected token '<'` from deep inside the success path. A 401 says the credential is an API key from My Settings, not a password, and a 403 says an admin enables the API under Site Settings. Xray's authentication failure says its key pair comes from Apps -> Xray -> API Keys and that a Jira API token is a different credential.

## Config

`loadConfig` previously projected only `formatters`; it now carries `sync` too.

Config can also be `executable-stories.config.json`, auto-discovered alongside the existing `.mjs` and `.js`. The Go, Ruby, Rust, pytest, JUnit 5, and xUnit adapters all emit the same raw run and reach the same prebuilt binary, so a repo with no JavaScript in it can configure `sync` without authoring an ESM module. JSON carries `sync` but not `formatters`, which are functions.

## `check-links`

Root-relative links (`/guides/x/`) were skipped outright, and they are the form a static-site generator actually needs: Astro serves `reference/foo.md` at `/reference/foo/`, so a relative link in the body resolves against the page URL rather than the file path. The checker resolves them against a site root, defaulting to the scan target, with `--site-root` to override.

Assets served at the site root resolve too. `check-links` walks up from the scan target for an `astro.config.*` beside a `public/`, so `/screenshots/hero.png` verifies with no configuration; `--assets <dir>` sets it explicitly for other layouts.

Attribute links are matched on their own instead of being anchored to a lowercase tag name. MDX pages hand links to components (`<ReportScreenshot src="..." />`), and the old pattern skipped the uppercase name and stopped at the first attribute per tag, so those went unchecked.

Anchors and query strings are stripped before a link names a file, and a bare `/` no longer reports as broken.

Together these turned up 231 genuinely broken links in this repo's own docs site, all now fixed. `apps/docs-site` runs `check-links` as its `test` script so they stay fixed.

## Flakiness counts

`calculateFlakiness` zeroed `failureRate` and both streaks below the sample threshold. The threshold gates the *classification* only — two runs cannot tell you a scenario is flaky — but the counts are plain arithmetic and stay honest at any sample size. Reporting `failureRate: 0` for a scenario that has only ever failed was worse than reporting nothing.

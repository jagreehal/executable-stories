# Threat model

## What this project does

executable-stories turns test runs into documentation. Framework adapters (Vitest, Jest, Playwright, Cypress, Bun and non-JS ports) record Given/When/Then steps and doc entries while tests run and write a raw run JSON file. The `executable-stories` CLI (`packages/executable-stories-formatters`) turns that JSON into HTML, Markdown, JUnit XML, Cucumber JSON/HTML/Messages and StoryReport JSON. Teams publish those reports to static hosts, attach them to CI runs, and post summaries on pull requests.

## Trust boundaries and where untrusted input enters

The test author and the machine running the tests are trusted. Test code already runs with full privileges, so "a malicious test can do X on the machine running it" is not a finding.

The report reader is not the test author. Untrusted input reaches readers through:

1. **Run JSON and StoryReport JSON consumed by the CLI.** Treat every string in them as attacker-controlled: titles, step text, notes, tags, doc entries (`section` markdown, `code`, `table`, `link` URLs, `mermaid`, `json`, `custom`, `html`, `screenshot`/`video` paths), error messages and stack traces. Test data often comes from fixtures, third-party APIs or fuzzed inputs, and a run can come from a fork's CI job.
2. **The HTML report** (`packages/executable-stories-react`, rendered by the formatters). Teams host it publicly. Script execution in a reader's browser is the main risk: unsafe markdown, `javascript:` and `data:` URLs in links or media, mermaid/highlight.js injection, or escape from the `story.html` iframe, which must stay sandboxed.
3. **File paths the CLI derives from run data.** Per-source state is written under `reports/by-file/`, and attachments are copied next to reports. A source path or attachment path in the JSON must not write or read outside the output and input directories.
4. **GitHub Actions** (`packages/executable-stories-action`, `actions/showcase-screenshots`). These run in CI with a token and turn report data from pull requests into PR comments. Look for shell or expression injection, markdown/HTML injection in comments, and token exposure. `showcase-screenshots` splits into `shoot` (runs PR code, no write token) and `publish` (holds the token, runs only base-commit code, takes only image files from `shoot`). Breaking that split is in scope.
5. **Showcase** (`packages/executable-stories-showcase*`). This runs inside the app under test and loads a named app state (a JSON "scenario") from a URL. A crafted link to a preview deployment is untrusted input. The dev panel's save endpoint must accept only loopback hosts and allowed origins, and must write only inside the scenarios folder.
6. **MCP servers** (`executable-stories-showcase mcp` and the CLI's report tools). They read reports and scenarios on behalf of an agent. Path traversal and unintended file or command access through tool arguments are in scope.

## Components that matter most / least

- Most: `packages/executable-stories-formatters`, `packages/executable-stories-react`, `packages/executable-stories-core`, `packages/executable-stories-action`, `actions/showcase-screenshots`, `packages/executable-stories-showcase`, `packages/executable-stories-showcase-cli`.
- Less: framework adapters (`executable-stories-vitest`, `-jest`, `-playwright`, `-cypress`, `-bun`, `-e2e`). They run inside the trusted test process.
- Out of scope: `apps/*` (examples, docs site, e2e harnesses), `skills/`, `docs/`, ESLint plugins, test files, and the non-JS adapters (`executable-stories-go`, `-rust`, `-ruby`, `-pytest`, `-junit5`, `-xunit`). Their toolchains are not in the image.

## How to exercise it

- Build: `pnpm turbo run build --filter='./packages/*'` (already done in the image).
- CLI: `node packages/executable-stories-formatters/dist/cli.js format <raw-run.json> --format html --output-dir out`. Small run files live under `packages/executable-stories-formatters/test/` and its fixtures.
- Tests: `pnpm --filter <package> test`.
- Report UI: open the generated HTML file in the Playwright Chromium installed in the image. Mermaid and highlight.js load from a CDN, which is not available offline; pass `--html-no-mermaid --html-no-syntax-highlighting` to test the rest.

## How we rate severity

- Critical: code execution or token theft in CI from a pull request (fork or same repo) through the provided GitHub Actions; arbitrary file write outside the output directory from run JSON.
- High: script execution in the HTML report from run data (stored XSS in a published report); escape from the `story.html` sandbox; path traversal that reads files into a published report; the showcase save endpoint writing from a non-loopback origin.
- Medium: XSS that needs an unusual flag or a non-default option; markdown injection in PR comments that spoofs content without script; reflected XSS in showcase that needs a crafted link to a dev or preview build.
- Low: denial of service from huge or deeply nested run JSON; information disclosure of local paths in reports.
- Not a finding: anything that needs malicious test code, a malicious local config file, or control of the machine running the tests.

## Reports and patches

Give a minimal run JSON (or scenario JSON, or workflow event) that reproduces the issue, plus the exact command. Keep patches minimal and add a regression test beside the existing tests in the affected package. Report a root cause once, not once per doc kind or renderer it reaches.

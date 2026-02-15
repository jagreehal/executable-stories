---
'executable-stories-formatters': minor
'executable-stories-playwright': minor
'executable-stories-vitest': minor
---

**executable-stories-formatters**

- **CI detection**: Auto-detect CI environment (GitHub Actions, GitLab, CircleCI, Azure DevOps, Buildkite, Jenkins, Travis) and attach branch, commit SHA, PR number, and build URL to reports.
- **Notifications**: Slack and Microsoft Teams webhooks; generic webhook with optional HMAC-SHA256 signing. CLI flags `--slack-webhook`, `--teams-webhook`, `--notify` (always | on-failure | never), `--report-url`, `--webhook-url` / `--webhook-hmac-*`.
- **History**: Optional run history via `--history-file` and `--max-history-runs`. Enables flakiness, stability grade, and performance trend metrics for the HTML report.
- **HTML report**: CI meta block, history/stability/flakiness in scenario rendering, and updated styles.

**executable-stories-playwright**

- **OpenTelemetry**: Reporter can emit spans for story steps and scenarios when `autotel` is available (optional; lazy-loaded). Supports trace waterfall and framework-native observability.

**executable-stories-vitest**

- **Reporter**: Emit CI and run metadata so formatter CLI can attach CI info and history when generating reports.

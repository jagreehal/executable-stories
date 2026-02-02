# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-02T21:08:50.414Z |
| Version | 0.1.0 |

### ✅ User logs in
<!-- scenarioId: 1544dfe95e07 -->

- **Given** user is on login page
- **When** user submits valid credentials
- **Then** user sees the dashboard

### ✅ User sees error on invalid login
<!-- scenarioId: 79063294ee8b -->

- **Given** user is on login page
- **When** user submits invalid credentials
- **Then** user sees an error message

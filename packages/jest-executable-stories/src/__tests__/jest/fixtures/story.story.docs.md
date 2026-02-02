# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-02T21:24:39.267Z |
| Version | 0.1.0 |
| Git SHA | 030222a |

### ✅ User logs in
<!-- scenarioId: e6b93ec2da2f -->

- **Given** user is on login page
- **When** user submits valid credentials
- **Then** user sees the dashboard

### ✅ User sees error on invalid login
<!-- scenarioId: 3a4f299e486d -->

- **Given** user is on login page
- **When** user submits invalid credentials
- **Then** user sees an error message

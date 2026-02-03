# User Stories

| Key | Value |
| --- | --- |
| Date | 2026-02-03T22:33:41.259Z |
| Version | 1.0.0 |
| Git SHA | afb3e1f |

## ✅ Screenshot appears in generated report

- **Given** user is on a page
- **When** user sees the content
    ![Dashboard / example page](../screenshots/dashboard.png)
- **Then** the screenshot is in the story report

## ✅ Video is recorded and linked in report

- **Given** user is on a page
- **When** the step runs
- **Then** video path is in the story report
    _Note:_ Videos are under test-results/; run `pnpm test:ui` or open playwright-report/ to watch.

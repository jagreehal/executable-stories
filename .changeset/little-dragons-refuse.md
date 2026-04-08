---
'executable-stories-playwright': minor
---

Add Playwright-native integrations for screencast chapters (v1.59), tracing groups (v1.49), and TestStepInfo injection (v1.51). Async and stepInfo-aware callbacks are now routed through a dedicated step runner that integrates with these APIs, with graceful degradation on older Playwright versions. Also adds story.console() for capturing page console messages and tag sync to Playwright annotations.

---
"executable-stories-playwright": patch
"executable-stories-react": patch
---

**Playwright.** `story.attachSpans()` spans reach the report's trace waterfall.
Relative `rawRunPath` and `history.filePath` resolve from the working directory,
matching `outputDir` and the Vitest adapter; absolute paths are unchanged.

**Report.** The share dialog links to docs.executablestories.com.

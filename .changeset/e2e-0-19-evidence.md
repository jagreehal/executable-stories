---
"executable-stories-e2e": minor
"executable-stories-react": minor
---

The e2e reporter reads what e2e 0.19 adds to a run, when present: each test's `trace.md` page attaches to its scenario as markdown, app warnings and errors (console, uncaught, network) become `App <source> <level>:` notes under the step that was running, and a test that skipped itself after a failure keeps the skip reason as a note. A failed `toHaveScreenshot` keeps its `-expected`, `-actual` and `-diff` file names.

The HTML report pairs screenshot-comparison images that share a stem (`home-expected.png`, `home-actual.png`, `home-diff.png`) and shows them side by side, for Playwright's `toHaveScreenshot` and e2e's alike.

---
"executable-stories-core": minor
"executable-stories-formatters": minor
"executable-stories-vitest": minor
"executable-stories-jest": minor
"executable-stories-playwright": minor
"executable-stories-bun": minor
"executable-stories-cypress": minor
---

A failing story test lists its steps in the failure output: ✓ for each step it passed, ✗ for the step that failed. Soft assertions in Vitest and Playwright mark the step they ran in, and Cypress marks steps its command queue never reached with `·`. Reports keep the original error message.

`story.screenshot({ page, aria: true })` records the page's accessibility snapshot beside the image. `executable-stories-core` adds `diffAria`, `summarizeAriaChanges` and `screenFrames`; the `agent-text` format lists what changed on screen at each screenshot, and `executable-stories gif --json` flags steps whose screen matches the frame before (`unchanged`).

The Playwright reporter stores copied attachments by absolute path, so `executable-stories video` and `gif` find them under any `testDir`.

The Cypress reporter prints each failed test with its error, and writes reports for every spec, from both the Mocha reporter and `buildRawRunFromCypressResult`. `EXECUTABLE_STORIES_CYPRESS_STORE` sets where a run keeps its recorded stories.

---
'executable-stories-core': minor
'executable-stories-formatters': minor
'executable-stories-playwright': minor
'executable-stories-vitest': minor
'executable-stories-jest': minor
'executable-stories-cypress': minor
'executable-stories-showcase': minor
'executable-stories-showcase-cli': patch
'executable-stories-remotion': minor
---

Turn a recorded Playwright test into a captioned video.

- Every adapter stamps steps and scenarios with `startedAtMs`. Cypress stamps a step when its command queue reaches it.
- Playwright `story.init({ page }, testInfo, { featureVideo: true })` records when the video began and each click and focused field, iframes and resized viewports included. `story.screenshot({ page, hold })` holds the screen for `hold` ms in a recorded test.
- New `executable-stories video <run>` writes an MP4 per passing recorded scenario, with the blank page load trimmed, plus a `<scenario>.video.json` manifest of clicks, focused fields and step times. `gif` and `video` take `--json`. `doctor`, `gif` and `video` warn when `--reporter` on the command line kept the stories reporter from writing the run file.
- core adds `scenarioSlug(title)`, `isPassed(status)` and `docsOf(scenario, kind)`.
- showcase `showCursor(page, { size, halo, glide })`: with `glide`, clicks and typing wait for the cursor to arrive. `glideBeforeActions(page)` is exported, and showcase-cli `record` uses it.
- remotion adds `RecordingPlayer` and `StoryRecordingVideo`, which captions each step as it begins. `RecordingScene` takes `caption={null}`, and a `focus` point holds the zoom while the field is typed into.

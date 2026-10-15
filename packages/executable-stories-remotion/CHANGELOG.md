# executable-stories-remotion

## 0.2.0

### Minor Changes

- 67ded1b: Turn a recorded Playwright test into a captioned video.

  - Every adapter stamps steps and scenarios with `startedAtMs`. Cypress stamps a step when its command queue reaches it.
  - Playwright `story.init({ page }, testInfo, { featureVideo: true })` records when the video began and each click and focused field, iframes and resized viewports included. `story.screenshot({ page, hold })` holds the screen for `hold` ms in a recorded test.
  - New `executable-stories video <run>` writes an MP4 per passing recorded scenario, with the blank page load trimmed, plus a `<scenario>.video.json` manifest of clicks, focused fields and step times. `gif` and `video` take `--json`. `doctor`, `gif` and `video` warn when `--reporter` on the command line kept the stories reporter from writing the run file.
  - core adds `scenarioSlug(title)`, `isPassed(status)` and `docsOf(scenario, kind)`.
  - showcase `showCursor(page, { size, halo, glide })`: with `glide`, clicks and typing wait for the cursor to arrive. `glideBeforeActions(page)` is exported, and showcase-cli `record` uses it.
  - remotion adds `RecordingPlayer` and `StoryRecordingVideo`, which captions each step as it begins. `RecordingScene` takes `caption={null}`, and a `focus` point holds the zoom while the field is typed into.

### Patch Changes

- Updated dependencies [67ded1b]
  - executable-stories-core@0.29.0

## 0.1.0

### Minor Changes

- 8a25254: New package `executable-stories-remotion`. `<StoryVideo>` renders a passed scenario as a Remotion video: one scene per storyboard frame, step text as captions, `story.state()` changes animated. `<RecordingVideo>` cuts showcase recordings into one captioned video that zooms to each click. `executable-stories-showcase record` now writes `<name>.video.json` beside each video with its size, length, description and clicks, iframe clicks included.

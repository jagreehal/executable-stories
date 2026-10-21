# executable-stories-remotion

## 0.5.0

### Minor Changes

- b7d3602: Help-centre media for teams and agents.

  - `docs review` writes one HTML page showing each slot's current image beside the new GIF or MP4, with the article section and the scenario's steps.
  - `docs approve <slot>…` records who approved each file. With `"approval": true`, `publish` sends only approved files.
  - `docs add <article | link> --image <n>` adds a slot and prints a scenario stub that quotes the article. It accepts a Help Scout or Confluence public link.
  - `docs add`, `review`, `approve` and `publish` take `--json`.
  - `docs list` gains `--images`, `--only gif`, views and update columns, and `--from <dir>` to read a local export (Markdown, HTML or Help Scout `.json`) from any folder.
  - `status --wording` lists published steps the article no longer says. A slot can name its scenario by `tag`.
  - `gif` and `video` resolve media against the run's `projectRoot`.
  - Playwright: `story.upload(trigger, files)`, and `story.screenshot({ hold: 'auto' })` to hold each screen long enough to read.
  - Remotion: `ArticleVideo` `quotes` accepts step numbers; `unmatchedQuotes` lists keys no step has.
  - Showcase: `showCursor` rests the pointer at a focused field's right end, clear of the typed text.

## 0.4.0

### Minor Changes

- 02b03e6: Help-centre media from your scenarios.

  - `<ArticleVideo>` plays a Playwright recording beside the article it illustrates: a title card, an optional table scene, the recording with the article's steps (the one on screen highlighted), and an outro linking the article. `quotes` maps step text to the article's wording; `articleVideoFrames` sizes the composition.
  - `executable-stories docs list | status | publish` keeps help-centre GIFs and videos in step with the scenarios that record them, in Markdown files, Help Scout Docs or Confluence. `docs.json` names each slot; `publish` replaces exactly one image per slot, only for passing scenarios, and records each placement in `docs.lock.json`. `list --csv` gives the backlog of images no slot covers yet.
  - New `article-walkthrough` skill: from an article to a recorded, reviewed and published GIF or video.

## 0.3.0

### Minor Changes

- 1ec073d: New `executable-stories-bun` adapter for `bun:test`, plus smoother recorded walkthroughs.

  - `executable-stories-bun`: import `test` / `it` / `describe` and `story` from the package and add `executable-stories-bun/preload` to `bunfig.toml`. `bun test` writes `.executable-stories/raw-run.json` with each test's status after its hooks and `expect.assertions()` check, the failing step, file and line, retry attempt, `runScope` and the git SHA.
  - `executable-stories video --from-step <n|keyword>` starts each video at that step. `--frames` writes a still per step and a ringed close-up of its click. The command lists steps whose line takes longer to say than the step is on screen as `overruns`.
  - A `cursor` prop on the Remotion recording compositions draws a pointer that glides to each click and dips as it lands. `cursorAt` exposes its position.
  - `zoomAt` merges clicks under 400ms apart into one zoom, and Playwright `featureVideo` and showcase `record` note how much of the page each clicked element `cover`s.
  - `StoryRecordingVideo` holds a step on screen under a second together with the next step's caption. `captionGroups` and `captionAt` expose the grouping.
  - The review JSON carries `execution`: the commit and run scope of the run behind it.
  - `goal` names baseline scenarios a filtered run never saw and files that failed before declaring their scenarios, and stays unmet until a full run covers them.

### Patch Changes

- Updated dependencies [1ec073d]
  - executable-stories-core@0.30.0

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

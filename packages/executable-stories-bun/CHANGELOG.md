# executable-stories-bun

## 0.2.0

### Minor Changes

- 5ee3705: A failing story test lists its steps in the failure output: ✓ for each step it passed, ✗ for the step that failed. Soft assertions in Vitest and Playwright mark the step they ran in, and Cypress marks steps its command queue never reached with `·`. Reports keep the original error message.

  `story.screenshot({ page, aria: true })` records the page's accessibility snapshot beside the image. `executable-stories-core` adds `diffAria`, `summarizeAriaChanges` and `screenFrames`; the `agent-text` format lists what changed on screen at each screenshot, and `executable-stories gif --json` flags steps whose screen matches the frame before (`unchanged`).

  The Playwright reporter stores copied attachments by absolute path, so `executable-stories video` and `gif` find them under any `testDir`.

  The Cypress reporter prints each failed test with its error, and writes reports for every spec, from both the Mocha reporter and `buildRawRunFromCypressResult`. `EXECUTABLE_STORIES_CYPRESS_STORE` sets where a run keeps its recorded stories.

### Patch Changes

- Updated dependencies [5ee3705]
  - executable-stories-core@0.31.0

## 0.1.0

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

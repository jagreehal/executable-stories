---
"executable-stories-bun": minor
"executable-stories-formatters": minor
"executable-stories-remotion": minor
"executable-stories-core": minor
"executable-stories-playwright": minor
"executable-stories-showcase-cli": minor
---

New `executable-stories-bun` adapter for `bun:test`, plus smoother recorded walkthroughs.

- `executable-stories-bun`: import `test` / `it` / `describe` and `story` from the package and add `executable-stories-bun/preload` to `bunfig.toml`. `bun test` writes `.executable-stories/raw-run.json` with each test's status after its hooks and `expect.assertions()` check, the failing step, file and line, retry attempt, `runScope` and the git SHA.
- `executable-stories video --from-step <n|keyword>` starts each video at that step. `--frames` writes a still per step and a ringed close-up of its click. The command lists steps whose line takes longer to say than the step is on screen as `overruns`.
- A `cursor` prop on the Remotion recording compositions draws a pointer that glides to each click and dips as it lands. `cursorAt` exposes its position.
- `zoomAt` merges clicks under 400ms apart into one zoom, and Playwright `featureVideo` and showcase `record` note how much of the page each clicked element `cover`s.
- `StoryRecordingVideo` holds a step on screen under a second together with the next step's caption. `captionGroups` and `captionAt` expose the grouping.
- The review JSON carries `execution`: the commit and run scope of the run behind it.
- `goal` names baseline scenarios a filtered run never saw and files that failed before declaring their scenarios, and stays unmet until a full run covers them.

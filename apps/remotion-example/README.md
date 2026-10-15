# remotion-example

Remotion videos built from this app's own story run, a showcase recording and a recorded Playwright test.

```bash
pnpm --filter remotion-example video   # test, report, record, render
pnpm --filter remotion-example studio  # preview and edit in Remotion Studio
```

| Composition | Source | Shows |
| --- | --- | --- |
| `CheckoutStates` | `stories/checkout.story.test.ts` | A basket's `story.state()` snapshots, with each change animated. No UI involved. |
| `CatalogueSearch` | `stories/catalogue.story.test.ts` | Playwright screenshots, one per step, with the step text as captions. |
| `DemoRecording` | `recordings/steps.ts` | Two showcase recordings of `apps/showcase/examples/demo-react` after a title card, each captioned, zooming to every click. `server-error` is cropped to the error message. |
| `Walkthrough` | `e2e/search.story.spec.ts` | A Playwright test recorded with `featureVideo`, turned into an MP4 by `executable-stories video`, with each step as a caption as it begins and the camera holding on the search box while it is typed into. |

The steps behind `video`:

1. `pnpm test` runs the stories and writes `reports/raw-run.json`. Screenshots go to `public/shots/`.
2. `pnpm report` writes `public/index.story-report.json`, which the compositions read in `calculateMetadata`.
3. `pnpm record` starts the demo app and runs `executable-stories-showcase record` into `public/recordings/`: each video and its `<name>.video.json`.
4. `pnpm walkthrough` runs the Playwright suite in `e2e/` against the demo app with video on, then `executable-stories video` writes `public/video/<scenario>.mp4` and its `.video.json`: page load trimmed, clicks and focused fields, and when each step began.
5. `pnpm render` writes the four MP4s to `out/`.

Change a story, run `video` again, and the videos follow. `zod` is pinned to the version `@remotion/media` uses, which keeps Remotion's version check quiet.

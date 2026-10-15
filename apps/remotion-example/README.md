# remotion-example

Remotion videos built from this app's own story run and a showcase recording.

```bash
pnpm --filter remotion-example video   # test, report, record, render
pnpm --filter remotion-example studio  # preview and edit in Remotion Studio
```

| Composition | Source | Shows |
| --- | --- | --- |
| `CheckoutStates` | `stories/checkout.story.test.ts` | A basket's `story.state()` snapshots, with each change animated. No UI involved. |
| `CatalogueSearch` | `stories/catalogue.story.test.ts` | Playwright screenshots, one per step, with the step text as captions. |
| `DemoRecording` | `recordings/steps.ts` | Two showcase recordings of `apps/showcase/examples/demo-react` after a title card, each captioned, zooming to every click. `server-error` is cropped to the error message. |

The steps behind `video`:

1. `pnpm test` runs the stories and writes `reports/raw-run.json`. Screenshots go to `public/shots/`.
2. `pnpm report` writes `public/index.story-report.json`, which the compositions read in `calculateMetadata`.
3. `pnpm record` starts the demo app and runs `executable-stories-showcase record` into `public/recordings/`: each video and its `<name>.video.json`.
4. `pnpm render` writes the three MP4s to `out/`.

Change a story, run `video` again, and the videos follow. `zod` is pinned to the version `@remotion/media` uses, which keeps Remotion's version check quiet.

---
title: Videos with Remotion
description: Render a scenario's storyboard, or a showcase recording, as a video with Remotion
---

[Remotion](https://www.remotion.dev) makes videos from React components.
`executable-stories-remotion` gives it two compositions fed by your run, so a
video changes when the behaviour changes and you re-render.

```bash
npm i executable-stories-remotion remotion @remotion/media
```

## A scenario as a video

`<StoryVideo>` shows a title card, then one scene per storyboard frame: the
step's `story.screenshot()`, its `story.state()` snapshots, and the step text as
captions. State changes animate in (`total: 80 → 72`), so a scenario with no UI
gets a video too.

Write the run where Remotion can read it:

```bash
executable-stories format reports/raw-run.json --format story-report-json \
  --output-dir public --output-name index
```

Then register a composition. `calculateMetadata` reads the report and sizes the
video to the scenes:

```tsx
const fromRun =
  (scenario: string): CalculateMetadataFunction<StoryVideoProps> =>
  async () => {
    const report = (await (
      await fetch(staticFile('index.story-report.json'))
    ).json()) as StoryReport;
    const props = storyVideoProps({
      report,
      scenario,
      resolveAsset: staticFile,
    });

    return { props, durationInFrames: storyVideoFrames(props, 30) };
  };
```

- The scenario must have passed. A demo shows behaviour the suite proved.
- Save screenshots under `public/` so `staticFile` resolves their paths.
- A step without a screenshot or state joins the next scene's captions.
- Add voiceover by setting a scene's `audio` and `seconds`. The
  [`demo-video`](/ai-skills/catalogue/) skill covers generating the audio.

## Showcase recordings with click zoom

`executable-stories-showcase record` writes `<name>.video.json` next to each
video:

```json
{
  "name": "default",
  "description": "All 248 countries from the API",
  "video": "default.mp4",
  "width": 1280,
  "height": 720,
  "durationMs": 3824,
  "clicks": [{ "t": 732, "x": 186, "y": 112 }]
}
```

`durationMs` and click times count from the first frame of the saved video.
Click `x` and `y` are pixels in it, after `--element` and `--width`; a click
inside an iframe maps to where it shows on the page.

`<RecordingVideo>` plays recordings in sequence after a title card. Each one is
a card captioned with its scenario's description, and the camera zooms to every
click:

```tsx
const recording: CalculateMetadataFunction<RecordingVideoProps> = async ({
  props,
}) => {
  const clips = await loadClips([
    { name: 'default', caption: 'Search 248 countries by name' },
    { name: 'server-error' },
  ]);

  return {
    props: { ...props, clips },
    durationInFrames: recordingFrames({ ...props, clips }, 30),
  };
};
```

Add a short `page.waitForTimeout` before each click in your steps, so the zoom
has time to arrive.

## A help-centre article as a video

`<ArticleVideo>` plays a Playwright recording beside the article it illustrates: a title card
with the article's opening line, the recording with the article's steps beside it, then an outro
pointing at the full article. The step on screen is highlighted, and the camera follows each click
and typed field.

```tsx
const article: CalculateMetadataFunction<ArticleVideoProps> = async ({
  props,
}) => {
  const [clip] = (await loadClips([{ name: 'add-a-contact' }], 'video')) as [
    RecordingClip,
  ];

  return {
    props: { ...props, clip },
    durationInFrames: articleVideoFrames({ ...props, clip }, 30),
  };
};
```

- `quotes` maps a step's text, or its number from 1, to the article's wording for it. Write steps
  in the article's words and you need none. `unmatchedQuotes(steps, quotes)` lists keys that match
  no step.
- `table` (`{ label, columns, rows }`) adds a scene before the recording, such as the spreadsheet an
  import uploads, read from the run's `story.table()`.
- `accent` sets the brand colour.

To put the rendered media into the article, see [Help-centre media](/guides/help-centre-media/).

## Working example

`apps/remotion-example` in the repo renders a state-only video, a screenshot
video, a two-clip recording and an article walkthrough from its own run:

```bash
pnpm --filter remotion-example video
```

## Licensing

Remotion has its own [license](https://www.remotion.dev/license): companies
above a small size need a company license. Remotion stays a dependency of your
project; executable-stories packages declare it as a peer.

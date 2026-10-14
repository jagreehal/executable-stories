# executable-stories-remotion

Render [Remotion](https://www.remotion.dev) videos from an executable-stories run.

- `<StoryVideo>` turns a passed scenario into a video: a title card, then one scene per storyboard frame with the step text as captions. A frame is a step's `story.screenshot()` and its `story.state()` snapshots, so a scenario with no UI still gets a video, with each state change animated.
- `<RecordingVideo>` cuts showcase recordings into one video: a title card, then each recording as a captioned card whose camera zooms to every click.

You bring the Remotion project; this package supplies the props and components. `remotion`, `@remotion/media` and `react` are peer dependencies.

```bash
npm i executable-stories-remotion remotion @remotion/media
```

## A scenario as a video

Write the run as StoryReport JSON into Remotion's `public/` folder:

```bash
executable-stories format reports/raw-run.json --format story-report-json --output-dir public --output-name index
```

Register a composition that reads it:

```tsx
import type { StoryReport } from 'executable-stories-core';
import { StoryVideo, storyVideoFrames, type StoryVideoProps, storyVideoProps } from 'executable-stories-remotion';
import { type CalculateMetadataFunction, Composition, staticFile } from 'remotion';

const fromRun = (scenario: string): CalculateMetadataFunction<StoryVideoProps> => async () => {
  const report = (await (await fetch(staticFile('index.story-report.json'))).json()) as StoryReport;
  const props = storyVideoProps({ report, scenario, resolveAsset: staticFile });

  return { props, durationInFrames: storyVideoFrames(props, 30) };
};

export const RemotionRoot = () => (
  <Composition
    id='Checkout'
    component={StoryVideo}
    fps={30}
    width={1920}
    height={1080}
    durationInFrames={1}
    defaultProps={{ title: '', feature: '', scenes: [], titleSeconds: 2 }}
    calculateMetadata={fromRun('Apply a discount code')}
  />
);
```

- `scenario` is the scenario's title or id. It must have passed and have at least one frame.
- `resolveAsset` maps each screenshot path in the report to a src Remotion can load. Save screenshots under `public/` and pass `staticFile`.
- A step with no frame adds its line to the next scene, so every step is on screen.
- Each scene lasts long enough to read its lines. For voiceover, set a scene's `audio` and `seconds` before returning the props.

## Showcase recordings with click zoom

`executable-stories-showcase record` writes `<name>.video.json` next to each video: its size, length, scenario description and clicks. Record into `public/recordings`:

```bash
executable-stories-showcase record src/scenarios --base-url http://localhost:5173 --steps steps.ts --out public/recordings
```

`loadClips` reads the manifests and `recordingFrames` sizes the video:

```tsx
const recording: CalculateMetadataFunction<RecordingVideoProps> = async ({ props }) => {
  const clips = await loadClips([
    { name: 'checkout', caption: 'Pay in two taps' },
    { name: 'server-error' }, // captioned with the scenario's description
  ]);

  return { props: { ...props, clips }, durationInFrames: recordingFrames({ ...props, clips }, 30) };
};

<Composition id='Promo' component={RecordingVideo} fps={30} width={1920} height={1080} durationInFrames={1}
  defaultProps={{ title: 'My app', clips: [] }} calculateMetadata={recording} />
```

- Each clip fits the composition as a card, so recordings of any size, cropped ones included, sit in one video.
- The camera reaches each click as it lands and glides between clicks close together. `zoom` (default 1.6) sets how far it moves in.
- A short `page.waitForTimeout` before each click in your steps gives viewers, and the zoom, time to follow.
- `RecordingScene` plays one clip and `zoomAt(clicks, ms)` exposes the camera, for your own compositions.

## Example

[`apps/remotion-example`](../../apps/remotion-example) renders a state-only video, a screenshot video and a two-clip recording from its own story run: `pnpm --filter remotion-example video`.

Remotion has its own [license](https://www.remotion.dev/license): companies above a small size need a company license.

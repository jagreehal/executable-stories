# executable-stories-remotion

Render [Remotion](https://www.remotion.dev) videos from an executable-stories run.

- `<StoryVideo>` turns a passed scenario into a video: a title card, then one scene per storyboard frame with the step text as captions. A frame is a step's `story.screenshot()` and its `story.state()` snapshots, so a scenario with no UI still gets a video, with each state change animated.
- `<RecordingVideo>` cuts recordings into one video: a title card, then each recording as a captioned card whose camera zooms to every click.
- `<StoryRecordingVideo>` plays one recording from a Playwright run with each step as a caption, changing as the step begins.

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
- Clicks under 400ms apart (a double-click, a label then its field) are one zoom, on the last. A click on an element covering over 60% of the picture (`cover` in the manifest) gets no zoom: there is nothing to look closer at.
- A short `page.waitForTimeout` before each click in your steps gives viewers, and the zoom, time to follow.
- A manifest point with `kind: 'focus'` is a field being typed into: the camera holds on it until the next point instead of zooming out after a moment.
- For your own compositions: `RecordingPlayer` is just the zooming video, sized by its parent, so it fits any layout (article text beside it, say). `RecordingScene` is that card with a caption; `caption={null}` leaves the caption out. `zoomAt(clicks, ms)` exposes the camera.

## From a Playwright suite

A suite that already records its tests needs no showcase. Turn on video in `playwright.config.ts` (`use: { video: 'on' }`) and pass the page to `story.init` so the scenario notes each click and focused field:

```ts
test('Lena adds a contact', async ({ page }, testInfo) => {
  story.init({ page }, testInfo, { featureVideo: true }); // before page.goto
  story.given('Lena is on her contacts');
  await page.goto('/contacts');
  story.when('she adds Lena Hart');
  await page.getByRole('button', { name: 'New contact' }).click();
  await page.getByLabel('Name').fill('Lena Hart');
  await story.screenshot({ page, alt: 'New contact form', hold: 1800 }); // holds while recording
});
```

Then turn the run into MP4s and manifests in `public/video`:

```bash
executable-stories video reports/raw-run.json --output-dir public
```

Each `<scenario>.video.json` has the clicks (`RecordingVideo` zooms to them) and each step's start (`steps[].t`), both counted from after the blank page load the command trims off. `StoryRecordingVideo` captions the steps. A step on screen for under a second shares a caption with the step after it (up to three lines), so a burst of quick steps doesn't flash past; `captionGroups` exposes the grouping:

```tsx
const walkthrough: CalculateMetadataFunction<{ clip: RecordingClip }> = async () => {
  const [clip] = (await loadClips([{ name: 'lena-adds-a-contact' }], 'video')) as [RecordingClip];

  return { props: { clip }, durationInFrames: clipFrames(clip, 30) };
};

<Composition id='Contact' component={StoryRecordingVideo} fps={30} width={1920} height={1080} durationInFrames={1}
  defaultProps={{ clip: undefined as unknown as RecordingClip }} calculateMetadata={walkthrough} />
```

Playwright moves no visible pointer, so a recording without showcase's `showCursor` has none. `cursor` draws one from the click log, on `StoryRecordingVideo`, `RecordingVideo`, `RecordingScene` and `RecordingPlayer`: it glides to each click on a slight arc, lands on it as it happens and dips. `cursorAt(clicks, ms, size)` exposes its position.

```tsx
<Composition id='Contact' component={StoryRecordingVideo} defaultProps={{ clip, cursor: true }} ... />
```

`executable-stories video` warns when a step's line takes longer to say (about 170 words a minute) than the step is on screen, so a voiceover would talk over the next step. Slow that step down in the test, or shorten its text.

Names are `scenarioSlug(title)` from `executable-stories-core`, the rule `gif` uses too: "Lena's contact" becomes `lenas-contact`. To show a table the test attached with `story.table()`, read it from the StoryReport with `docsOf(getScenario(report, title)!.scenario, 'table')`.

## Example

[`apps/remotion-example`](../../apps/remotion-example) renders a state-only video, a screenshot video and a two-clip recording from its own story run: `pnpm --filter remotion-example video`.

Remotion has its own [license](https://www.remotion.dev/license): companies above a small size need a company license.

## A help-centre article as a video

`<ArticleVideo>` puts a Playwright recording beside the article it illustrates: a title card with the article's opening line, the recording with the article's steps beside it (the one being performed highlighted, the camera on each click and typed field), then an outro pointing at the full article.

```tsx
const article: CalculateMetadataFunction<ArticleVideoProps> = async ({ props }) => {
  const [clip] = (await loadClips([{ name: 'add-a-contact' }], 'video')) as [RecordingClip];

  return { props: { ...props, clip }, durationInFrames: articleVideoFrames({ ...props, clip }, 30) };
};

<Composition id='AddAContact' component={ArticleVideo} fps={30} width={1920} height={1080} durationInFrames={1}
  defaultProps={{
    article: { kicker: 'Help centre', title: 'Managing contacts', intro: 'Contacts are who you pay.', url: 'help.example.com/contacts' },
    heading: 'Add a contact',
    quotes: { 'she saves the contact': 'Once your contact is complete, hit Save.' },
    clip: undefined as unknown as RecordingClip,
  }}
  calculateMetadata={article} />
```

- Each step shows its own text unless `quotes` gives the article's wording for it, keyed by the step's text or its number from 1 (`"2"`, which survives rewording the step). Write steps in the article's words and you need no `quotes` at all. `unmatchedQuotes(clip.steps, quotes)` lists keys no step has, so a reworded step can fail a test instead of silently losing its quote.
- `table` (`{ label, columns, rows }`) adds a scene before the recording, beside the first step: the spreadsheet an import uploads, read from the run's `story.table()`.
- `accent` sets the brand colour. Length: `articleVideoFrames(props, fps)`.

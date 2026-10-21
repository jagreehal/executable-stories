import type { StoryReport } from 'executable-stories-core';
import {
  ArticleVideo,
  articleVideoFrames,
  clipFrames,
  loadClips,
  recordingFrames,
  RecordingVideo,
  StoryRecordingVideo,
  StoryVideo,
  storyVideoFrames,
  storyVideoProps,
  type ArticleVideoProps,
  type RecordingClip,
  type RecordingVideoProps,
  type StoryVideoProps,
} from 'executable-stories-remotion';
import {
  Composition,
  staticFile,
  type CalculateMetadataFunction,
} from 'remotion';

const fps = 30;

/** `pnpm report` writes the run here; screenshot paths in it are relative to public/. */
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

    return { props, durationInFrames: storyVideoFrames(props, fps) };
  };

/** `pnpm record` writes each video and its `<name>.video.json` into public/recordings. */
const recording: CalculateMetadataFunction<RecordingVideoProps> = async ({
  props,
}) => {
  const clips = await loadClips([
    { name: 'default', caption: 'Search 248 countries by name' },
    { name: 'server-error', caption: 'Retry when the API is busy' },
  ]);

  return {
    props: { ...props, clips },
    durationInFrames: recordingFrames({ ...props, clips }, fps),
  };
};

/**
 * `pnpm walkthrough` runs the Playwright suite in e2e/ with video on, then
 * `executable-stories video` writes each MP4 and its manifest, step times included, into public/video.
 */
const walkthrough: CalculateMetadataFunction<{
  clip: RecordingClip;
  cursor?: boolean;
}> = async ({ props }) => {
  const [clip] = await loadClips(
    [{ name: 'find-a-country-by-the-start-of-its-name' }],
    'video',
  );

  return {
    props: { ...props, clip: clip! },
    durationInFrames: clipFrames(clip!, fps),
  };
};

/** The same walkthrough as a help-centre article video: the article's wording beside the recording. */
const article: CalculateMetadataFunction<ArticleVideoProps> = async ({
  props,
}) => {
  const [clip] = await loadClips(
    [{ name: 'find-a-country-by-the-start-of-its-name' }],
    'video',
  );

  return {
    props: { ...props, clip: clip! },
    durationInFrames: articleVideoFrames({ ...props, clip: clip! }, fps),
  };
};

const empty: StoryVideoProps = {
  title: '',
  feature: '',
  scenes: [],
  titleSeconds: 2,
};

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="CheckoutStates"
        component={StoryVideo}
        fps={fps}
        width={1920}
        height={1080}
        durationInFrames={1}
        defaultProps={empty}
        calculateMetadata={fromRun('Apply a discount code')}
      />
      <Composition
        id="CatalogueSearch"
        component={StoryVideo}
        fps={fps}
        width={1920}
        height={1080}
        durationInFrames={1}
        defaultProps={empty}
        calculateMetadata={fromRun('Search the catalogue')}
      />
      <Composition
        id="DemoRecording"
        component={RecordingVideo}
        fps={fps}
        width={1920}
        height={1080}
        durationInFrames={1}
        defaultProps={{ title: 'Who speaks what', clips: [] }}
        calculateMetadata={recording}
      />
      <Composition
        id="Walkthrough"
        component={StoryRecordingVideo}
        fps={fps}
        width={1920}
        height={1080}
        durationInFrames={1}
        defaultProps={{
          clip: {
            name: '',
            video: '',
            src: '',
            width: 1,
            height: 1,
            durationMs: 0,
            clicks: [],
          },
        }}
        calculateMetadata={walkthrough}
      />
      <Composition
        id="ArticleWalkthrough"
        component={ArticleVideo}
        fps={fps}
        width={1920}
        height={1080}
        durationInFrames={1}
        defaultProps={{
          article: {
            kicker: 'Help centre',
            title: 'Finding a country',
            intro:
              'The catalogue lists every country and the languages spoken there.',
            url: 'help.example.com/finding-a-country',
          },
          heading: 'Search by name',
          quotes: {
            'Lena searches for "Ice"':
              'Type the first letters of the country into the search box.',
            'only Iceland is left':
              'The list narrows to the countries that match.',
          },
          clip: {
            name: '',
            video: '',
            src: '',
            width: 1,
            height: 1,
            durationMs: 0,
            clicks: [],
          },
        }}
        calculateMetadata={article}
      />
    </>
  );
}

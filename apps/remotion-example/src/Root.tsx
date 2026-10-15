import type { StoryReport } from 'executable-stories-core';
import {
  loadClips,
  recordingFrames,
  RecordingVideo,
  StoryVideo,
  storyVideoFrames,
  storyVideoProps,
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
    </>
  );
}

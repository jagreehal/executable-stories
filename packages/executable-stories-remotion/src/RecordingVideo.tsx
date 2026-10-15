import { Video } from '@remotion/media';
import type { CSSProperties } from 'react';
import {
  AbsoluteFill,
  interpolate,
  Series,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { accent, background, font, ink, muted, TitleCard } from './theme.js';
import { clipFrames, type ManifestStep, zoomAt, type VideoManifest } from './zoom.js';

/** A recording to play: its manifest, where the video loads from, and an optional caption. */
export type RecordingClip = VideoManifest & {
  src: string;
  /** Shown under the clip; defaults to the scenario's description, then its name. */
  caption?: string;
};

export type RecordingVideoProps = {
  /** Title card before the first clip; leave it out to start on the first clip. */
  title?: string;
  clips: RecordingClip[];
  /** How far the camera zooms toward a click. */
  zoom?: number;
};

const TITLE_SECONDS = 1.5;

/** Showcase recordings in sequence, each as a captioned card whose camera zooms to every click. */
export function RecordingVideo({ title, clips, zoom }: RecordingVideoProps) {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{ backgroundColor: background, color: ink, fontFamily: font }}
    >
      <Series>
        {title && (
          <Series.Sequence
            durationInFrames={Math.round(TITLE_SECONDS * fps)}
            name="Title"
          >
            <TitleCard title={title} />
          </Series.Sequence>
        )}
        {clips.map((clip) => (
          <Series.Sequence
            key={clip.name}
            durationInFrames={clipFrames(clip, fps)}
            name={clip.name}
          >
            <RecordingScene clip={clip} zoom={zoom} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
}

/**
 * Just the recording, zooming to each click, sized by its parent: put it in any layout.
 * `RecordingScene` and `StoryRecordingVideo` are layouts on top of it.
 */
export function RecordingPlayer({
  clip,
  zoom,
  style,
}: {
  clip: RecordingClip;
  zoom?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const camera = zoomAt(clip.clicks, (frame / fps) * 1000, zoom);

  return (
    <div style={{ overflow: 'hidden', ...style }}>
      <Video
        src={clip.src}
        muted
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${camera.scale})`,
          transformOrigin: `${(camera.x / clip.width) * 100}% ${(camera.y / clip.height) * 100}%`,
        }}
      />
    </div>
  );
}

/** The recording as a card that fits the composition, above a caption. */
function RecordingCard({
  clip,
  zoom,
  below = 0.08,
}: {
  clip: RecordingClip;
  zoom?: number;
  /** Room under the card, as a share of the height. */
  below?: number;
}) {
  const { width, height } = useVideoConfig();
  const fit = Math.min(
    (width * 0.86) / clip.width,
    (height * (0.86 - below)) / clip.height,
  );

  return (
    <RecordingPlayer
      clip={clip}
      zoom={zoom}
      style={{
        width: clip.width * fit,
        height: clip.height * fit,
        marginBottom: height * below,
        borderRadius: 16,
        boxShadow: '0 30px 80px rgba(0,0,0,.45)',
      }}
    />
  );
}

/**
 * One recording as a card that fits the composition, zooming to each click, with its caption.
 * `caption={null}` leaves the caption out; a string replaces the clip's.
 */
export function RecordingScene({
  clip,
  zoom,
  caption = clip.caption ?? clip.description ?? clip.name,
}: {
  clip: RecordingClip;
  zoom?: number;
  caption?: string | null;
}) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <RecordingCard clip={clip} zoom={zoom} below={caption === null ? 0 : 0.08} />
      {caption !== null && (
        <p
          style={{
            position: 'absolute',
            bottom: height * 0.05,
            margin: 0,
            fontSize: Math.round(height / 21),
            fontWeight: 600,
            opacity: interpolate(frame, [0, 0.4 * fps], [0, 1], {
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {caption}
        </p>
      )}
    </AbsoluteFill>
  );
}

/** The step showing at `ms`: the last one that has begun, or the first before any has. */
export const stepAt = (steps: ManifestStep[], ms: number) =>
  steps.reduce<number>((at, s, i) => (s.t <= ms ? i : at), 0);

/**
 * A recording from a Playwright run (`executable-stories video`) with each step as a lower-third
 * caption, changing as the step begins: the run as living documentation. Needs the manifest's
 * `steps`; without them it is a `RecordingScene` with no caption. Length: `clipFrames(clip, fps)`.
 */
export function StoryRecordingVideo({
  clip,
  zoom,
}: {
  clip: RecordingClip;
  zoom?: number;
}) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const steps = clip.steps ?? [];
  const index = stepAt(steps, (frame / fps) * 1000);
  const step = steps[index];
  // Each caption settles in from where its step begins.
  const since = frame - Math.round(((step?.t ?? 0) / 1000) * fps);
  const enter = spring({ frame: since, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: background,
        color: ink,
        fontFamily: font,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <RecordingCard clip={clip} zoom={zoom} below={step ? 0.14 : 0} />
      {step && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.04,
            left: '7%',
            right: '7%',
            display: 'flex',
            alignItems: 'baseline',
            gap: 24,
            fontSize: Math.round(height / 24),
            opacity: enter,
            transform: `translateY(${(1 - enter) * 16}px)`,
          }}
        >
          <span style={{ color: accent, fontWeight: 700 }}>{step.keyword}</span>
          <span style={{ fontWeight: 600, flex: 1 }}>{step.text}</span>
          <span style={{ color: muted, fontSize: Math.round(height / 40) }}>
            {index + 1} / {steps.length}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
}

/** Total length in frames, for `calculateMetadata`. */
export const recordingFrames = (
  { title, clips }: RecordingVideoProps,
  fps: number,
) =>
  (title ? Math.round(TITLE_SECONDS * fps) : 0) +
  clips.reduce((n, c) => n + clipFrames(c, fps), 0);

/**
 * Reads each scenario's `<name>.video.json` from `public/<dir>`, for `calculateMetadata`.
 * Record into that folder with `executable-stories-showcase record --out public/<dir>`, or copy
 * in what `executable-stories video` wrote (its `<output-dir>/video`).
 */
export async function loadClips(
  scenarios: { name: string; caption?: string }[],
  dir = 'recordings',
): Promise<RecordingClip[]> {
  return Promise.all(
    scenarios.map(async ({ name, caption }) => {
      const response = await fetch(staticFile(`${dir}/${name}.video.json`));

      if (!response.ok) {
        throw new Error(
          `No recording of "${name}" in public/${dir}. Record it with executable-stories-showcase record --out public/${dir}`,
        );
      }

      const manifest = (await response.json()) as VideoManifest;

      return {
        ...manifest,
        src: staticFile(`${dir}/${manifest.video}`),
        ...(caption && { caption }),
      };
    }),
  );
}

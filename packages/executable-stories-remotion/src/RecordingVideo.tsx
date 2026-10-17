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
import { cursorAt } from './cursor.js';
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
  /** Draw a pointer gliding to each click, for recordings without one (showcase draws its own). */
  cursor?: boolean;
};

const TITLE_SECONDS = 1.5;

/** Showcase recordings in sequence, each as a captioned card whose camera zooms to every click. */
export function RecordingVideo({ title, clips, zoom, cursor }: RecordingVideoProps) {
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
            <RecordingScene clip={clip} zoom={zoom} cursor={cursor} />
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
  cursor,
  style,
}: {
  clip: RecordingClip;
  zoom?: number;
  cursor?: boolean;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const camera = zoomAt(clip.clicks, ms, zoom);

  return (
    <div style={{ overflow: 'hidden', ...style }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transform: `scale(${camera.scale})`,
          transformOrigin: `${(camera.x / clip.width) * 100}% ${(camera.y / clip.height) * 100}%`,
        }}
      >
        <Video src={clip.src} muted style={{ width: '100%', height: '100%' }} />
        {cursor && <Pointer clip={clip} ms={ms} />}
      </div>
    </div>
  );
}

/** An arrow pointer from the click log, a share of the displayed width, dipping as each click lands. */
function Pointer({ clip, ms }: { clip: RecordingClip; ms: number }) {
  const { x, y, press } = cursorAt(clip.clicks, ms, clip);

  return (
    <svg
      viewBox="0 0 16 24"
      style={{
        position: 'absolute',
        width: `${(100 / 60) * (1 - 0.15 * press)}%`,
        aspectRatio: '2 / 3',
        left: `${(x / clip.width) * 100}%`,
        top: `${(y / clip.height) * 100}%`,
        overflow: 'visible',
        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))',
      }}
    >
      {press > 0 && <circle cx="0" cy="0" r={14 * (1 - press) + 4} fill="none" stroke="#fff" strokeWidth="2" opacity={press} />}
      <path d="M0 0 L0 18 L4.5 13.5 L8 21 L11 19.8 L7.6 12.6 L13.5 12.6 Z" fill="#111" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** The recording as a card that fits the composition, above a caption. */
function RecordingCard({
  clip,
  zoom,
  cursor,
  below = 0.08,
}: {
  clip: RecordingClip;
  zoom?: number;
  cursor?: boolean;
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
      cursor={cursor}
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
  cursor,
  caption = clip.caption ?? clip.description ?? clip.name,
}: {
  clip: RecordingClip;
  zoom?: number;
  cursor?: boolean;
  caption?: string | null;
}) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <RecordingCard clip={clip} zoom={zoom} cursor={cursor} below={caption === null ? 0 : 0.08} />
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

/** A step on screen for less than this cannot be read before it goes. */
const MIN_CAPTION_MS = 1000;
/** However quick the steps, a caption holds no more lines than this. */
const MAX_CAPTION_LINES = 3;

/**
 * Steps grouped into captions: a step on screen under a second joins the step after it, so a
 * burst of quick steps reads as one caption of up to three lines instead of flashing past. The
 * later lines show a little early rather than too briefly to read.
 */
export function captionGroups(steps: ManifestStep[], durationMs: number): number[][] {
  const groups: number[][] = [];
  let group: number[] = [];
  steps.forEach((s, i) => {
    group.push(i);
    const window = (steps[i + 1]?.t ?? durationMs) - s.t;
    if (window >= MIN_CAPTION_MS || group.length === MAX_CAPTION_LINES || i === steps.length - 1) {
      groups.push(group);
      group = [];
    }
  });
  return groups;
}

/** The caption showing at `ms`: the steps in the last group that has begun, or the first. */
export const captionAt = (steps: ManifestStep[], ms: number, durationMs: number) => {
  const groups = captionGroups(steps, durationMs);
  return groups.findLast((g) => steps[g[0]!]!.t <= ms) ?? groups[0] ?? [];
};

/**
 * A recording from a Playwright run (`executable-stories video`) with each step as a lower-third
 * caption, changing as the step begins: the run as living documentation. Steps under a second
 * share a caption (`captionGroups`). Needs the manifest's `steps`; without them it is a
 * `RecordingScene` with no caption. Length: `clipFrames(clip, fps)`.
 */
export function StoryRecordingVideo({
  clip,
  zoom,
  cursor,
}: {
  clip: RecordingClip;
  zoom?: number;
  /** Draw a pointer gliding to each click; Playwright's recordings have none. */
  cursor?: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const steps = clip.steps ?? [];
  const shown = captionAt(steps, (frame / fps) * 1000, clip.durationMs);
  const first = steps[shown[0] ?? -1];
  // The card leaves room for the clip's tallest caption, so it does not jump between captions.
  const lines = Math.max(0, ...captionGroups(steps, clip.durationMs).map((g) => g.length));
  // Each caption settles in from where its first step begins.
  const since = frame - Math.round(((first?.t ?? 0) / 1000) * fps);
  const enter = spring({ frame: since, fps, config: { damping: 200 } });
  const fontSize = Math.round(height / (lines > 1 ? 30 : 24));

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
      <RecordingCard
        clip={clip}
        zoom={zoom}
        cursor={cursor}
        below={lines ? 0.08 + (lines * fontSize * 1.3) / height : 0}
      />
      {first && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.04,
            left: '7%',
            right: '7%',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 24,
            fontSize,
            opacity: enter,
            transform: `translateY(${(1 - enter) * 16}px)`,
          }}
        >
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 24, lineHeight: 1.3 }}>
            {shown.map((i) => [
              <span key={`k${i}`} style={{ color: accent, fontWeight: 700 }}>{steps[i]!.keyword}</span>,
              <span key={`t${i}`} style={{ fontWeight: 600 }}>{steps[i]!.text}</span>,
            ])}
          </div>
          <span style={{ color: muted, fontSize: Math.round(height / 40) }}>
            {shown.at(-1)! + 1} / {steps.length}
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

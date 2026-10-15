import { Video } from '@remotion/media';
import {
  AbsoluteFill,
  interpolate,
  Series,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { background, font, ink, TitleCard } from './theme.js';
import { clipFrames, zoomAt, type VideoManifest } from './zoom.js';

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

/** One recording as a card that fits the composition, zooming to each click, with its caption. */
export function RecordingScene({
  clip,
  zoom,
}: {
  clip: RecordingClip;
  zoom?: number;
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const fit = Math.min(
    (width * 0.86) / clip.width,
    (height * 0.78) / clip.height,
  );
  const camera = zoomAt(clip.clicks, (frame / fps) * 1000, zoom);

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: clip.width * fit,
          height: clip.height * fit,
          marginBottom: height * 0.08,
          overflow: 'hidden',
          borderRadius: 16,
          boxShadow: '0 30px 80px rgba(0,0,0,.45)',
        }}
      >
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
        {clip.caption ?? clip.description ?? clip.name}
      </p>
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
 * Record into that folder with `executable-stories-showcase record --out public/<dir>`.
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

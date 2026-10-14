import { Audio } from '@remotion/media';
import { summarizeStateChanges } from 'executable-stories-core/state-diff';
import type { StoryboardStateCard } from 'executable-stories-core/storyboard';
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { toFrames, type StoryScene, type StoryVideoProps } from './props.js';
import {
  accent,
  background,
  font,
  ink,
  mono,
  muted,
  panel,
  TitleCard,
  useEnter,
} from './theme.js';

/** A scenario as a video: a title card, then each storyboard frame with its step lines as captions. */
export function StoryVideo({
  title,
  feature,
  scenes,
  titleSeconds,
}: StoryVideoProps) {
  const { fps } = useVideoConfig();
  let from = toFrames(titleSeconds, fps);

  return (
    <AbsoluteFill
      style={{ backgroundColor: background, color: ink, fontFamily: font }}
    >
      <Sequence durationInFrames={from} name="Title">
        <TitleCard title={title} kicker={feature} />
      </Sequence>
      {scenes.map((scene, i) => {
        const length = toFrames(scene.seconds, fps);
        const start = from;
        from += length;

        return (
          <Sequence
            key={i}
            from={start}
            durationInFrames={length}
            name={scene.lines.at(-1)}
          >
            <Scene scene={scene} index={i} total={scenes.length} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

function Scene({
  scene,
  index,
  total,
}: {
  scene: StoryScene;
  index: number;
  total: number;
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const enter = useEnter();
  // A slow push-in keeps a still screenshot from feeling frozen.
  const push = interpolate(frame, [0, durationInFrames], [1, 1.04]);

  return (
    <AbsoluteFill style={{ opacity: enter }}>
      {scene.audio && <Audio src={scene.audio} />}
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: 32,
          padding: '48px 64px 0',
          minHeight: 0,
        }}
      >
        {scene.screenshot && (
          <div
            style={{
              flex: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 0,
              overflow: 'hidden',
              borderRadius: 16,
            }}
          >
            <Img
              src={scene.screenshot.src}
              alt={scene.screenshot.alt ?? ''}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 16,
                boxShadow: '0 20px 60px rgba(0,0,0,.5)',
                transform: `scale(${push})`,
              }}
            />
          </div>
        )}
        {scene.states.length > 0 && (
          <div
            style={{
              flex: 2,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 24,
              minWidth: 0,
            }}
          >
            {scene.states.map((card, i) => (
              <StateCard key={card.label ?? i} card={card} delay={6 + i * 6} />
            ))}
          </div>
        )}
      </div>
      <Captions lines={scene.lines} step={`${index + 1} / ${total}`} />
    </AbsoluteFill>
  );
}

function StateCard({
  card,
  delay,
}: {
  card: StoryboardStateCard;
  delay: number;
}) {
  const enter = useEnter(delay);
  const changes = card.changes ? summarizeStateChanges(card.changes) : [];

  return (
    <div
      style={{
        background: panel,
        borderRadius: 16,
        padding: 28,
        border: '1px solid #27272a',
        opacity: enter,
        transform: `translateX(${(1 - enter) * 40}px)`,
      }}
    >
      {card.label && (
        <div style={{ color: muted, fontSize: 24, marginBottom: 12 }}>
          {card.label}
        </div>
      )}
      {changes.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {changes.map((line, i) => (
            <ChangeLine key={i} line={line} delay={delay + 10 + i * 5} />
          ))}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          fontFamily: mono,
          fontSize: 22,
          color: changes.length ? muted : ink,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {JSON.stringify(card.value, null, 2)}
      </pre>
    </div>
  );
}

function ChangeLine({ line, delay }: { line: string; delay: number }) {
  const enter = useEnter(delay);

  return (
    <div
      style={{
        fontFamily: mono,
        fontSize: 28,
        color: accent,
        opacity: enter,
        transform: `scale(${0.9 + 0.1 * enter})`,
        transformOrigin: 'left center',
      }}
    >
      {line}
    </div>
  );
}

function Captions({ lines, step }: { lines: string[]; step: string }) {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        padding: '28px 64px 44px',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 32,
      }}
    >
      <div style={{ flex: 1 }}>
        {lines.map((line, i) => {
          const [keyword, ...rest] = line.split(' ');
          const shown = interpolate(frame, [i * 12, i * 12 + 8], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={i}
              style={{ fontSize: 40, lineHeight: 1.35, opacity: shown }}
            >
              <span style={{ color: accent, fontWeight: 700 }}>{keyword}</span>{' '}
              {rest.join(' ')}
            </div>
          );
        })}
      </div>
      <div style={{ color: muted, fontSize: 24 }}>{step}</div>
    </div>
  );
}

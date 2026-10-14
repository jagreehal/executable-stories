import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const background = '#09090b';
export const ink = '#f4f4f5';
export const muted = '#a1a1aa';
export const accent = '#34d399';
export const panel = '#18181b';
export const font =
  'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif';
export const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/** 0 to 1 as an element settles in, `delay` frames after its sequence starts. */
export function useEnter(delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return spring({ frame: frame - delay, fps, config: { damping: 200 } });
}

export function TitleCard({
  title,
  kicker,
}: {
  title: string;
  kicker?: string;
}) {
  const enter = useEnter();

  return (
    <AbsoluteFill
      style={{ justifyContent: 'center', padding: '0 8%', opacity: enter }}
    >
      {kicker && (
        <div
          style={{
            color: accent,
            fontSize: 28,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {kicker}
        </div>
      )}
      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          lineHeight: 1.1,
          marginTop: 16,
          transform: `translateY(${(1 - enter) * 24}px)`,
        }}
      >
        {title}
      </div>
    </AbsoluteFill>
  );
}

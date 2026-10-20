import {
  AbsoluteFill,
  interpolate,
  Series,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  RecordingPlayer,
  stepAt,
  type RecordingClip,
} from './RecordingVideo.js';
import { useEnter } from './theme.js';
import { clipFrames, type ManifestStep } from './zoom.js';

/** The help-centre article a walkthrough illustrates. */
export type Article = {
  title: string;
  /** Shown on the outro as where to read the full guide. */
  url?: string;
  /** The article's opening line, on the title card. */
  intro?: string;
  /** Small line above the title, e.g. "Help centre". */
  kicker?: string;
};

/** A table shown before the recording, e.g. the spreadsheet an import uploads. */
export type ArticleTable = {
  label: string;
  columns: string[];
  rows: string[][];
};

export type ArticleVideoProps = {
  article: Article;
  /** The article section this recording illustrates. */
  heading: string;
  clip: RecordingClip;
  /**
   * The article's wording for a step, keyed by the step's text. A step without one shows its own
   * text, so a scenario whose steps already use the article's wording needs none.
   */
  quotes?: Record<string, string>;
  /** Shown before the recording, beside the first step's wording. */
  table?: ArticleTable;
  /** Brand colour for the kicker, step numbers and highlight. */
  accent?: string;
  zoom?: number;
  cursor?: boolean;
};

const SECONDS = { title: 3, table: 4, outro: 3 };
/** Row `r` of a table fades in over [ROW_START + r·ROW_GAP, +ROW_FADE] seconds. */
const ROW_START = 0.6;
const ROW_GAP = 0.7;
const ROW_FADE = 0.3;
/** Long enough for every row to appear and hold for a second, never under SECONDS.table. */
const tableSeconds = (table: ArticleTable) =>
  Math.max(
    SECONDS.table,
    ROW_START + (table.rows.length - 1) * ROW_GAP + ROW_FADE + 1,
  );
const PAPER = '#f5f5f7';
const INK = '#111827';
const MUTED = '#6b7280';
const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif';
const ACCENT = '#4f46e5';

/** What each step reads as: the article's wording for it, or the step's own text. */
export const articleSteps = (
  steps: ManifestStep[],
  quotes: Record<string, string> = {},
) => steps.map((s) => quotes[s.text] ?? s.text);

/**
 * A help-centre walkthrough: a title card with the article's opening line, an optional table,
 * the recording beside the article's steps (the one being performed highlighted, the camera on
 * each click and typed field), then an outro pointing at the full article.
 * Length: `articleVideoFrames(props, fps)`.
 */
export function ArticleVideo(props: ArticleVideoProps) {
  const { fps } = useVideoConfig();
  const { article, heading, clip, table, accent = ACCENT } = props;
  const lines = articleSteps(clip.steps ?? [], props.quotes);

  return (
    <AbsoluteFill
      style={{ backgroundColor: PAPER, color: INK, fontFamily: FONT }}
    >
      <Series>
        <Series.Sequence durationInFrames={SECONDS.title * fps} name="Title">
          <ArticleTitle article={article} heading={heading} accent={accent} />
        </Series.Sequence>
        {table && (
          <Series.Sequence
            durationInFrames={Math.round(tableSeconds(table) * fps)}
            name="Table"
          >
            <TableScene table={table} quote={lines[0] ?? ''} />
          </Series.Sequence>
        )}
        <Series.Sequence
          durationInFrames={clipFrames(clip, fps)}
          name="Walkthrough"
        >
          <Walkthrough {...props} lines={lines} accent={accent} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SECONDS.outro * fps} name="Outro">
          <Outro article={article} accent={accent} />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
}

/** Total length in frames, for `calculateMetadata`. */
export const articleVideoFrames = (
  { clip, table }: Pick<ArticleVideoProps, 'clip' | 'table'>,
  fps: number,
) =>
  (SECONDS.title + SECONDS.outro) * fps +
  (table ? Math.round(tableSeconds(table) * fps) : 0) +
  clipFrames(clip, fps);

function ArticleTitle({
  article,
  heading,
  accent,
}: {
  article: Article;
  heading: string;
  accent: string;
}) {
  const entered = {
    0: useEnter(0),
    6: useEnter(6),
    15: useEnter(15),
    27: useEnter(27),
  };
  const rise = (delay: keyof typeof entered) => ({
    opacity: entered[delay],
    transform: `translateY(${(1 - entered[delay]) * 24}px)`,
  });

  return (
    <AbsoluteFill style={{ padding: '0 160px', justifyContent: 'center' }}>
      {article.kicker && (
        <div
          style={{
            ...rise(0),
            color: accent,
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {article.kicker}
        </div>
      )}
      <h1
        style={{
          ...rise(6),
          fontSize: 96,
          lineHeight: 1.05,
          margin: '24px 0 0',
          fontWeight: 700,
        }}
      >
        {article.title}
      </h1>
      {article.intro && (
        <p
          style={{
            ...rise(15),
            color: MUTED,
            fontSize: 48,
            lineHeight: 1.35,
            margin: '40px 0 0',
            maxWidth: 1400,
          }}
        >
          {article.intro}
        </p>
      )}
      <div
        style={{
          ...rise(27),
          marginTop: 56,
          alignSelf: 'flex-start',
          padding: '14px 28px',
          borderRadius: 999,
          backgroundColor: accent,
          color: 'white',
          fontSize: 40,
          fontWeight: 600,
        }}
      >
        {heading}
      </div>
    </AbsoluteFill>
  );
}

function TableScene({ table, quote }: { table: ArticleTable; quote: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line = {
    padding: '18px 24px',
    borderBottom: '1px solid #e5e7eb',
    borderRight: '1px solid #e5e7eb',
  };

  return (
    <AbsoluteFill
      style={{ padding: '100px 120px', gap: 48, opacity: useEnter() }}
    >
      <p style={{ margin: 0, fontSize: 48, lineHeight: 1.35, maxWidth: 1600 }}>
        {quote}
      </p>
      <div
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,.18)',
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            backgroundColor: '#107c41',
            color: 'white',
            fontSize: 30,
            fontWeight: 600,
            padding: '18px 28px',
          }}
        >
          {table.label}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `72px repeat(${table.columns.length}, 1fr)`,
            fontSize: 34,
          }}
        >
          {['', ...table.columns].map((c, i) => (
            <div
              key={i}
              style={{
                ...line,
                backgroundColor: '#f3f4f6',
                color: MUTED,
                fontWeight: 600,
              }}
            >
              {c}
            </div>
          ))}
          {table.rows.flatMap((row, r) =>
            [String(r + 2), ...row].map((cell, c) => (
              <div
                key={`${r}-${c}`}
                style={{
                  ...line,
                  color: c === 0 ? MUTED : INK,
                  // Each row appears after the last, as if being filled in.
                  opacity: interpolate(
                    frame,
                    [
                      (ROW_START + r * ROW_GAP) * fps,
                      (ROW_START + r * ROW_GAP + ROW_FADE) * fps,
                    ],
                    [0, 1],
                    {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    },
                  ),
                }}
              >
                {cell}
              </div>
            )),
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
}

const PANEL = 620;

function Walkthrough({
  article,
  heading,
  clip,
  lines,
  accent,
  zoom = 1.35,
  cursor,
}: ArticleVideoProps & { lines: string[]; accent: string }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const steps = clip.steps ?? [];
  const current = stepAt(steps, (frame / fps) * 1000);
  const appear = useEnter(Math.round(((steps[current]?.t ?? 0) / 1000) * fps));
  const fit = Math.min(
    (width - PANEL - 3 * 60) / clip.width,
    (height - 2 * 80) / clip.height,
  );

  return (
    <AbsoluteFill
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0 60px',
        gap: 60,
      }}
    >
      <div
        style={{
          width: PANEL,
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        <div
          style={{
            color: accent,
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {article.title}
        </div>
        <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.1 }}>
          {heading}
        </div>
        <ol
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {lines.map((text, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                gap: 18,
                fontSize: i === current ? 36 : 24,
                lineHeight: 1.35,
                color: i === current ? INK : MUTED,
                opacity:
                  i === current ? 0.4 + 0.6 * appear : i < current ? 0.55 : 0.3,
                fontWeight: i === current ? 600 : 400,
              }}
            >
              <span
                style={{
                  flex: 'none',
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'white',
                  backgroundColor: i <= current ? accent : '#d1d5db',
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  borderLeft: `4px solid ${i === current ? accent : 'transparent'}`,
                  paddingLeft: 14,
                }}
              >
                {text}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <RecordingPlayer
        clip={clip}
        zoom={zoom}
        cursor={cursor}
        style={{
          width: clip.width * fit,
          height: clip.height * fit,
          borderRadius: 18,
          boxShadow: '0 30px 80px rgba(0,0,0,.25)',
          backgroundColor: 'white',
        }}
      />
    </AbsoluteFill>
  );
}

function Outro({ article, accent }: { article: Article; accent: string }) {
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        opacity: useEnter(),
      }}
    >
      <p style={{ margin: 0, color: MUTED, fontSize: 44 }}>
        Read the full guide
      </p>
      <h2 style={{ margin: '20px 0 0', fontSize: 84, fontWeight: 700 }}>
        {article.title}
      </h2>
      {article.url && (
        <p
          style={{
            margin: '28px 0 0',
            color: accent,
            fontSize: 40,
            fontWeight: 600,
          }}
        >
          {article.url}
        </p>
      )}
    </AbsoluteFill>
  );
}

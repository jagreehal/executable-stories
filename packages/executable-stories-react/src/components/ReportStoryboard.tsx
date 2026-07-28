import type { ReportScenario } from "executable-stories-core";
// Subpath import: the core package root pulls in Node-only converters
// (node:crypto), which breaks browser bundles — see formatDuration's import.
import { extractStoryboardFrames } from "executable-stories-core/storyboard";
import type { StoryboardFrame, StoryboardStateCard } from "executable-stories-core/storyboard";
import { summarizeStateChanges } from "executable-stories-core/state-diff";
import type { StateChangeKind } from "executable-stories-core/state-diff";
import { isLocalFsPath, safeImageUrl } from "executable-stories-core/utils/url";
import { cn } from "@/lib/utils";

export interface ReportStoryboardProps {
  scenario: ReportScenario;
}

const FRAME_GLYPH: Record<string, string> = {
  passed: "✓",
  failed: "✗",
  skipped: "○",
  pending: "○",
};

const FRAME_GLYPH_COLOR: Record<string, string> = {
  passed: "text-pass",
  failed: "text-fail",
  skipped: "text-skip",
  pending: "text-pend",
};

/**
 * Storyboard — a horizontal filmstrip of the scenario's step evidence
 * (Given → When → Then), derived from the same step docs the vertical step
 * list renders. A frame is a container: the step's screenshot (when present)
 * plus its `story.state()` snapshot cards, so data-only scenarios get
 * filmstrips too. Each frame links to its step's anchor.
 *
 * Renders nothing below 2 frames: a single capture is evidence, not a
 * walkthrough, and it already shows under its step.
 *
 * Must stay hydration-free: the Astro story pages render this inside a static
 * (no client JS) island, so navigation is plain anchors and snapshot expansion
 * is a native <details> — no lightbox or toggle state.
 */
export function ReportStoryboard({ scenario }: ReportStoryboardProps) {
  const frames = extractStoryboardFrames(scenario);
  if (frames.length < 2) return null;
  return (
    <section data-slot="storyboard" aria-label="Storyboard" className="mb-3">
      <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Storyboard
      </h4>
      <ol className="flex items-start gap-3 overflow-x-auto pb-2">
        {frames.map((frame) => (
          <StoryboardFrameItem key={frame.stepId} frame={frame} />
        ))}
      </ol>
    </section>
  );
}

function StoryboardFrameItem({ frame }: { frame: StoryboardFrame }) {
  const label = `${frame.keyword} ${frame.text}`;
  const hasStates = frame.states.length > 0;
  const caption = (
    <p className="mt-1 flex items-baseline gap-1.5 text-[0.6875rem] leading-snug">
      <span aria-hidden className={cn("shrink-0", FRAME_GLYPH_COLOR[frame.status])}>
        {FRAME_GLYPH[frame.status] ?? "○"}
      </span>
      <span className="min-w-0">
        <span className="font-mono font-semibold text-keyword">{frame.keyword}</span>{" "}
        <span className="text-muted-foreground">{frame.screenshot?.alt ?? frame.text}</span>
      </span>
    </p>
  );
  return (
    // State cards need room for diff rows; screenshot-only frames keep the
    // original narrow film-cell width (and DOM) unchanged.
    <li className={cn("shrink-0", hasStates ? "w-64" : "w-40")}>
      {frame.screenshot ? (
        <FrameScreenshot frame={frame} label={label} />
      ) : null}
      {hasStates ? (
        <div className={cn("flex flex-col gap-1.5", frame.screenshot && "mt-1.5")}>
          {frame.states.map((card, i) => (
            <StateCardView key={card.label ?? i} card={card} />
          ))}
        </div>
      ) : null}
      {frame.screenshot ? (
        caption
      ) : (
        // No screenshot means no image anchor, so the caption carries the
        // jump-to-step link instead.
        <a href={`#${frame.stepId}`} aria-label={`Jump to step: ${label}`} className="block hover:underline">
          {caption}
        </a>
      )}
    </li>
  );
}

function FrameScreenshot({ frame, label }: { frame: StoryboardFrame; label: string }) {
  const path = frame.screenshot?.path ?? "";
  const src = isLocalFsPath(path) ? undefined : safeImageUrl(path);
  return (
    <a
      href={`#${frame.stepId}`}
      aria-label={`Jump to step: ${label}`}
      className="block overflow-hidden rounded-md border border-border transition-colors hover:border-ring"
    >
      {src ? (
        <img
          src={src}
          alt={frame.screenshot?.alt ?? label}
          loading="lazy"
          className="h-24 w-full bg-muted object-cover object-top"
        />
      ) : (
        <span className="flex h-24 w-full items-center justify-center border-b border-dashed border-border bg-muted px-2 text-center text-[0.6875rem] text-muted-foreground">
          Screenshot unavailable
        </span>
      )}
    </a>
  );
}

// Same accent scheme as the status badges/KPI cards: green = new, red = gone,
// amber (skip tokens) = changed. Text + bg pairs are the AA-audited --es-*
// combinations from tailwind.css.
const CHANGE_TONE: Record<StateChangeKind, string> = {
  added: "bg-pass-bg text-pass",
  removed: "bg-fail-bg text-fail",
  changed: "bg-skip-bg text-skip",
};

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * One `story.state()` snapshot card: label chip, then what changed since the
 * previous frame's snapshot of the same label (changed fields first, full
 * snapshot behind a disclosure). First appearance shows the snapshot itself
 * with a "first capture" hint — there is nothing to diff against yet.
 */
function StateCardView({ card }: { card: StoryboardStateCard }) {
  const json = prettyJson(card.value);
  const firstCapture = card.changes === undefined;
  return (
    <div data-slot="state-card" className="rounded-md border border-border bg-card p-2">
      <p className="flex flex-wrap items-baseline gap-1.5">
        <span className="inline-flex rounded-full border border-border px-1.5 font-mono text-[0.625rem] font-medium text-muted-foreground">
          {card.label ?? "State"}
        </span>
        {firstCapture ? (
          <span className="text-[0.625rem] text-muted-foreground italic">first capture</span>
        ) : null}
      </p>
      {!firstCapture &&
        (card.changes && card.changes.length > 0 ? (
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {card.changes.map((change, i) => (
              <li
                key={i}
                className={cn(
                  "rounded-sm px-1.5 py-0.5 font-mono text-[0.625rem] leading-snug break-all",
                  CHANGE_TONE[change.kind]
                )}
              >
                {summarizeStateChanges([change])[0]}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-[0.625rem] text-muted-foreground">No changes</p>
        ))}
      <details
        // First capture opens short snapshots by default: it IS the card's
        // content. Diff cards keep the snapshot collapsed — the rows above
        // already tell the story.
        open={firstCapture && json.length <= 240}
        className={cn(firstCapture ? "mt-1.5" : "mt-1")}
      >
        <summary className="cursor-pointer text-[0.625rem] text-muted-foreground hover:text-foreground">
          Snapshot
        </summary>
        <pre tabIndex={0} className="mt-1 max-h-48 overflow-auto rounded-sm bg-muted p-1.5 font-mono text-[0.625rem] leading-snug">
          {json}
        </pre>
      </details>
    </div>
  );
}

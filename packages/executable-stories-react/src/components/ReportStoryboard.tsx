import type { ReportScenario } from "executable-stories-core";
// Subpath import: the core package root pulls in Node-only converters
// (node:crypto), which breaks browser bundles — see formatDuration's import.
import { extractStoryboardFrames } from "executable-stories-core/storyboard";
import type { StoryboardFrame } from "executable-stories-core/storyboard";
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
 * Storyboard — a horizontal filmstrip of the scenario's step screenshots
 * (Given → When → Then), derived from the same step docs the vertical step
 * list renders. Each frame links to its step's anchor, where the full-size
 * screenshot and step detail live.
 *
 * Renders nothing below 2 frames: a single screenshot is evidence, not a
 * walkthrough, and it already shows under its step.
 *
 * Must stay hydration-free: the Astro story pages render this inside a static
 * (no client JS) island, so navigation is plain anchors — no lightbox state.
 */
export function ReportStoryboard({ scenario }: ReportStoryboardProps) {
  const frames = extractStoryboardFrames(scenario);
  if (frames.length < 2) return null;
  return (
    <section data-slot="storyboard" aria-label="Storyboard" className="mb-3">
      <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Storyboard
      </h4>
      <ol className="flex gap-3 overflow-x-auto pb-2">
        {frames.map((frame) => (
          <StoryboardFrameItem key={frame.stepId} frame={frame} />
        ))}
      </ol>
    </section>
  );
}

function StoryboardFrameItem({ frame }: { frame: StoryboardFrame }) {
  const src = isLocalFsPath(frame.path) ? undefined : safeImageUrl(frame.path);
  const label = `${frame.keyword} ${frame.text}`;
  return (
    <li className="w-40 shrink-0">
      <a
        href={`#${frame.stepId}`}
        aria-label={`Jump to step: ${label}`}
        className="block overflow-hidden rounded-md border border-border transition-colors hover:border-ring"
      >
        {src ? (
          <img
            src={src}
            alt={frame.alt ?? label}
            loading="lazy"
            className="h-24 w-full bg-muted object-cover object-top"
          />
        ) : (
          <span className="flex h-24 w-full items-center justify-center border-b border-dashed border-border bg-muted px-2 text-center text-[0.6875rem] text-muted-foreground">
            Screenshot unavailable
          </span>
        )}
      </a>
      <p className="mt-1 flex items-baseline gap-1.5 text-[0.6875rem] leading-snug">
        <span aria-hidden className={cn("shrink-0", FRAME_GLYPH_COLOR[frame.status])}>
          {FRAME_GLYPH[frame.status] ?? "○"}
        </span>
        <span className="min-w-0">
          <span className="font-mono font-semibold text-keyword">{frame.keyword}</span>{" "}
          <span className="text-muted-foreground">{frame.alt ?? frame.text}</span>
        </span>
      </p>
    </li>
  );
}

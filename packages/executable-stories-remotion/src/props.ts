import type { ReportScenario, StoryReport } from 'executable-stories-core';
import {
  extractStoryboardFrames,
  type StoryboardStateCard,
} from 'executable-stories-core/storyboard';

/** One scene of a story video: a frame of the storyboard and the step lines it narrates. */
export type StoryScene = {
  /** Step lines, keyword first ("Given a basket with one item"). Steps with no frame fold into the next scene. */
  lines: string[];
  screenshot?: { src: string; alt?: string };
  states: StoryboardStateCard[];
  /** How long the scene stays on screen. Set it to the narration's length when you add `audio`. */
  seconds: number;
  /** Voiceover for the scene, as a URL or a `staticFile()` path. */
  audio?: string;
};

export type StoryVideoProps = {
  title: string;
  feature: string;
  scenes: StoryScene[];
  /** Seconds the title card shows before the first scene. */
  titleSeconds: number;
};

/** Reading time for a scene: about 3 words a second, at least 2.5 seconds. */
export const readingSeconds = (lines: string[]) =>
  Math.max(2.5, 1 + lines.join(' ').split(/\s+/).length / 3);

function findScenario(report: StoryReport, scenario: string) {
  for (const feature of report.features) {
    const found = feature.scenarios.find(
      (s) => s.id === scenario || s.title === scenario,
    );

    if (found) return { feature, found };
  }

  const titles = report.features.flatMap((f) =>
    f.scenarios.map((s) => s.title),
  );
  throw new Error(
    `No scenario "${scenario}" in the report. Scenarios: ${titles.join(', ')}`,
  );
}

/**
 * Props for `<StoryVideo>` from a StoryReport: one scene per storyboard frame, in step order.
 * A frame is a step's screenshot and its `story.state()` snapshots, so a scenario with no UI
 * still gets a video. Only passed scenarios qualify: a demo shows behaviour the suite proved.
 */
export function storyVideoProps({
  report,
  scenario,
  resolveAsset = (path) => path,
  titleSeconds = 2,
}: {
  report: StoryReport;
  /** Scenario id or title. */
  scenario: string;
  /** Maps a screenshot path from the report to a src the video can load, e.g. via `staticFile()`. */
  resolveAsset?: (path: string) => string;
  titleSeconds?: number;
}): StoryVideoProps {
  const { feature, found } = findScenario(report, scenario);

  if (found.status !== 'passed') {
    throw new Error(
      `Scenario "${found.title}" is ${found.status}; a story video needs a passed run`,
    );
  }

  const scenes = toScenes(found, resolveAsset);

  if (!scenes.length) {
    throw new Error(
      `Scenario "${found.title}" has no frames: add story.screenshot() or story.state() to its steps`,
    );
  }

  return { title: found.title, feature: feature.title, scenes, titleSeconds };
}

function toScenes(
  scenario: ReportScenario,
  resolveAsset: (path: string) => string,
): StoryScene[] {
  const frames = new Map(
    extractStoryboardFrames(scenario).map((f) => [f.stepIndex, f]),
  );
  const scenes: StoryScene[] = [];
  let pending: string[] = [];

  for (const step of scenario.steps) {
    const line = `${step.keyword} ${step.text}`;
    const frame = frames.get(step.index);

    if (!frame) {
      pending.push(line);
      continue;
    }

    const lines = [...pending, line];
    pending = [];
    scenes.push({
      lines,
      ...(frame.screenshot && {
        screenshot: {
          src: resolveAsset(frame.screenshot.path),
          alt: frame.screenshot.alt,
        },
      }),
      states: frame.states,
      seconds: readingSeconds(lines),
    });
  }

  // Steps after the last frame narrate over it.
  const last = scenes.at(-1);

  if (last && pending.length) {
    last.lines.push(...pending);
    last.seconds = readingSeconds(last.lines);
  }

  return scenes;
}

/** Frames a title or scene of `seconds` occupies; the component and the total both use it. */
export const toFrames = (seconds: number, fps: number) =>
  Math.max(1, Math.round(seconds * fps));

/** Total length in frames, for `calculateMetadata`: the sum of what `<StoryVideo>` places. */
export const storyVideoFrames = (props: StoryVideoProps, fps: number) =>
  props.scenes.reduce(
    (n, s) => n + toFrames(s.seconds, fps),
    toFrames(props.titleSeconds, fps),
  );

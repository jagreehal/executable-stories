import { describe, it, expect } from "vitest";

import { extractStoryboardFrames } from "./storyboard.js";
import type { ReportDocEntry, ReportScenario, ReportStep } from "./types/story-report.js";

const step = (index: number, docEntries: ReportDocEntry[] = [], overrides: Partial<ReportStep> = {}): ReportStep => ({
  id: `s1--step-${index}`,
  index,
  keyword: "Given",
  text: `step ${index}`,
  status: "passed",
  durationMs: 1,
  docEntries,
  ...overrides,
});

const scenario = (steps: ReportStep[]): ReportScenario =>
  ({
    id: "s1",
    title: "t",
    status: "passed",
    durationMs: 1,
    tags: [],
    retry: 0,
    retries: 0,
    docEntries: [],
    steps,
    attachments: [],
  }) as ReportScenario;

const shot = (path: string, alt?: string): ReportDocEntry => ({
  kind: "screenshot",
  path,
  ...(alt !== undefined && { alt }),
  phase: "runtime",
});

describe("extractStoryboardFrames", () => {
  it("returns one frame per step with a screenshot, in step order", () => {
    const frames = extractStoryboardFrames(
      scenario([
        step(0, [shot("a.png", "Cart")]),
        step(1, []),
        step(2, [shot("b.png")], { keyword: "Then", text: "confirmed", status: "failed" }),
      ]),
    );
    expect(frames).toEqual([
      { stepId: "s1--step-0", stepIndex: 0, keyword: "Given", text: "step 0", status: "passed", path: "a.png", alt: "Cart" },
      { stepId: "s1--step-2", stepIndex: 2, keyword: "Then", text: "confirmed", status: "failed", path: "b.png" },
    ]);
  });

  it("takes only the first screenshot when a step has several", () => {
    const frames = extractStoryboardFrames(scenario([step(0, [shot("first.png"), shot("second.png")])]));
    expect(frames).toHaveLength(1);
    expect(frames[0]?.path).toBe("first.png");
  });

  it("finds screenshots nested inside grouped docs", () => {
    const grouped: ReportDocEntry = {
      kind: "section",
      title: "Evidence",
      markdown: "",
      phase: "runtime",
      children: [shot("nested.png")],
    };
    const frames = extractStoryboardFrames(scenario([step(0, [grouped])]));
    expect(frames[0]?.path).toBe("nested.png");
  });

  it("ignores non-screenshot docs and returns [] when no step has a screenshot", () => {
    const note: ReportDocEntry = { kind: "note", text: "n", phase: "static" };
    expect(extractStoryboardFrames(scenario([step(0, [note]), step(1)]))).toEqual([]);
  });
});

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

const state = (value: unknown, label?: string): ReportDocEntry => ({
  kind: "state",
  ...(label !== undefined && { label }),
  value,
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
      {
        stepId: "s1--step-0",
        stepIndex: 0,
        keyword: "Given",
        text: "step 0",
        status: "passed",
        screenshot: { path: "a.png", alt: "Cart" },
        states: [],
      },
      {
        stepId: "s1--step-2",
        stepIndex: 2,
        keyword: "Then",
        text: "confirmed",
        status: "failed",
        screenshot: { path: "b.png" },
        states: [],
      },
    ]);
  });

  it("takes only the first screenshot when a step has several", () => {
    const frames = extractStoryboardFrames(scenario([step(0, [shot("first.png"), shot("second.png")])]));
    expect(frames).toHaveLength(1);
    expect(frames[0]?.screenshot?.path).toBe("first.png");
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
    expect(frames[0]?.screenshot?.path).toBe("nested.png");
  });

  it("ignores non-frame docs and returns [] when no step has evidence", () => {
    const note: ReportDocEntry = { kind: "note", text: "n", phase: "static" };
    expect(extractStoryboardFrames(scenario([step(0, [note]), step(1)]))).toEqual([]);
  });

  it("a step with only state docs contributes a frame (no screenshot needed)", () => {
    const frames = extractStoryboardFrames(scenario([step(0, [state({ items: 0 }, "Basket")])]));
    expect(frames).toEqual([
      {
        stepId: "s1--step-0",
        stepIndex: 0,
        keyword: "Given",
        text: "step 0",
        status: "passed",
        states: [{ label: "Basket", value: { items: 0 } }],
      },
    ]);
  });

  it("diffs consecutive frames label-to-label; first appearance has no changes", () => {
    const frames = extractStoryboardFrames(
      scenario([
        step(0, [state({ items: [], total: 0 }, "Basket")]),
        step(1, [state({ items: ["hoodie"], total: 27 }, "Basket")], { keyword: "When" }),
      ]),
    );
    expect(frames[0]?.states[0]?.changes).toBeUndefined();
    expect(frames[1]?.states[0]?.changes).toEqual([
      { path: "items[0]", kind: "added", after: "hoodie" },
      { path: "total", kind: "changed", before: 0, after: 27 },
    ]);
  });

  it("diffs skip frame gaps: a lane pairs with its previous appearance, not the previous frame", () => {
    const frames = extractStoryboardFrames(
      scenario([
        step(0, [state({ n: 1 }, "Basket")]),
        step(1, [state({ ok: true }, "Inventory")]),
        step(2, [state({ n: 2 }, "Basket")]),
      ]),
    );
    expect(frames[2]?.states[0]?.changes).toEqual([{ path: "n", kind: "changed", before: 1, after: 2 }]);
  });

  it("keeps lanes in first-appearance order across frames", () => {
    const frames = extractStoryboardFrames(
      scenario([
        step(0, [state({ b: 1 }, "Basket"), state({ i: 1 }, "Inventory")]),
        step(1, [state({ i: 2 }, "Inventory"), state({ b: 2 }, "Basket")]),
      ]),
    );
    expect(frames[1]?.states.map((s) => s.label)).toEqual(["Basket", "Inventory"]);
  });

  it("last snapshot wins when a step captures the same label twice", () => {
    const frames = extractStoryboardFrames(scenario([step(0, [state({ n: 1 }, "Basket"), state({ n: 2 }, "Basket")])]));
    expect(frames[0]?.states).toEqual([{ label: "Basket", value: { n: 2 } }]);
  });

  it("unlabeled states share the anonymous lane and diff against each other", () => {
    const frames = extractStoryboardFrames(scenario([step(0, [state({ n: 1 })]), step(1, [state({ n: 5 })])]));
    expect(frames[1]?.states[0]?.changes).toEqual([{ path: "n", kind: "changed", before: 1, after: 5 }]);
    expect(frames[1]?.states[0]?.label).toBeUndefined();
  });

  it("combines a screenshot and state cards in one frame", () => {
    const frames = extractStoryboardFrames(scenario([step(0, [shot("checkout.png"), state({ paid: true }, "Order")])]));
    expect(frames[0]?.screenshot?.path).toBe("checkout.png");
    expect(frames[0]?.states[0]).toEqual({ label: "Order", value: { paid: true } });
  });

  it("finds state docs nested inside grouped docs", () => {
    const grouped: ReportDocEntry = {
      kind: "section",
      title: "Evidence",
      markdown: "",
      phase: "runtime",
      children: [state({ n: 1 }, "Basket")],
    };
    const frames = extractStoryboardFrames(scenario([step(0, [grouped])]));
    expect(frames[0]?.states[0]?.label).toBe("Basket");
  });
});

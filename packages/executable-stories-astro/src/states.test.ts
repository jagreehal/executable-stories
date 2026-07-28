import { describe, it, expect } from "vitest";

import { chapterEndStates, extractStates, parseStateTag, stateThumbnail, stateValueLines, viewportOf } from "./states.js";

const PNG = "data:image/png;base64,abc";

const scenario = (tags: string[], steps: unknown[] = []) =>
  ({ tags, status: "passed", steps }) as never;

const step = (index: number, docEntries: unknown[]) => ({
  id: `s--step-${index}`,
  index,
  keyword: "Given",
  text: "t",
  status: "passed",
  durationMs: 1,
  docEntries,
});

const shotStep = (path: string, alt?: string) =>
  step(0, [{ kind: "screenshot", path, ...(alt !== undefined && { alt }), phase: "runtime" }]);

const stateDoc = (value: unknown, label?: string) =>
  ({ kind: "state", ...(label !== undefined && { label }), value, phase: "runtime" });

describe("parseStateTag / viewportOf", () => {
  it("parses state and viewport tags, normalizing case", () => {
    expect(parseStateTag("state:Empty-Cart")).toBe("empty-cart");
    expect(parseStateTag("capability:checkout")).toBeUndefined();
    expect(viewportOf({ tags: ["viewport:Mobile", "state:error"] })).toBe("mobile");
    expect(viewportOf({ tags: ["state:error"] })).toBeUndefined();
  });
});

describe("extractStates", () => {
  it("groups by state in first-seen order; multi-state scenarios join each group", () => {
    const both = scenario(["state:cart", "state:checkout"]);
    const states = extractStates([both, scenario(["state:checkout"]), scenario(["storyboard"])]);
    expect(states.map((s) => s.id)).toEqual(["cart", "checkout"]);
    expect(states[0]?.label).toBe("Cart");
    expect(states[1]?.scenarios).toHaveLength(2);
  });

  it("returns [] when nothing is state-tagged", () => {
    expect(extractStates([scenario(["support"])])).toEqual([]);
  });
});

describe("stateThumbnail", () => {
  it("uses the first storyboard frame's screenshot when browser-renderable", () => {
    expect(stateThumbnail(scenario(["state:cart"], [shotStep(PNG, "Cart")]))).toEqual({
      kind: "image",
      src: PNG,
      alt: "Cart",
    });
    expect(stateThumbnail(scenario(["state:cart"], [shotStep("assets/cart.png")]))).toEqual({
      kind: "image",
      src: "assets/cart.png",
    });
  });

  it("returns undefined for no frames, local fs paths, and unsafe schemes", () => {
    expect(stateThumbnail(scenario(["state:cart"]))).toBeUndefined();
    expect(stateThumbnail(scenario(["state:cart"], [shotStep("/tmp/gone.png")]))).toBeUndefined();
    expect(stateThumbnail(scenario(["state:cart"], [shotStep("javascript:alert(1)")]))).toBeUndefined();
  });

  it("falls back to a data card for a state-only first frame", () => {
    const s = scenario(["state:paid"], [step(0, [stateDoc({ total: 42, currency: "GBP" }, "Order")])]);
    expect(stateThumbnail(s)).toEqual({
      kind: "data",
      label: "Order",
      lines: ["total: 42", 'currency: "GBP"'],
    });
  });

  it("falls back to a data card when the screenshot is unrenderable but states exist", () => {
    const s = scenario(
      ["state:paid"],
      [step(0, [{ kind: "screenshot", path: "/tmp/gone.png", phase: "runtime" }, stateDoc({ ok: true })])],
    );
    expect(stateThumbnail(s)).toEqual({ kind: "data", lines: ["ok: true"] });
  });

  it("prefers the screenshot when a frame has both", () => {
    const s = scenario(["state:paid"], [step(0, [{ kind: "screenshot", path: PNG, phase: "runtime" }, stateDoc({ ok: true })])]);
    expect(stateThumbnail(s)).toEqual({ kind: "image", src: PNG });
  });
});

describe("stateValueLines", () => {
  it("renders object snapshots as key/value lines, capped with a remainder line", () => {
    expect(stateValueLines({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 })).toEqual([
      "a: 1",
      "b: 2",
      "c: 3",
      "d: 4",
      "… 2 more",
    ]);
  });

  it("renders non-object snapshots as a single JSON line", () => {
    expect(stateValueLines("pending")).toEqual(['"pending"']);
    expect(stateValueLines([1, 2])).toEqual(["[1,2]"]);
  });
});

describe("chapterEndStates", () => {
  it("returns the latest snapshot per lane, in first-appearance order", () => {
    const s = scenario(
      [],
      [
        step(0, [stateDoc({ items: 0 }, "Basket"), stateDoc({ status: "new" }, "Order")]),
        step(1, [stateDoc({ items: 2 }, "Basket")]),
      ],
    );
    const end = chapterEndStates(s);
    expect(end.map((c) => c.label)).toEqual(["Basket", "Order"]);
    expect(end[0]?.value).toEqual({ items: 2 });
    expect(end[1]?.value).toEqual({ status: "new" });
  });

  it("returns [] when the scenario captures no state (screenshot-only frames included)", () => {
    expect(chapterEndStates(scenario([]))).toEqual([]);
    expect(chapterEndStates(scenario([], [shotStep(PNG)]))).toEqual([]);
  });
});

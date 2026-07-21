import { describe, it, expect } from "vitest";

import { extractStates, parseStateTag, stateThumbnail, viewportOf } from "./states.js";

const PNG = "data:image/png;base64,abc";

const scenario = (tags: string[], steps: unknown[] = []) =>
  ({ tags, status: "passed", steps }) as never;

const shotStep = (path: string, alt?: string) => ({
  id: "s--step-0",
  index: 0,
  keyword: "Given",
  text: "t",
  status: "passed",
  durationMs: 1,
  docEntries: [{ kind: "screenshot", path, ...(alt !== undefined && { alt }), phase: "runtime" }],
});

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
  it("uses the first storyboard frame when browser-renderable", () => {
    expect(stateThumbnail(scenario(["state:cart"], [shotStep(PNG, "Cart")]))).toEqual({ src: PNG, alt: "Cart" });
    expect(stateThumbnail(scenario(["state:cart"], [shotStep("assets/cart.png")]))).toEqual({ src: "assets/cart.png" });
  });

  it("returns undefined for no frames, local fs paths, and unsafe schemes", () => {
    expect(stateThumbnail(scenario(["state:cart"]))).toBeUndefined();
    expect(stateThumbnail(scenario(["state:cart"], [shotStep("/tmp/gone.png")]))).toBeUndefined();
    expect(stateThumbnail(scenario(["state:cart"], [shotStep("javascript:alert(1)")]))).toBeUndefined();
  });
});

import { describe, it, expect } from "vitest";

import { extractJourneys, parseJourneyTag } from "./journeys.js";

const s = (tags: string[], status: "passed" | "failed" | "skipped" | "pending" = "passed") => ({ tags, status });

describe("parseJourneyTag", () => {
  it("parses id and optional order, normalizing case", () => {
    expect(parseJourneyTag("journey:guest-checkout")).toEqual({ id: "guest-checkout" });
    expect(parseJourneyTag("Journey:Guest-Checkout:2")).toEqual({ id: "guest-checkout", order: 2 });
  });

  it("rejects non-journey and malformed tags", () => {
    expect(parseJourneyTag("capability:checkout")).toBeUndefined();
    expect(parseJourneyTag("journey:")).toBeUndefined();
    expect(parseJourneyTag("journey:a b")).toBeUndefined();
  });
});

describe("extractJourneys", () => {
  it("orders members by explicit position, then input order", () => {
    const pay = s(["journey:checkout:2"]);
    const browse = s(["journey:checkout:1"]);
    const confirm = s(["journey:checkout"]); // unordered → after ordered members
    const [journey] = extractJourneys([pay, confirm, browse]);
    expect(journey?.title).toBe("Checkout");
    expect(journey?.scenarios).toEqual([browse, pay, confirm]);
  });

  it("aggregates status: any failed → failed; all passed → passed; else pending", () => {
    expect(extractJourneys([s(["journey:a:1"]), s(["journey:a:2"], "failed")])[0]?.status).toBe("failed");
    expect(extractJourneys([s(["journey:b:1"]), s(["journey:b:2"])])[0]?.status).toBe("passed");
    expect(extractJourneys([s(["journey:c:1"]), s(["journey:c:2"], "skipped")])[0]?.status).toBe("pending");
  });

  it("keeps journeys in first-seen order and lets a scenario join several", () => {
    const both = s(["journey:checkout:1", "journey:refunds:1"]);
    const journeys = extractJourneys([both, s(["journey:refunds:2"])]);
    expect(journeys.map((j) => j.id)).toEqual(["checkout", "refunds"]);
    expect(journeys[1]?.scenarios).toHaveLength(2);
  });

  it("returns [] when nothing is journey-tagged", () => {
    expect(extractJourneys([s(["storyboard"]), s([])])).toEqual([]);
  });
});

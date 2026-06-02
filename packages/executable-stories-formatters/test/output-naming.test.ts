import { describe, it, expect } from "vitest";
import { joinNameAndExt } from "../src/index";

describe("joinNameAndExt", () => {
  it("keeps the self-describing compound extension with the default name", () => {
    expect(joinNameAndExt("index", ".story-report.json")).toBe("index.story-report.json");
    expect(joinNameAndExt("index", ".scenarios-index.json")).toBe("index.scenarios-index.json");
  });

  it("collapses the stutter when the name already carries the format tag", () => {
    expect(joinNameAndExt("story-report", ".story-report.json")).toBe("story-report.json");
  });

  it("leaves simple extensions untouched", () => {
    expect(joinNameAndExt("report", ".html")).toBe("report.html");
    expect(joinNameAndExt("report", ".md")).toBe("report.md");
  });

  it("does not collapse when the name only partially matches the tag", () => {
    expect(joinNameAndExt("story", ".story-report.json")).toBe("story.story-report.json");
  });
});

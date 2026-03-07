import { describe, it, expect } from "vitest";
import { story } from "../story-api";
import type { StoryMeta } from "../types";

function getStoryMeta(task: { meta: object }): StoryMeta {
  return (task.meta as { story: StoryMeta }).story;
}

describe("Story API", () => {
  it("initializes story metadata from a vitest task", ({ task }) => {
    story.init(task);

    story.given("a vitest task with a test name");
    const meta = getStoryMeta(task);

    story.when("story.init(task) is called");
    // already called above

    story.then("StoryMeta is attached to task.meta.story");
    expect(meta).toBeDefined();
    expect(meta.scenario).toBe("initializes story metadata from a vitest task");
    expect(meta.steps).toHaveLength(3);
  });

  it("records given/when/then steps in source order", ({ task }) => {
    story.init(task);

    story.given("a fresh story context");
    story.when("multiple steps are registered");
    story.then("they appear in the order they were called");

    const meta = getStoryMeta(task);
    expect(meta.steps).toHaveLength(3);
    expect(meta.steps[0].keyword).toBe("Given");
    expect(meta.steps[1].keyword).toBe("When");
    expect(meta.steps[2].keyword).toBe("Then");
  });

  it("attaches tags and tickets as story options", ({ task }) => {
    story.init(task, { tags: ["smoke", "api"], ticket: "PROJ-42" });

    story.given("story.init called with tags and a ticket");
    story.when("the story metadata is inspected");
    const meta = getStoryMeta(task);

    story.then("tags are stored on the story");
    expect(meta.tags).toEqual(["smoke", "api"]);

    story.and("tickets are stored as an array");
    expect(meta.tickets).toEqual(["PROJ-42"]);
  });

  it("supports doc entries like note, json, and code", ({ task }) => {
    story.init(task);

    story.given("a story with documentation entries");
    story.note("This is additional context");
    story.json({ label: "Config", value: { debug: true } });
    story.code({ label: "Example", content: "console.log('hi')", lang: "ts" });

    story.when("the story metadata is inspected");
    const meta = getStoryMeta(task);

    story.then("doc entries are attached to the current step");
    const allDocs = meta.steps.flatMap((s) => s.docs ?? []);
    expect(allDocs.length).toBeGreaterThanOrEqual(3);
  });
});

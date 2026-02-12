/**
 * E2E edge case tests for the Cypress story API.
 * Mirrors Playwright edge-cases.test.ts: empty/minimal values, special characters, doc edge cases.
 */
import { story, getAndClearMeta } from "executable-stories-cypress";

const RECORD_TASK = "executableStories:recordMeta";
const GET_STORED_TASK = "executableStories:getStoredMeta";

function flushAndGetMeta() {
  const payload = getAndClearMeta();
  expect(payload).not.to.be.null;
  cy.task(RECORD_TASK, payload);
  return cy.task(GET_STORED_TASK, {
    specRelative: payload!.specRelative,
    titlePath: payload!.titlePath,
  });
}

describe("edge cases - empty and minimal values", () => {
  it("handles empty step text", () => {
    story.init();
    story.given("");
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as { steps: Array<{ text: string }> };
      expect(m.steps).to.have.length(1);
      expect(m.steps[0].text).to.equal("");
    });
  });

  it("handles whitespace-only step text", () => {
    story.init();
    story.given("   ");
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as { steps: Array<{ text: string }> };
      expect(m.steps).to.have.length(1);
      expect(m.steps[0].text).to.equal("   ");
    });
  });

  it("handles scenario with no steps", () => {
    story.init();
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as { steps: unknown[] };
      expect(m.steps).to.be.an("array").that.is.empty;
      expect(m.scenario).to.equal("handles scenario with no steps");
    });
  });

  it("handles empty tags array", () => {
    story.init({ tags: [] });
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { tags: unknown[] }).tags).to.deep.equal([]);
    });
  });

  it("handles empty ticket array", () => {
    story.init({ ticket: [] });
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { tickets: unknown[] }).tickets).to.deep.equal([]);
    });
  });

  it("handles empty meta object", () => {
    story.init({ meta: {} });
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { meta: Record<string, unknown> }).meta).to.deep.equal({});
    });
  });
});

describe("edge cases - special characters", () => {
  it("handles special characters in step text", () => {
    const text = "a value with <brackets> & ampersand 'quotes' \"double\" `backticks`";
    story.init();
    story.given(text);
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { steps: Array<{ text: string }> }).steps[0].text).to.equal(text);
    });
  });

  it("handles markdown in step text", () => {
    story.init();
    story.given("**bold** and _italic_ and [link](url)");
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { steps: Array<{ text: string }> }).steps[0].text).to.equal(
        "**bold** and _italic_ and [link](url)"
      );
    });
  });

  it("handles unicode characters", () => {
    story.init();
    story.given("emoji: 🎉 🚀 ✅");
    story.when("Chinese: 你好世界");
    story.then("Arabic: مرحبا بالعالم");
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as { steps: Array<{ text: string }> };
      expect(m.steps[0].text).to.include("🎉");
      expect(m.steps[1].text).to.include("你好");
      expect(m.steps[2].text).to.include("مرحبا");
    });
  });

  it("handles special characters in tags", () => {
    story.init({
      tags: ["tag-with-dash", "tag_with_underscore", "tag.with.dots"],
    });
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { tags: string[] }).tags).to.deep.equal([
        "tag-with-dash",
        "tag_with_underscore",
        "tag.with.dots",
      ]);
    });
  });
});

describe("edge cases - doc methods", () => {
  it("story.tag() with single string", () => {
    story.init();
    story.given("precondition");
    story.tag("single-tag");
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as {
        steps: Array<{ docs: Array<{ kind: string; names: string[]; phase: string }> }>;
      };
      expect(m.steps[0].docs).to.have.length(1);
      expect(m.steps[0].docs[0]).to.deep.include({
        kind: "tag",
        names: ["single-tag"],
        phase: "runtime",
      });
    });
  });

  it("story.tag() with array", () => {
    story.init();
    story.given("precondition");
    story.tag(["tag1", "tag2", "tag3"]);
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as {
        steps: Array<{ docs: Array<{ kind: string; names: string[]; phase: string }> }>;
      };
      expect(m.steps[0].docs[0]).to.deep.include({
        kind: "tag",
        names: ["tag1", "tag2", "tag3"],
        phase: "runtime",
      });
    });
  });

  it("story.code() without lang parameter", () => {
    story.init();
    story.given("code block");
    story.code({ label: "Script", content: "console.log('hello')" });
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as {
        steps: Array<{ docs: Array<{ kind: string; lang?: string }> }>;
      };
      expect(m.steps[0].docs[0].kind).to.equal("code");
      expect((m.steps[0].docs[0] as { lang?: string }).lang).to.be.undefined;
    });
  });

  it("story.screenshot() without alt", () => {
    story.init();
    story.given("screenshot");
    story.screenshot({ path: "/path/to/image.png" });
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as {
        steps: Array<{ docs: Array<{ kind: string; path: string; alt?: string }> }>;
      };
      expect(m.steps[0].docs[0].kind).to.equal("screenshot");
      expect(m.steps[0].docs[0].path).to.equal("/path/to/image.png");
      expect((m.steps[0].docs[0] as { alt?: string }).alt).to.be.undefined;
    });
  });
});

describe("edge cases - multiple docs", () => {
  it("multiple note() calls attach to same step", () => {
    story.init();
    story.given("precondition");
    story.note("First note");
    story.note("Second note");
    story.note("Third note");
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as { steps: Array<{ docs: Array<{ kind: string }> }> };
      expect(m.steps[0].docs).to.have.length(3);
      expect(m.steps[0].docs.every((d) => d.kind === "note")).to.be.true;
    });
  });
});

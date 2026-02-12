/**
 * E2E tests for the Cypress story API.
 * Mirrors Playwright story-api.test.ts: init options, step markers, aliases,
 * inline docs, standalone doc methods, suitePath. Each test flushes meta via
 * getAndClearMeta + recordMeta and asserts via getStoredMeta task.
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

describe("story.init()", () => {
  it("creates StoryMeta from test title", () => {
    story.init();
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as { scenario: string; steps: unknown[] };
      expect(m).to.be.an("object");
      expect(m.scenario).to.equal("creates StoryMeta from test title");
      expect(m.steps).to.be.an("array").that.is.empty;
    });
  });

  it("accepts options with tags", () => {
    story.init({ tags: ["admin", "security"] });
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { tags: string[] }).tags).to.deep.equal(["admin", "security"]);
    });
  });

  it("accepts options with single ticket", () => {
    story.init({ ticket: "JIRA-123" });
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { tickets: string[] }).tickets).to.deep.equal(["JIRA-123"]);
    });
  });

  it("accepts options with multiple tickets", () => {
    story.init({ ticket: ["JIRA-123", "JIRA-456"] });
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { tickets: string[] }).tickets).to.deep.equal(["JIRA-123", "JIRA-456"]);
    });
  });

  it("accepts options with meta", () => {
    story.init({ meta: { priority: "high", team: "platform" } });
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { meta: Record<string, string> }).meta).to.deep.equal({
        priority: "high",
        team: "platform",
      });
    });
  });
});

describe("story step markers", () => {
  it("adds Given step", () => {
    story.init();
    story.given("two numbers 5 and 3");
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as { steps: Array<{ keyword: string; text: string; docs: unknown[] }> };
      expect(m.steps).to.have.length(1);
      expect(m.steps[0]).to.deep.include({
        keyword: "Given",
        text: "two numbers 5 and 3",
      });
      expect(m.steps[0].docs).to.be.an("array").that.is.empty;
    });
  });

  it("adds When step", () => {
    story.init();
    story.when("I add them together");
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as { steps: Array<{ keyword: string; text: string }> };
      expect(m.steps).to.have.length(1);
      expect(m.steps[0].keyword).to.equal("When");
      expect(m.steps[0].text).to.equal("I add them together");
    });
  });

  it("adds Then step", () => {
    story.init();
    story.then("the result is 8");
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as { steps: Array<{ keyword: string; text: string }> };
      expect(m.steps).to.have.length(1);
      expect(m.steps[0].keyword).to.equal("Then");
      expect(m.steps[0].text).to.equal("the result is 8");
    });
  });

  it("adds And step", () => {
    story.init();
    story.and("another condition");
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { steps: Array<{ keyword: string }> }).steps[0].keyword).to.equal("And");
    });
  });

  it("adds But step", () => {
    story.init();
    story.but("not this condition");
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { steps: Array<{ keyword: string }> }).steps[0].keyword).to.equal("But");
    });
  });

  it("builds full Given/When/Then sequence", () => {
    story.init();
    story.given("two numbers 5 and 3");
    story.when("I add them together");
    story.then("the result is 8");
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as {
        steps: Array<{ keyword: string; text: string }>;
      };
      expect(m.steps).to.have.length(3);
      expect(m.steps.map((s) => s.keyword)).to.deep.equal(["Given", "When", "Then"]);
      expect(m.steps.map((s) => s.text)).to.deep.equal([
        "two numbers 5 and 3",
        "I add them together",
        "the result is 8",
      ]);
    });
  });
});

describe("story step aliases", () => {
  it("arrange is alias for Given", () => {
    story.init();
    story.arrange("setup state");
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { steps: Array<{ keyword: string }> }).steps[0].keyword).to.equal("Given");
    });
  });

  it("act is alias for When", () => {
    story.init();
    story.act("perform action");
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { steps: Array<{ keyword: string }> }).steps[0].keyword).to.equal("When");
    });
  });

  it("assert is alias for Then", () => {
    story.init();
    story.assert("verify result");
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { steps: Array<{ keyword: string }> }).steps[0].keyword).to.equal("Then");
    });
  });

  it("setup/context are aliases for Given", () => {
    story.init();
    story.setup("initial state");
    story.context("additional context");
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as { steps: Array<{ keyword: string }> };
      expect(m.steps[0].keyword).to.equal("Given");
      expect(m.steps[1].keyword).to.equal("Given");
    });
  });

  it("execute/action are aliases for When", () => {
    story.init();
    story.execute("run operation");
    story.action("perform action");
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as { steps: Array<{ keyword: string }> };
      expect(m.steps[0].keyword).to.equal("When");
      expect(m.steps[1].keyword).to.equal("When");
    });
  });

  it("verify is alias for Then", () => {
    story.init();
    story.verify("check outcome");
    flushAndGetMeta().then((meta: unknown) => {
      expect((meta as { steps: Array<{ keyword: string }> }).steps[0].keyword).to.equal("Then");
    });
  });
});

describe("step with inline docs", () => {
  it("adds json inline doc", () => {
    story.init();
    story.given("valid credentials", {
      json: { label: "Credentials", value: { email: "test@example.com", password: "***" } },
    });
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as {
        steps: Array<{
          docs: Array<{ kind: string; label: string; lang: string; content: string }>;
        }>;
      };
      expect(m.steps[0].docs).to.have.length(1);
      expect(m.steps[0].docs[0].kind).to.equal("code");
      expect(m.steps[0].docs[0].label).to.equal("Credentials");
      expect(m.steps[0].docs[0].lang).to.equal("json");
      expect(JSON.parse(m.steps[0].docs[0].content)).to.deep.equal({
        email: "test@example.com",
        password: "***",
      });
    });
  });

  it("adds note inline doc", () => {
    story.init();
    story.then("user is authenticated", { note: "Session cookie is set" });
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as {
        steps: Array<{
          docs: Array<{ kind: string; text: string; phase: string }>;
        }>;
      };
      expect(m.steps[0].docs).to.have.length(1);
      expect(m.steps[0].docs[0]).to.deep.include({
        kind: "note",
        text: "Session cookie is set",
        phase: "runtime",
      });
    });
  });

  it("adds link inline doc", () => {
    story.init();
    story.given("API endpoint", {
      link: { label: "API Docs", url: "https://docs.example.com" },
    });
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as {
        steps: Array<{
          docs: Array<{ kind: string; label: string; url: string; phase: string }>;
        }>;
      };
      expect(m.steps[0].docs[0]).to.deep.include({
        kind: "link",
        label: "API Docs",
        url: "https://docs.example.com",
        phase: "runtime",
      });
    });
  });
});

describe("standalone doc methods", () => {
  it("story.note() after step attaches to step", () => {
    story.init();
    story.given("precondition");
    story.note("This is important");
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as { steps: Array<{ docs: unknown[] }> };
      expect(m.steps[0].docs).to.have.length(1);
      expect((m.steps[0].docs[0] as { kind: string }).kind).to.equal("note");
    });
  });

  it("story.note() before steps attaches to story-level", () => {
    story.init();
    story.note("This test requires a running database");
    story.given("database is seeded");
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as { docs: unknown[]; steps: Array<{ docs: unknown[] }> };
      expect(m.docs).to.have.length(1);
      expect((m.docs[0] as { kind: string; text: string }).kind).to.equal("note");
      expect((m.docs[0] as { kind: string; text: string }).text).to.equal(
        "This test requires a running database"
      );
      expect(m.steps[0].docs).to.have.length(0);
    });
  });

  it("story.kv() attaches to current step", () => {
    story.init();
    story.when("payment is processed");
    story.kv({ label: "Payment ID", value: "pay_abc123" });
    story.kv({ label: "Amount", value: "$99.99" });
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as { steps: Array<{ docs: Array<{ kind: string }> }> };
      expect(m.steps[0].docs).to.have.length(2);
      expect(m.steps[0].docs.every((d) => d.kind === "kv")).to.be.true;
    });
  });

  it("story.tag() attaches to current step", () => {
    story.init();
    story.given("admin user");
    story.tag(["admin", "elevated"]);
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as {
        steps: Array<{ docs: Array<{ kind: string; names: string[]; phase: string }> }>;
      };
      expect(m.steps[0].docs[0]).to.deep.include({
        kind: "tag",
        names: ["admin", "elevated"],
        phase: "runtime",
      });
    });
  });

  it("story.section() attaches to current step", () => {
    story.init();
    story.given("complex setup");
    story.section({ title: "Details", markdown: "This is **markdown** content" });
    flushAndGetMeta().then((meta: unknown) => {
      const m = meta as {
        steps: Array<{
          docs: Array<{ kind: string; title: string; markdown: string; phase: string }>;
        }>;
      };
      expect(m.steps[0].docs[0]).to.deep.include({
        kind: "section",
        title: "Details",
        markdown: "This is **markdown** content",
        phase: "runtime",
      });
    });
  });
});

describe("nested describe - suitePath", () => {
  describe("Calculator", () => {
    describe("Basic Operations", () => {
      it("extracts suitePath from nested describes", () => {
        story.init();
        story.given("two numbers");
        story.when("added");
        story.then("result is correct");
        flushAndGetMeta().then((meta: unknown) => {
          const m = meta as { scenario: string; suitePath?: string[] };
          expect(m.scenario).to.equal("extracts suitePath from nested describes");
          expect(m.suitePath).to.be.an("array");
          expect(m.suitePath).to.include("Calculator");
          expect(m.suitePath).to.include("Basic Operations");
        });
      });
    });
  });
});

/**
 * Story options: story.init({ tags, ticket, meta })
 */
import { story } from "executable-stories-cypress";

describe("Story options", () => {
  it("Story with single tag", () => {
    story.init({ tags: ["smoke"] });
    story.note("Single tag for basic categorization");
    story.given("a tagged story");
    story.when("tests are filtered");
    story.then("this story matches the 'smoke' tag");
    expect(true).to.be.true;
  });

  it("Story with multiple tags", () => {
    story.init({ tags: ["smoke", "regression", "critical"] });
    story.note("Multiple tags for flexible filtering");
    story.given("a story with multiple tags");
    story.when("tests are filtered by any tag");
    story.then("this story matches multiple filters");
    expect(true).to.be.true;
  });

  it("Story with single ticket", () => {
    story.init({ ticket: "JIRA-123" });
    story.note("Links story to a single issue tracker ticket");
    story.given("a story linked to JIRA-123");
    story.when("documentation is generated");
    story.then("ticket reference appears in docs");
    expect(true).to.be.true;
  });

  it("Story with multiple tickets", () => {
    story.init({ ticket: ["JIRA-123", "JIRA-456", "JIRA-789"] });
    story.note("Story can be linked to multiple tickets");
    story.given("a story linked to multiple tickets");
    story.when("requirements are tracked");
    story.then("all ticket references are documented");
    expect(true).to.be.true;
  });

  it("Story with simple metadata", () => {
    story.init({
      meta: {
        priority: "high",
        owner: "team-backend",
      },
    });
    story.note("Custom metadata attached to story");
    story.given("a story with custom metadata");
    story.then("metadata is available in reports");
    expect(true).to.be.true;
  });

  it("Story with all options combined", () => {
    story.init({
      tags: ["smoke", "critical", "feature:checkout"],
      ticket: "PROJ-456",
      meta: {
        priority: "high",
        owner: "team-checkout",
        sprint: 15,
        complexity: "medium",
      },
    });
    story.note("All story options used together");
    story.given("a fully configured story");
    story.when("documentation is generated");
    story.then("all options appear in output");
    expect(true).to.be.true;
  });

  it("Login feature - happy path", () => {
    story.init({
      tags: ["smoke", "auth", "login"],
      ticket: "AUTH-001",
      meta: { priority: "critical", automationStatus: "complete" },
    });
    story.given("user is on login page");
    story.when("user enters valid credentials");
    story.then("user is logged in successfully");
    expect(true).to.be.true;
  });
});

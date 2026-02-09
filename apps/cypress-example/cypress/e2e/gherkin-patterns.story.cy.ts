/**
 * Gherkin-style patterns: multiple Given/When/Then (auto And), But keyword
 */
import { story } from "executable-stories-cypress";

describe("Gherkin patterns", () => {
  it("User logs in successfully", () => {
    story.init();
    story.given("the user account exists");
    story.given("the user is on the login page");
    story.given("the account is active");
    story.when("the user submits valid credentials");
    story.then("the user should see the dashboard");
    expect(true).to.be.true;
  });

  it("User updates profile settings", () => {
    story.init();
    story.given("the user is logged in");
    story.when("the user navigates to settings");
    story.when("the user changes their display name");
    story.then("the changes should be saved");
    expect(true).to.be.true;
  });

  it("Successful order confirmation", () => {
    story.init();
    story.given("the user has items in cart");
    story.when("the user completes checkout");
    story.then("the order should be created");
    story.then("a confirmation email should be sent");
    story.then("the inventory should be updated");
    expect(true).to.be.true;
  });

  it("Login blocked for suspended user", () => {
    story.init();
    story.given("the user account exists");
    story.given("the account is suspended");
    story.when("the user submits valid credentials");
    story.then("the user should see an error message");
    story.but("the user should not be logged in");
    story.but("the session should not be created");
    expect(true).to.be.true;
  });

  it("Bulk user creation with table", () => {
    story.init();
    story.given("the following users exist");
    story.table({
      label: "Users",
      columns: ["email", "role", "status"],
      rows: [
        ["alice@example.com", "admin", "active"],
        ["bob@example.com", "user", "active"],
        ["charlie@example.com", "viewer", "pending"],
      ],
    });
    story.when("admin imports the list");
    story.then("all users are created");
    expect(true).to.be.true;
  });
});

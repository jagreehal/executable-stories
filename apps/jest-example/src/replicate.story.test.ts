/**
 * Replicates the 30 scenarios from ___temp/replicate.txt using executable-stories.
 * Step text and scenario titles match the source; steps are no-op or minimal so tests pass.
 */
import { describe } from "@jest/globals";
import { story, given, when, then, and, but, doc } from "jest-executable-stories";

// 1) Multiple Given, single When, single Then
story("User logs in successfully", () => {
  given("the user account exists");
  given("the user is on the login page");
  given("the account is active");
  when("the user submits valid credentials");
  then("the user should see the dashboard");
});

// 2) Single Given, multiple When, single Then
story("User updates profile details", () => {
  given("the user is logged in");
  when("the user changes their display name");
  when("the user changes their time zone");
  when("the user saves the profile");
  then("the profile should show the updated details");
});

// 3) Single Given, single When, multiple Then
story("Checkout calculates totals", () => {
  given("the cart has 2 items");
  when("the user proceeds to checkout");
  then("the subtotal should be $40.00");
  then("the tax should be $4.00");
  then("the total should be $44.00");
});

// 4) Multiple Given, multiple When, multiple Then
story("Password reset flow", () => {
  given("the user account exists");
  given("the user has a verified email");
  when("the user requests a password reset");
  when("the user opens the reset email link");
  when("the user sets a new password");
  then("the user should be able to log in with the new password");
  then("the old password should no longer work");
});

// 5) Use of But
story("Login blocked for suspended user", () => {
  given("the user account exists");
  given("the account is suspended");
  when("the user submits valid credentials");
  then("the user should see an error message");
  but("the user should not be logged in");
});

// 6) DataTable for Given setup
story("Bulk user creation", () => {
  given("the following users exist");
  doc.table("Users", ["email", "role", "status"], [
    ["alice@example.com", "admin", "active"],
    ["bob@example.com", "user", "active"],
    ["eve@example.com", "user", "locked"],
  ]);
  when("the admin opens the user list");
  then("the user list should include");
  doc.table("Expected", ["email", "role", "status"], [
    ["alice@example.com", "admin", "active"],
    ["bob@example.com", "user", "active"],
    ["eve@example.com", "user", "locked"],
  ]);
});

// 7) DataTable for input, multiple Then
story("Calculate shipping options", () => {
  given("the user has entered the shipping address");
  doc.table("Address", ["country", "state", "zip"], [["US", "CA", "94107"]]);
  when("shipping options are calculated");
  then('the available options should include "Standard"');
  then('the available options should include "Express"');
  then("the estimated delivery date should be shown");
});

// 8) DocString (JSON)
story("API accepts a JSON payload", () => {
  given("the client has the following JSON payload");
  doc.json("Payload", {
    email: "user@example.com",
    password: "secret",
    rememberMe: true,
  });
  when("the client sends the request");
  then("the response status should be 200");
  then('the response body should include "token"');
});

// 9) DocString (XML)
story("Import XML invoice", () => {
  given("the invoice XML is");
  doc.code(
    "Invoice",
    `<invoice>
  <id>INV-100</id>
  <amount>42.50</amount>
  <currency>USD</currency>
</invoice>`,
    "xml"
  );
  when("the user imports the invoice");
  then("the invoice should be saved");
  then("the invoice total should be 42.50 USD");
});

// 10) Background for shared preconditions
describe("Feature: Account settings", () => {
  /* eslint-disable jest-executable-stories/require-story-context-for-steps -- helper only called from inside story() */
  const background = () => {
    given("the user account exists");
    given("the user is logged in");
  };
  /* eslint-enable jest-executable-stories/require-story-context-for-steps */

  story("Change email address", () => {
    background();
    when('the user updates their email to "new@example.com"');
    then("a verification email should be sent");
    then('the email status should be "pending verification"');
  });

  story("Change password", () => {
    background();
    when("the user changes their password");
    then("the user should be able to log in with the new password");
  });
});

// 11) Rule blocks
describe("Feature: Discounts", () => {
  describe("Rule: Discounts apply only to eligible customers", () => {
    story("Eligible customer gets discount", () => {
      given("the customer is eligible for discounts");
      when("the customer checks out");
      then("a discount should be applied");
    });

    story("Ineligible customer does not get discount", () => {
      given("the customer is not eligible for discounts");
      when("the customer checks out");
      then("no discount should be applied");
    });
  });
});

// 12) Scenario Outline: Login errors
const loginErrorExamples = [
  { email: "user@example.com", password: "wrong", message: "Invalid credentials" },
  { email: "locked@example.com", password: "secret", message: "Account is locked" },
  { email: "unknown@example.com", password: "secret", message: "Invalid credentials" },
];
for (const row of loginErrorExamples) {
  story(`Login errors: ${row.message}`, () => {
    given("the user is on the login page");
    when(`the user logs in with "${row.email}" and "${row.password}"`);
    then(`the error message should be "${row.message}"`);
  });
}

// 13) Scenario Outline: Tax calculation by region
const taxExamples = [
  { subtotal: "100.00", region: "CA", tax: "8.25", total: "108.25" },
  { subtotal: "100.00", region: "NY", tax: "8.00", total: "108.00" },
];
for (const row of taxExamples) {
  story(`Tax calculation by region: ${row.region}`, () => {
    given(`the cart subtotal is ${row.subtotal}`);
    given(`the shipping region is "${row.region}"`);
    when("taxes are calculated");
    then(`the tax should be ${row.tax}`);
    then(`the total should be ${row.total}`);
  });
}

// 14) Scenario Outline: Create users from table input
const createUserExamples = [
  { email: "a@example.com", role: "user" },
  { email: "admin@example.com", role: "admin" },
];
for (const row of createUserExamples) {
  story(`Create users from table input: ${row.email}`, () => {
    given("the admin is on the create user page");
    when("the admin submits the following user details");
    doc.table("Details", ["email", "role"], [[row.email, row.role]]);
    then(`the user "${row.email}" should exist with role "${row.role}"`);
  });
}

// 15) Multiple When groups (phases)
story("Two step checkout", () => {
  given("the user has items in the cart");
  when("the user enters shipping information");
  when("the user selects a delivery option");
  when("the user enters payment information");
  when("the user confirms the order");
  then("the order should be created");
  then("a confirmation email should be sent");
});

// 16) Negative path with Then and But
story("Payment declined", () => {
  given("the user is on the checkout page");
  when("the user submits a declined card");
  then("the payment should be declined");
  then('the user should see "Payment failed"');
  but("the order should not be created");
});

// 17) Use of tags
story("Login works", { tags: ["smoke", "auth"] }, () => {
  given("the user is on the login page");
  when("the user logs in with valid credentials");
  then("the user should be logged in");
});

// 18) DataTable as key-value pairs
story("Update preferences", () => {
  given("the user has the following preferences");
  doc.table("Preferences", ["key", "value"], [
    ["email_opt_in", "true"],
    ["theme", "dark"],
    ["timezone", "UTC"],
  ]);
  when("the user saves preferences");
  then("the preferences should be persisted");
});

// 19) Complex DataTable
story("Configure feature flags", () => {
  given("the following feature flags are set");
  doc.table("Feature flags", ["service", "flag", "enabled"], [
    ["web", "new_checkout_ui", "true"],
    ["api", "strict_rate_limiting", "false"],
  ]);
  when("the system starts");
  then('the flag "new_checkout_ui" should be enabled for "web"');
  then('the flag "strict_rate_limiting" should be disabled for "api"');
});

// 20) But in Given (replicate as given + doc.note for "But guest checkout is enabled")
story("Guest checkout allowed", () => {
  given("the user is on the checkout page");
  given("the user is not logged in");
  doc.note("But guest checkout is enabled");
  when("the user submits an order as a guest");
  then("the order should be created");
});

// 21) Repeated Then steps
story("Logout clears session", () => {
  given("the user is logged in");
  when("the user logs out");
  then("the session cookie should be cleared");
  then("the auth token should be revoked");
  then("the user should be redirected to the login page");
});

// 22) Explicit state transition
story("Document status changes", () => {
  given('a document exists with status "draft"');
  when("the user submits the document");
  then('the document status should change to "submitted"');
  then("an audit log entry should be created");
});

// 23) Scenario Outline: Shipping eligibility
const shippingEligibilityExamples = [
  { total: "10", country: "US", eligible: "yes" },
  { total: "10", country: "CA", eligible: "yes" },
  { total: "10", country: "CU", eligible: "no" },
];
for (const row of shippingEligibilityExamples) {
  story(`Shipping eligibility: ${row.country} -> ${row.eligible}`, () => {
    given(`the cart total is ${row.total}`);
    given(`the destination country is "${row.country}"`);
    when("shipping eligibility is checked");
    then(`shipping should be "${row.eligible}"`);
  });
}

// 24) DocString for Markdown
story("Render markdown", () => {
  given("the markdown input is");
  doc.code("Markdown", `# Title
- Item 1
- Item 2`, "markdown");
  when("the user previews the markdown");
  then('the preview should show a heading "Title"');
  then("the preview should show a list with 2 items");
});

// 25) And after Then
story("Search results show highlights", () => {
  given('the search index contains "hello world"');
  when('the user searches for "hello"');
  then('results should include "hello world"');
  and("the matching text should be highlighted");
});

// 26) Scenario Outline: Post JSON payload
const postPayloadExamples = [
  { id: "123", status: "active", code: "200" },
  { id: "456", status: "invalid", code: "400" },
];
for (const row of postPayloadExamples) {
  story(`Post JSON payload: ${row.id} -> ${row.code}`, () => {
    given("the payload is");
    doc.json("Payload", { id: row.id, status: row.status });
    when("the client posts the payload");
    then(`the response status should be ${row.code}`);
  });
}

// 27) Background + tags
describe("Feature: Orders", () => {
  story("Create order", { tags: ["db", "smoke"] }, () => {
    given("the database is seeded");
    given("the API is running");
    when("the client creates an order");
    then("the response status should be 201");
    then("the order should exist in the database");
  });
});

// 28) Scenario Outline: Many login attempts
const manyLoginExamples = [
  { email: "u1@example.com", password: "secret", result: "success" },
  { email: "u2@example.com", password: "wrong", result: "fail" },
  { email: "u3@example.com", password: "secret", result: "success" },
  { email: "u4@example.com", password: "wrong", result: "fail" },
];
for (const row of manyLoginExamples) {
  story(`Many login attempts: ${row.email} -> ${row.result}`, () => {
    given("the user is on the login page");
    when(`the user logs in with "${row.email}" and "${row.password}"`);
    then(`the login result should be "${row.result}"`);
  });
}

// 29) And in middle of Then
story("Report shows fields in order", () => {
  given('a report exists for account "A1"');
  when("the user downloads the report");
  then('the report header should be "Account Report"');
  and('the first column should be "Date"');
  and('the second column should be "Amount"');
});

// 30) DataTable + DocString
story("Import users and send welcome email", () => {
  given("the following users are to be imported");
  doc.table("Users", ["email", "name"], [
    ["a@example.com", "Alice"],
    ["b@example.com", "Bob"],
  ]);
  and("the email template is");
  doc.code("Template", `Welcome {{name}}!
Thanks for joining.`);
  when("the import job runs");
  then("the users should exist");
  then("welcome emails should be sent");
});

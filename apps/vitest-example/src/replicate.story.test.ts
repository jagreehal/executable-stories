/**
 * Replicates the 30 scenarios from ___temp/replicate.txt using executable-stories.
 * Step text and scenario titles match the source; steps are no-op or minimal so tests pass.
 */
import { describe } from "vitest";
import { story, type StepsApi } from "vitest-executable-stories";

// 1) Multiple Given, single When, single Then
story("User logs in successfully", (s: StepsApi) => {
  s.given("the user account exists");
  s.given("the user is on the login page");
  s.given("the account is active");
  s.when("the user submits valid credentials");
  s.then("the user should see the dashboard");
});

// 2) Single Given, multiple When, single Then
story("User updates profile details", (s: StepsApi) => {
  s.given("the user is logged in");
  s.when("the user changes their display name");
  s.when("the user changes their time zone");
  s.when("the user saves the profile");
  s.then("the profile should show the updated details");
});

// 3) Single Given, single When, multiple Then
story("Checkout calculates totals", (s: StepsApi) => {
  s.given("the cart has 2 items");
  s.when("the user proceeds to checkout");
  s.then("the subtotal should be $40.00");
  s.then("the tax should be $4.00");
  s.then("the total should be $44.00");
});

// 4) Multiple Given, multiple When, multiple Then
story("Password reset flow", (s: StepsApi) => {
  s.given("the user account exists");
  s.given("the user has a verified email");
  s.when("the user requests a password reset");
  s.when("the user opens the reset email link");
  s.when("the user sets a new password");
  s.then("the user should be able to log in with the new password");
  s.then("the old password should no longer work");
});

// 5) Use of But
story("Login blocked for suspended user", (s: StepsApi) => {
  s.given("the user account exists");
  s.given("the account is suspended");
  s.when("the user submits valid credentials");
  s.then("the user should see an error message");
  s.but("the user should not be logged in");
});

// 6) DataTable for Given setup
story("Bulk user creation", (s: StepsApi) => {
  s.given("the following users exist");
  s.doc.table("Users", ["email", "role", "status"], [
    ["alice@example.com", "admin", "active"],
    ["bob@example.com", "user", "active"],
    ["eve@example.com", "user", "locked"],
  ]);
  s.when("the admin opens the user list");
  s.then("the user list should include");
  s.doc.table("Expected", ["email", "role", "status"], [
    ["alice@example.com", "admin", "active"],
    ["bob@example.com", "user", "active"],
    ["eve@example.com", "user", "locked"],
  ]);
});

// 7) DataTable for input, multiple Then
story("Calculate shipping options", (s: StepsApi) => {
  s.given("the user has entered the shipping address");
  s.doc.table("Address", ["country", "state", "zip"], [["US", "CA", "94107"]]);
  s.when("shipping options are calculated");
  s.then('the available options should include "Standard"');
  s.then('the available options should include "Express"');
  s.then("the estimated delivery date should be shown");
});

// 8) DocString (JSON)
story("API accepts a JSON payload", (s: StepsApi) => {
  s.given("the client has the following JSON payload");
  s.doc.json("Payload", {
    email: "user@example.com",
    password: "secret",
    rememberMe: true,
  });
  s.when("the client sends the request");
  s.then("the response status should be 200");
  s.then('the response body should include "token"');
});

// 9) DocString (XML)
story("Import XML invoice", (s: StepsApi) => {
  s.given("the invoice XML is");
  s.doc.code(
    "Invoice",
    `<invoice>
  <id>INV-100</id>
  <amount>42.50</amount>
  <currency>USD</currency>
</invoice>`,
    "xml"
  );
  s.when("the user imports the invoice");
  s.then("the invoice should be saved");
  s.then("the invoice total should be 42.50 USD");
});

// 10) Background for shared preconditions
describe("Feature: Account settings", () => {
  const background = (s: StepsApi) => {
    s.given("the user account exists");
    s.given("the user is logged in");
  };

  story("Change email address", (s: StepsApi) => {
    background(s);
    s.when('the user updates their email to "new@example.com"');
    s.then("a verification email should be sent");
    s.then('the email status should be "pending verification"');
  });

  story("Change password", (s: StepsApi) => {
    background(s);
    s.when("the user changes their password");
    s.then("the user should be able to log in with the new password");
  });
});

// 11) Rule blocks
describe("Feature: Discounts", () => {
  describe("Rule: Discounts apply only to eligible customers", () => {
    story("Eligible customer gets discount", (s: StepsApi) => {
      s.given("the customer is eligible for discounts");
      s.when("the customer checks out");
      s.then("a discount should be applied");
    });

    story("Ineligible customer does not get discount", (s: StepsApi) => {
      s.given("the customer is not eligible for discounts");
      s.when("the customer checks out");
      s.then("no discount should be applied");
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
  story(`Login errors: ${row.message}`, (s: StepsApi) => {
    s.given("the user is on the login page");
    s.when(`the user logs in with "${row.email}" and "${row.password}"`);
    s.then(`the error message should be "${row.message}"`);
  });
}

// 13) Scenario Outline: Tax calculation by region
const taxExamples = [
  { subtotal: "100.00", region: "CA", tax: "8.25", total: "108.25" },
  { subtotal: "100.00", region: "NY", tax: "8.00", total: "108.00" },
];
for (const row of taxExamples) {
  story(`Tax calculation by region: ${row.region}`, (s: StepsApi) => {
    s.given(`the cart subtotal is ${row.subtotal}`);
    s.given(`the shipping region is "${row.region}"`);
    s.when("taxes are calculated");
    s.then(`the tax should be ${row.tax}`);
    s.then(`the total should be ${row.total}`);
  });
}

// 14) Scenario Outline: Create users from table input
const createUserExamples = [
  { email: "a@example.com", role: "user" },
  { email: "admin@example.com", role: "admin" },
];
for (const row of createUserExamples) {
  story(`Create users from table input: ${row.email}`, (s: StepsApi) => {
    s.given("the admin is on the create user page");
    s.when("the admin submits the following user details");
    s.doc.table("Details", ["email", "role"], [[row.email, row.role]]);
    s.then(`the user "${row.email}" should exist with role "${row.role}"`);
  });
}

// 15) Multiple When groups (phases)
story("Two step checkout", (s: StepsApi) => {
  s.given("the user has items in the cart");
  s.when("the user enters shipping information");
  s.when("the user selects a delivery option");
  s.when("the user enters payment information");
  s.when("the user confirms the order");
  s.then("the order should be created");
  s.then("a confirmation email should be sent");
});

// 16) Negative path with Then and But
story("Payment declined", (s: StepsApi) => {
  s.given("the user is on the checkout page");
  s.when("the user submits a declined card");
  s.then("the payment should be declined");
  s.then('the user should see "Payment failed"');
  s.but("the order should not be created");
});

// 17) Use of tags
story("Login works", { tags: ["smoke", "auth"] }, (s: StepsApi) => {
  s.given("the user is on the login page");
  s.when("the user logs in with valid credentials");
  s.then("the user should be logged in");
});

// 18) DataTable as key-value pairs
story("Update preferences", (s: StepsApi) => {
  s.given("the user has the following preferences");
  s.doc.table("Preferences", ["key", "value"], [
    ["email_opt_in", "true"],
    ["theme", "dark"],
    ["timezone", "UTC"],
  ]);
  s.when("the user saves preferences");
  s.then("the preferences should be persisted");
});

// 19) Complex DataTable
story("Configure feature flags", (s: StepsApi) => {
  s.given("the following feature flags are set");
  s.doc.table("Feature flags", ["service", "flag", "enabled"], [
    ["web", "new_checkout_ui", "true"],
    ["api", "strict_rate_limiting", "false"],
  ]);
  s.when("the system starts");
  s.then('the flag "new_checkout_ui" should be enabled for "web"');
  s.then('the flag "strict_rate_limiting" should be disabled for "api"');
});

// 20) But in Given (replicate as given + doc.note)
story("Guest checkout allowed", (s: StepsApi) => {
  s.given("the user is on the checkout page");
  s.given("the user is not logged in");
  s.doc.note("But guest checkout is enabled");
  s.when("the user submits an order as a guest");
  s.then("the order should be created");
});

// 21) Repeated Then steps
story("Logout clears session", (s: StepsApi) => {
  s.given("the user is logged in");
  s.when("the user logs out");
  s.then("the session cookie should be cleared");
  s.then("the auth token should be revoked");
  s.then("the user should be redirected to the login page");
});

// 22) Explicit state transition
story("Document status changes", (s: StepsApi) => {
  s.given('a document exists with status "draft"');
  s.when("the user submits the document");
  s.then('the document status should change to "submitted"');
  s.then("an audit log entry should be created");
});

// 23) Scenario Outline: Shipping eligibility
const shippingEligibilityExamples = [
  { total: "10", country: "US", eligible: "yes" },
  { total: "10", country: "CA", eligible: "yes" },
  { total: "10", country: "CU", eligible: "no" },
];
for (const row of shippingEligibilityExamples) {
  story(`Shipping eligibility: ${row.country} -> ${row.eligible}`, (s: StepsApi) => {
    s.given(`the cart total is ${row.total}`);
    s.given(`the destination country is "${row.country}"`);
    s.when("shipping eligibility is checked");
    s.then(`shipping should be "${row.eligible}"`);
  });
}

// 24) DocString for Markdown
story("Render markdown", (s: StepsApi) => {
  s.given("the markdown input is");
  s.doc.code("Markdown", `# Title
- Item 1
- Item 2`, "markdown");
  s.when("the user previews the markdown");
  s.then('the preview should show a heading "Title"');
  s.then("the preview should show a list with 2 items");
});

// 25) And after Then
story("Search results show highlights", (s: StepsApi) => {
  s.given('the search index contains "hello world"');
  s.when('the user searches for "hello"');
  s.then('results should include "hello world"');
  s.and("the matching text should be highlighted");
});

// 26) Scenario Outline: Post JSON payload
const postPayloadExamples = [
  { id: "123", status: "active", code: "200" },
  { id: "456", status: "invalid", code: "400" },
];
for (const row of postPayloadExamples) {
  story(`Post JSON payload: ${row.id} -> ${row.code}`, (s: StepsApi) => {
    s.given("the payload is");
    s.doc.json("Payload", { id: row.id, status: row.status });
    s.when("the client posts the payload");
    s.then(`the response status should be ${row.code}`);
  });
}

// 27) Background + tags
describe("Feature: Orders", () => {
  story("Create order", { tags: ["db", "smoke"] }, (s: StepsApi) => {
    s.given("the database is seeded");
    s.given("the API is running");
    s.when("the client creates an order");
    s.then("the response status should be 201");
    s.then("the order should exist in the database");
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
  story(`Many login attempts: ${row.email} -> ${row.result}`, (s: StepsApi) => {
    s.given("the user is on the login page");
    s.when(`the user logs in with "${row.email}" and "${row.password}"`);
    s.then(`the login result should be "${row.result}"`);
  });
}

// 29) And in middle of Then
story("Report shows fields in order", (s: StepsApi) => {
  s.given('a report exists for account "A1"');
  s.when("the user downloads the report");
  s.then('the report header should be "Account Report"');
  s.and('the first column should be "Date"');
  s.and('the second column should be "Amount"');
});

// 30) DataTable + DocString
story("Import users and send welcome email", (s: StepsApi) => {
  s.given("the following users are to be imported");
  s.doc.table("Users", ["email", "name"], [
    ["a@example.com", "Alice"],
    ["b@example.com", "Bob"],
  ]);
  s.and("the email template is");
  s.doc.code("Template", `Welcome {{name}}!
Thanks for joining.`);
  s.when("the import job runs");
  s.then("the users should exist");
  s.then("welcome emails should be sent");
});

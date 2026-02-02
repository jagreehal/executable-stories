/**
 * Gherkin Pattern Examples for Vitest
 *
 * This file demonstrates how to achieve all common Gherkin patterns
 * using vitest-executable-stories. Each pattern shows the executable-stories
 * equivalent of standard Gherkin syntax.
 *
 * Vitest uses callback style: (s) => { s.given(); s.but(); }
 */
import { describe } from "vitest";
import { story, type StepsApi } from "vitest-executable-stories";

// =============================================================================
// Pattern 1: Multiple Given (auto-converts to "And")
// Gherkin: Given X / And Y / And Z
// =============================================================================
story("User logs in successfully", ({ given, when, then }: StepsApi) => {
  given("the user account exists");
  given("the user is on the login page"); // Renders as "And"
  given("the account is active"); // Renders as "And"

  when("the user submits valid credentials");

  then("the user should see the dashboard");
});

// =============================================================================
// Pattern 2: Multiple When (auto-converts to "And")
// Gherkin: When X / And Y
// =============================================================================
story("User updates profile settings", ({ given, when, then }: StepsApi) => {
  given("the user is logged in");

  when("the user navigates to settings");
  when("the user changes their display name"); // Renders as "And"

  then("the changes should be saved");
});

// =============================================================================
// Pattern 3: Multiple Then (auto-converts to "And")
// Gherkin: Then X / And Y / And Z
// =============================================================================
story("Successful order confirmation", ({ given, when, then }: StepsApi) => {
  given("the user has items in cart");

  when("the user completes checkout");

  then("the order should be created");
  then("a confirmation email should be sent"); // Renders as "And"
  then("the inventory should be updated"); // Renders as "And"
});

// =============================================================================
// Pattern 4: Mixed Given/When/Then with multiple of each
// =============================================================================
story("Complex user journey", ({ given, when, then }: StepsApi) => {
  given("the user account exists");
  given("the user has admin privileges"); // Renders as "And"

  when("the user logs in");
  when("the user navigates to admin panel"); // Renders as "And"

  then("the admin dashboard should load");
  then("the user count should be displayed"); // Renders as "And"
});

// =============================================================================
// Pattern 5: Use of "But" keyword
// Gherkin: Then X / But Y
// But always renders as "But" (never auto-converts to "And")
// =============================================================================
story("Login blocked for suspended user", ({ given, when, then, but }: StepsApi) => {
  given("the user account exists");
  given("the account is suspended");

  when("the user submits valid credentials");

  then("the user should see an error message");
  but("the user should not be logged in"); // Always "But"
  but("the session should not be created"); // Still "But"
});

// =============================================================================
// Pattern 6: DataTable with Given
// Gherkin: Given the following users exist: | email | role |
// =============================================================================
story("Bulk user creation", ({ given, when, then, doc }: StepsApi) => {
  given("the following users exist");
  doc.table("Users", ["email", "role", "status"], [
    ["alice@example.com", "admin", "active"],
    ["bob@example.com", "user", "active"],
    ["carol@example.com", "user", "pending"],
  ]);

  when("the admin opens the user list");

  then("the user list should include all users");
});

// =============================================================================
// Pattern 7: DataTable with When
// Gherkin: When the user fills in the form: | field | value |
// =============================================================================
story("Form submission with multiple fields", ({ given, when, then, doc }: StepsApi) => {
  given("the user is on the registration form");

  when("the user fills in the form");
  doc.table("Form Data", ["field", "value"], [
    ["name", "John Doe"],
    ["email", "john@example.com"],
    ["password", "securepass123"],
  ]);

  then("the form should be submitted successfully");
});

// =============================================================================
// Pattern 8: DocString (JSON payload)
// Gherkin: Given the client has the following JSON payload: """json { ... } """
// =============================================================================
story("API accepts a JSON payload", ({ given, when, then, doc }: StepsApi) => {
  given("the client has the following JSON payload");
  doc.json("Payload", {
    email: "user@example.com",
    password: "secret",
    rememberMe: true,
  });

  when("the client sends the request");

  then("the response status should be 200");
});

// =============================================================================
// Pattern 9: DocString (XML/other formats)
// Gherkin: Given the following XML configuration: """xml <config>...</config> """
// =============================================================================
story("System parses XML configuration", ({ given, when, then, doc }: StepsApi) => {
  given("the following XML configuration");
  doc.code(
    "Configuration",
    `<config>
  <server>localhost</server>
  <port>8080</port>
  <debug>true</debug>
</config>`,
    "xml"
  );

  when("the system loads the configuration");

  then("the settings should be applied");
});

// =============================================================================
// Pattern 10: Background (shared setup via helper function)
// Gherkin: Background: Given X / And Y
// =============================================================================
const loggedInBackground = (s: StepsApi) => {
  s.given("the user account exists", () => {
    // Setup user in database
  });
  s.given("the user is logged in", () => {
    // Create session
  });
};

story("Change email address", (s: StepsApi) => {
  loggedInBackground(s);

  s.when("the user updates their email to 'new@example.com'");

  s.then("a verification email should be sent");
});

story("Change password", (s: StepsApi) => {
  loggedInBackground(s);

  s.when("the user updates their password");

  s.then("the old sessions should be invalidated");
  s.then("a confirmation email should be sent");
});

// =============================================================================
// Pattern 11: Rule blocks (using describe)
// Gherkin: Rule: Discounts apply only to eligible customers
// =============================================================================
describe("Rule: Discounts apply only to eligible customers", () => {
  story("Eligible customer gets discount", ({ given, when, then }: StepsApi) => {
    given("the customer is eligible for discounts");
    given("the customer has items worth $100");

    when("the customer checks out");

    then("a 10% discount should be applied");
    then("the total should be $90");
  });

  story("Ineligible customer does not get discount", ({ given, when, then }: StepsApi) => {
    given("the customer is not eligible for discounts");
    given("the customer has items worth $100");

    when("the customer checks out");

    then("no discount should be applied");
    then("the total should be $100");
  });
});

// =============================================================================
// Pattern 12: Scenario Outline / Examples (using loop)
// Gherkin: Scenario Outline: Login errors
//   When the user logs in with "<email>" and "<password>"
//   Then the error message should be "<message>"
//   Examples: | email | password | message |
// Note: story() creates describe blocks, so we can't nest inside test.each.
// Use a simple loop instead.
// =============================================================================
const loginErrorScenarios = [
  { email: "user@example.com", password: "wrong", message: "Invalid credentials" },
  { email: "locked@example.com", password: "secret", message: "Account is locked" },
  { email: "unverified@example.com", password: "pass123", message: "Please verify your email" },
];

for (const { email, password, message } of loginErrorScenarios) {
  story(`Login error: ${message}`, ({ given, when, then }: StepsApi) => {
    given("the user is on the login page");

    when(`the user logs in with "${email}" and "${password}"`);

    then(`the error message should be "${message}"`);
  });
}

// =============================================================================
// Pattern 13: Parameterized scenario with numeric values
// Gherkin: Scenario Outline: Calculate shipping
//   Given an order weighing <weight> kg
//   Then the shipping cost should be $<cost>
// =============================================================================
const shippingScenarios = [
  { weight: 1, cost: 5 },
  { weight: 5, cost: 10 },
  { weight: 10, cost: 15 },
  { weight: 25, cost: 25 },
];

for (const { weight, cost } of shippingScenarios) {
  story(`Shipping for ${weight}kg order`, ({ given, when, then }: StepsApi) => {
    given(`an order weighing ${weight} kg`);

    when("the shipping cost is calculated");

    then(`the shipping cost should be $${cost}`);
  });
}

// =============================================================================
// Pattern 14: Complex parameterized scenario
// =============================================================================
const permissionScenarios = [
  { role: "admin", action: "delete users", allowed: true },
  { role: "admin", action: "view reports", allowed: true },
  { role: "user", action: "delete users", allowed: false },
  { role: "user", action: "view reports", allowed: true },
  { role: "guest", action: "view reports", allowed: false },
];

for (const { role, action, allowed } of permissionScenarios) {
  story(`${role} ${allowed ? "can" : "cannot"} ${action}`, ({ given, when, then, but }: StepsApi) => {
    given(`a user with role "${role}"`);

    when(`the user attempts to "${action}"`);

    if (allowed) {
      then("the action should succeed");
    } else {
      then("the action should be denied");
      but("the user should see a permission error");
    }
  });
}

// =============================================================================
// Pattern 15: Step with explicit And keyword
// =============================================================================
story("Order with explicit And steps", ({ given, and, when, then }: StepsApi) => {
  given("the user is logged in");
  and("the user has a valid payment method");
  and("the user has items in cart");

  when("the user clicks checkout");
  and("confirms the order");

  then("the order should be created");
  and("the payment should be processed");
  and("a confirmation should be displayed");
});

// =============================================================================
// Pattern 16: Mixed And/But in assertions
// =============================================================================
story("Partial success scenario", ({ given, when, then, and, but }: StepsApi) => {
  given("the user has multiple items in cart");
  given("one item is out of stock");

  when("the user attempts to checkout");

  then("the available items should be ordered");
  but("the out of stock item should be removed");
  and("the user should be notified");
  but("the order should not be cancelled");
});

// =============================================================================
// Pattern 17: Story with tags and ticket
// Gherkin: @smoke @auth / Scenario: ...
// =============================================================================
story(
  "Premium user gets early access",
  { tags: ["premium", "feature-flag"], ticket: "JIRA-456" },
  ({ given, when, then }: StepsApi) => {
    given("the user has a premium subscription");
    given("the early access feature is enabled");

    when("the user logs in");

    then("the user should see early access features");
  }
);

// =============================================================================
// Pattern 18: DataTable in Then (verification table)
// =============================================================================
story("Order summary displays correct items", ({ given, when, then, doc }: StepsApi) => {
  given("the user has completed an order");

  when("the user views the order summary");

  then("the order should display the following items");
  doc.table("Order Items", ["product", "quantity", "price"], [
    ["Widget A", "2", "$20.00"],
    ["Widget B", "1", "$15.00"],
    ["Shipping", "1", "$5.00"],
  ]);
});

// =============================================================================
// Pattern 19: Multiple DataTables in one story
// =============================================================================
story("Data transformation pipeline", ({ given, when, then, doc }: StepsApi) => {
  given("the following input data");
  doc.table("Input", ["id", "name", "value"], [
    ["1", "item-a", "100"],
    ["2", "item-b", "200"],
  ]);

  when("the transformation is applied");

  then("the output should be");
  doc.table("Output", ["id", "name", "processedValue"], [
    ["1", "ITEM-A", "110"],
    ["2", "ITEM-B", "220"],
  ]);
});

// =============================================================================
// Pattern 20: But at the start of assertions (contrast)
// =============================================================================
story("Failed login attempt", ({ given, when, but, and }: StepsApi) => {
  given("the user account exists");

  when("the user enters an incorrect password");

  but("the user should not be logged in");
  and("an error message should be displayed");
  and("the failed attempt should be logged");
});

// =============================================================================
// Pattern 21: Long scenario with many steps
// =============================================================================
story("Complete e-commerce checkout flow", ({ given, when, then }: StepsApi) => {
  given("the user is logged in");
  given("the user has items in cart");
  given("the user has a saved address");
  given("the user has a valid payment method");

  when("the user proceeds to checkout");
  when("the user confirms the shipping address");
  when("the user selects standard shipping");
  when("the user confirms the payment method");
  when("the user places the order");

  then("the order should be created");
  then("the payment should be authorized");
  then("the inventory should be reserved");
  then("a confirmation email should be sent");
  then("the order should appear in order history");
});

// =============================================================================
// Pattern 22: Scenario with rich documentation
// =============================================================================
story("API endpoint documentation", ({ given, when, then, doc }: StepsApi) => {
  given("the API server is running");

  doc.section(
    "Endpoint Details",
    "This endpoint handles user authentication and returns a JWT token."
  );

  when("a POST request is made to /api/login");

  doc.code(
    "Request Headers",
    { "Content-Type": "application/json", Accept: "application/json" },
    "json"
  );

  then("the response should include a token");

  doc.json("Response", {
    token: "eyJhbGciOiJIUzI1NiIs...",
    expiresIn: 3600,
    user: { id: 1, email: "user@example.com" },
  });
});

// =============================================================================
// Pattern 23: Scenario Outline with object examples
// =============================================================================
interface UserProfile {
  name: string;
  plan: "free" | "pro" | "enterprise";
  features: string[];
}

const userProfiles: UserProfile[] = [
  { name: "Free User", plan: "free", features: ["basic"] },
  { name: "Pro User", plan: "pro", features: ["basic", "advanced"] },
  {
    name: "Enterprise User",
    plan: "enterprise",
    features: ["basic", "advanced", "custom"],
  },
];

for (const profile of userProfiles) {
  story(`${profile.name} features`, ({ given, when, then, doc }: StepsApi) => {
    given(`a user with ${profile.plan} plan`);

    when("the user views available features");

    then(`the user should have access to ${profile.features.length} features`);

    doc.json("Available Features", profile.features);
  });
}

// =============================================================================
// Pattern 24: DocString as expected output
// =============================================================================
story("Log file format validation", ({ given, when, then, doc }: StepsApi) => {
  given("the application has processed requests");

  when("the log file is generated");

  then("the log should match the expected format");

  doc.code(
    "Expected Log Format",
    `[2024-01-15 10:30:00] INFO  - Request received
[2024-01-15 10:30:01] DEBUG - Processing started
[2024-01-15 10:30:02] INFO  - Request completed`,
    "text"
  );
});

// =============================================================================
// Pattern 25: Given/When/Then with all using And
// =============================================================================
story("Multi-step process", ({ given, when, then }: StepsApi) => {
  given("step one is complete");
  given("step two is complete");
  given("step three is complete");

  when("the process continues");
  when("additional processing occurs");

  then("result one is correct");
  then("result two is correct");
  then("result three is correct");
});

// =============================================================================
// Pattern 26: Scenario with Mermaid diagram
// =============================================================================
story("User registration flow", ({ given, when, then, doc }: StepsApi) => {
  given("the registration form is displayed");

  doc.mermaid(
    `graph LR
    A[Form Displayed] --> B[User Fills Form]
    B --> C{Valid?}
    C -->|Yes| D[Create Account]
    C -->|No| E[Show Errors]
    D --> F[Send Email]
    F --> G[Success Page]`,
    "Registration Flow"
  );

  when("the user submits valid information");

  then("the account should be created");
  then("a verification email should be sent");
});

// =============================================================================
// Pattern 27: Background + Rule (combined patterns)
// =============================================================================
const authenticatedUserBackground = (s: StepsApi) => {
  s.given("the user is authenticated", () => {});
  s.given("the user session is valid", () => {});
};

describe("Rule: Authenticated users can manage their data", () => {
  story("User can view their profile", (s: StepsApi) => {
    authenticatedUserBackground(s);

    s.when("the user navigates to profile page");

    s.then("the profile information should be displayed");
  });

  story("User can update their profile", (s: StepsApi) => {
    authenticatedUserBackground(s);

    s.when("the user updates their profile");

    s.then("the changes should be saved");
    s.and("a success message should be shown");
  });
});

// =============================================================================
// Pattern 28: Scenario with skip/todo modifiers
// =============================================================================
story("Feature under development", ({ given, when, then }: StepsApi) => {
  given("the new feature flag is enabled");

  when.todo("the user accesses the new feature");

  then.todo("the feature should work correctly");
});

story.skip("Temporarily disabled test", ({ given, when, then }: StepsApi) => {
  given("some precondition");

  when("some action");

  then("some expected result");
});

// =============================================================================
// Pattern 29: All keywords in sequence
// =============================================================================
story("Complete keyword demonstration", ({ given, and, when, then, but }: StepsApi) => {
  given("a given step");
  given("another given step");
  and("an explicit and step");
  when("a when step");
  when("another when step");
  then("a then step");
  then("another then step");
  but("a but step");
  and("a final and step");
});

// =============================================================================
// Pattern 30: Complex parameterized scenarios with DataTable
// =============================================================================
const priceScenarios = [
  {
    name: "Standard order",
    items: [
      { product: "A", qty: 2, price: 10 },
      { product: "B", qty: 1, price: 20 },
    ],
    discount: 0,
    expectedTotal: 40,
  },
  {
    name: "Order with discount",
    items: [
      { product: "A", qty: 2, price: 10 },
      { product: "B", qty: 1, price: 20 },
    ],
    discount: 10,
    expectedTotal: 36,
  },
];

for (const scenario of priceScenarios) {
  story(scenario.name, ({ given, when, then, doc }: StepsApi) => {
    given("the following items in cart");
    doc.table(
      "Cart Items",
      ["product", "quantity", "price"],
      scenario.items.map((i) => [i.product, String(i.qty), `$${i.price}`])
    );

    if (scenario.discount > 0) {
      given(`a ${scenario.discount}% discount is applied`);
    }

    when("the total is calculated");

    then(`the total should be $${scenario.expectedTotal}`);
  });
}

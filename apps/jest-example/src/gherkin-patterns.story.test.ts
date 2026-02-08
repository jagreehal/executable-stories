/**
 * Gherkin Pattern Examples for Jest
 *
 * This file demonstrates how to achieve all common Gherkin patterns
 * using executable-stories-jest (describe/it + story.init() + story.given/when/then).
 */
import { describe, it } from '@jest/globals';
import { story } from 'executable-stories-jest';

// =============================================================================
// Pattern 1: Multiple Given (auto-converts to "And")
// =============================================================================
it('User logs in successfully', () => {
  story.init();
  story.given('the user account exists');
  story.given('the user is on the login page');
  story.given('the account is active');
  story.when('the user submits valid credentials');
  story.then('the user should see the dashboard');
});

// =============================================================================
// Pattern 2: Multiple When (auto-converts to "And")
// =============================================================================
it('User updates profile settings', () => {
  story.init();
  story.given('the user is logged in');
  story.when('the user navigates to settings');
  story.when('the user changes their display name');
  story.then('the changes should be saved');
});

// =============================================================================
// Pattern 3: Multiple Then (auto-converts to "And")
// =============================================================================
it('Successful order confirmation', () => {
  story.init();
  story.given('the user has items in cart');
  story.when('the user completes checkout');
  story.then('the order should be created');
  story.then('a confirmation email should be sent');
  story.then('the inventory should be updated');
});

// =============================================================================
// Pattern 4: Mixed Given/When/Then with multiple of each
// =============================================================================
it('Complex user journey', () => {
  story.init();
  story.given('the user account exists');
  story.given('the user has admin privileges');
  story.when('the user logs in');
  story.when('the user navigates to admin panel');
  story.then('the admin dashboard should load');
  story.then('the user count should be displayed');
});

// =============================================================================
// Pattern 5: Use of "But" keyword
// =============================================================================
it('Login blocked for suspended user', () => {
  story.init();
  story.given('the user account exists');
  story.given('the account is suspended');
  story.when('the user submits valid credentials');
  story.then('the user should see an error message');
  story.but('the user should not be logged in');
  story.but('the session should not be created');
});

// =============================================================================
// Pattern 6: DataTable with Given
// =============================================================================
it('Bulk user creation', () => {
  story.init();
  story.given('the following users exist');
  story.table({
    label: 'Users',
    columns: ['email', 'role', 'status'],
    rows: [
      ['alice@example.com', 'admin', 'active'],
      ['bob@example.com', 'user', 'active'],
      ['carol@example.com', 'user', 'pending'],
    ],
  });
  story.when('the admin opens the user list');
  story.then('the user list should include all users');
});

// =============================================================================
// Pattern 7: DataTable with When
// =============================================================================
it('Form submission with multiple fields', () => {
  story.init();
  story.given('the user is on the registration form');
  story.when('the user fills in the form');
  story.table({
    label: 'Form Data',
    columns: ['field', 'value'],
    rows: [
      ['name', 'John Doe'],
      ['email', 'john@example.com'],
      ['password', 'securepass123'],
    ],
  });
  story.then('the form should be submitted successfully');
});

// =============================================================================
// Pattern 8: DocString (JSON payload)
// =============================================================================
it('API accepts a JSON payload', () => {
  story.init();
  story.given('the client has the following JSON payload');
  story.json({
    label: 'Payload',
    value: { email: 'user@example.com', password: 'secret', rememberMe: true },
  });
  story.when('the client sends the request');
  story.then('the response status should be 200');
});

// =============================================================================
// Pattern 9: DocString (XML/other formats)
// =============================================================================
it('System parses XML configuration', () => {
  story.init();
  story.given('the following XML configuration');
  story.code({
    label: 'Configuration',
    content: `<config>
  <server>localhost</server>
  <port>8080</port>
  <debug>true</debug>
</config>`,
    lang: 'xml',
  });
  story.when('the system loads the configuration');
  story.then('the settings should be applied');
});

// =============================================================================
// Pattern 10: Background (shared setup via helper)
// =============================================================================
const loggedInBackground = () => {
  story.given('the user account exists');
  story.given('the user is logged in');
};

it('Change email address', () => {
  story.init();
  loggedInBackground();
  story.when("the user updates their email to 'new@example.com'");
  story.then('a verification email should be sent');
});

it('Change password', () => {
  story.init();
  loggedInBackground();
  story.when('the user updates their password');
  story.then('the old sessions should be invalidated');
  story.then('a confirmation email should be sent');
});

// =============================================================================
// Pattern 11: Rule blocks (using describe)
// =============================================================================
describe('Rule: Discounts apply only to eligible customers', () => {
  it('Eligible customer gets discount', () => {
    story.init();
    story.given('the customer is eligible for discounts');
    story.given('the customer has items worth $100');
    story.when('the customer checks out');
    story.then('a 10% discount should be applied');
    story.then('the total should be $90');
  });

  it('Ineligible customer does not get discount', () => {
    story.init();
    story.given('the customer is not eligible for discounts');
    story.given('the customer has items worth $100');
    story.when('the customer checks out');
    story.then('no discount should be applied');
    story.then('the total should be $100');
  });
});

// =============================================================================
// Pattern 12: Scenario Outline / Examples (using loop)
// =============================================================================
const loginErrorScenarios = [
  {
    email: 'user@example.com',
    password: 'wrong',
    message: 'Invalid credentials',
  },
  {
    email: 'locked@example.com',
    password: 'secret',
    message: 'Account is locked',
  },
  {
    email: 'unverified@example.com',
    password: 'pass123',
    message: 'Please verify your email',
  },
];

for (const { email, password, message } of loginErrorScenarios) {
  it(`Login error: ${message}`, () => {
    story.init();
    story.given('the user is on the login page');
    story.when(`the user logs in with "${email}" and "${password}"`);
    story.then(`the error message should be "${message}"`);
  });
}

// =============================================================================
// Pattern 13: Parameterized scenario with numeric values
// =============================================================================
const shippingScenarios = [
  { weight: 1, cost: 5 },
  { weight: 5, cost: 10 },
  { weight: 10, cost: 15 },
  { weight: 25, cost: 25 },
];

for (const { weight, cost } of shippingScenarios) {
  it(`Shipping for ${weight}kg order`, () => {
    story.init();
    story.given(`an order weighing ${weight} kg`);
    story.when('the shipping cost is calculated');
    story.then(`the shipping cost should be $${cost}`);
  });
}

// =============================================================================
// Pattern 14: Complex parameterized scenario
// =============================================================================
const permissionScenarios = [
  { role: 'admin', action: 'delete users', allowed: true },
  { role: 'admin', action: 'view reports', allowed: true },
  { role: 'user', action: 'delete users', allowed: false },
  { role: 'user', action: 'view reports', allowed: true },
  { role: 'guest', action: 'view reports', allowed: false },
];

for (const { role, action, allowed } of permissionScenarios) {
  it(`${role} ${allowed ? 'can' : 'cannot'} ${action}`, () => {
    story.init();
    story.given(`a user with role "${role}"`);
    story.when(`the user attempts to "${action}"`);
    if (allowed) {
      story.then('the action should succeed');
    } else {
      story.then('the action should be denied');
      story.but('the user should see a permission error');
    }
  });
}

// =============================================================================
// Pattern 15: Step with explicit And keyword
// =============================================================================
it('Order with explicit And steps', () => {
  story.init();
  story.given('the user is logged in');
  story.and('the user has a valid payment method');
  story.and('the user has items in cart');
  story.when('the user clicks checkout');
  story.and('confirms the order');
  story.then('the order should be created');
  story.and('the payment should be processed');
  story.and('a confirmation should be displayed');
});

// =============================================================================
// Pattern 16: Mixed And/But in assertions
// =============================================================================
it('Partial success scenario', () => {
  story.init();
  story.given('the user has multiple items in cart');
  story.given('one item is out of stock');
  story.when('the user attempts to checkout');
  story.then('the available items should be ordered');
  story.but('the out of stock item should be removed');
  story.and('the user should be notified');
  story.but('the order should not be cancelled');
});

// =============================================================================
// Pattern 17: Story with tags and ticket
// =============================================================================
it('Premium user gets early access', () => {
  story.init({ tags: ['premium', 'feature-flag'], ticket: 'JIRA-456' });
  story.given('the user has a premium subscription');
  story.given('the early access feature is enabled');
  story.when('the user logs in');
  story.then('the user should see early access features');
});

// =============================================================================
// Pattern 18: DataTable in Then (verification table)
// =============================================================================
it('Order summary displays correct items', () => {
  story.init();
  story.given('the user has completed an order');
  story.when('the user views the order summary');
  story.then('the order should display the following items');
  story.table({
    label: 'Order Items',
    columns: ['product', 'quantity', 'price'],
    rows: [
      ['Widget A', '2', '$20.00'],
      ['Widget B', '1', '$15.00'],
      ['Shipping', '1', '$5.00'],
    ],
  });
});

// =============================================================================
// Pattern 19: Multiple DataTables in one story
// =============================================================================
it('Data transformation pipeline', () => {
  story.init();
  story.given('the following input data');
  story.table({
    label: 'Input',
    columns: ['id', 'name', 'value'],
    rows: [
      ['1', 'item-a', '100'],
      ['2', 'item-b', '200'],
    ],
  });
  story.when('the transformation is applied');
  story.then('the output should be');
  story.table({
    label: 'Output',
    columns: ['id', 'name', 'processedValue'],
    rows: [
      ['1', 'ITEM-A', '110'],
      ['2', 'ITEM-B', '220'],
    ],
  });
});

// =============================================================================
// Pattern 20: But at the start of assertions (contrast)
// =============================================================================
it('Failed login attempt', () => {
  story.init();
  story.given('the user account exists');
  story.when('the user enters an incorrect password');
  story.but('the user should not be logged in');
  story.and('an error message should be displayed');
  story.and('the failed attempt should be logged');
});

// =============================================================================
// Pattern 21: Long scenario with many steps
// =============================================================================
it('Complete e-commerce checkout flow', () => {
  story.init();
  story.given('the user is logged in');
  story.given('the user has items in cart');
  story.given('the user has a saved address');
  story.given('the user has a valid payment method');
  story.when('the user proceeds to checkout');
  story.when('the user confirms the shipping address');
  story.when('the user selects standard shipping');
  story.when('the user confirms the payment method');
  story.when('the user places the order');
  story.then('the order should be created');
  story.then('the payment should be authorized');
  story.then('the inventory should be reserved');
  story.then('a confirmation email should be sent');
  story.then('the order should appear in order history');
});

// =============================================================================
// Pattern 22: Scenario with rich documentation
// =============================================================================
it('API endpoint documentation', () => {
  story.init();
  story.given('the API server is running');
  story.section({
    title: 'Endpoint Details',
    markdown:
      'This endpoint handles user authentication and returns a JWT token.',
  });
  story.when('a POST request is made to /api/login');
  story.code({
    label: 'Request Headers',
    content: JSON.stringify(
      { 'Content-Type': 'application/json', Accept: 'application/json' },
      null,
      2,
    ),
    lang: 'json',
  });
  story.then('the response should include a token');
  story.json({
    label: 'Response',
    value: {
      token: 'eyJhbGciOiJIUzI1NiIs...',
      expiresIn: 3600,
      user: { id: 1, email: 'user@example.com' },
    },
  });
});

// =============================================================================
// Pattern 23: Scenario Outline with object examples
// =============================================================================
interface UserProfile {
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  features: string[];
}

const userProfiles: UserProfile[] = [
  { name: 'Free User', plan: 'free', features: ['basic'] },
  { name: 'Pro User', plan: 'pro', features: ['basic', 'advanced'] },
  {
    name: 'Enterprise User',
    plan: 'enterprise',
    features: ['basic', 'advanced', 'custom'],
  },
];

for (const profile of userProfiles) {
  it(`${profile.name} features`, () => {
    story.init();
    story.given(`a user with ${profile.plan} plan`);
    story.when('the user views available features');
    story.then(
      `the user should have access to ${profile.features.length} features`,
    );
    story.json({ label: 'Available Features', value: profile.features });
  });
}

// =============================================================================
// Pattern 24: DocString as expected output
// =============================================================================
it('Log file format validation', () => {
  story.init();
  story.given('the application has processed requests');
  story.when('the log file is generated');
  story.then('the log should match the expected format');
  story.code({
    label: 'Expected Log Format',
    content: `[2024-01-15 10:30:00] INFO  - Request received
[2024-01-15 10:30:01] DEBUG - Processing started
[2024-01-15 10:30:02] INFO  - Request completed`,
    lang: 'text',
  });
});

// =============================================================================
// Pattern 25: Given/When/Then with all using And
// =============================================================================
it('Multi-step process', () => {
  story.init();
  story.given('step one is complete');
  story.given('step two is complete');
  story.given('step three is complete');
  story.when('the process continues');
  story.when('additional processing occurs');
  story.then('result one is correct');
  story.then('result two is correct');
  story.then('result three is correct');
});

// =============================================================================
// Pattern 26: Scenario with Mermaid diagram
// =============================================================================
it('User registration flow', () => {
  story.init();
  story.given('the registration form is displayed');
  story.mermaid({
    code: `graph LR
    A[Form Displayed] --> B[User Fills Form]
    B --> C{Valid?}
    C -->|Yes| D[Create Account]
    C -->|No| E[Show Errors]
    D --> F[Send Email]
    F --> G[Success Page]`,
    title: 'Registration Flow',
  });
  story.when('the user submits valid information');
  story.then('the account should be created');
  story.then('a verification email should be sent');
});

// =============================================================================
// Pattern 27: Background + Rule (combined patterns)
// =============================================================================
const authenticatedUserBackground = () => {
  story.given('the user is authenticated');
  story.given('the user session is valid');
};

describe('Rule: Authenticated users can manage their data', () => {
  it('User can view their profile', () => {
    story.init();
    authenticatedUserBackground();
    story.when('the user navigates to profile page');
    story.then('the profile information should be displayed');
  });

  it('User can update their profile', () => {
    story.init();
    authenticatedUserBackground();
    story.when('the user updates their profile');
    story.then('the changes should be saved');
    story.and('a success message should be shown');
  });
});

// =============================================================================
// Pattern 28: Scenario with skip/todo modifiers — no step-level .todo/.skip
// =============================================================================
it.skip('Feature under development (step-level .todo not available; use it.todo for whole test)', () => {
  story.init();
  story.given('the new feature flag is enabled');
  story.when('the user accesses the new feature');
  story.then('the feature should work correctly');
});

it.skip('Temporarily disabled test (use it.skip for whole test)', () => {
  story.init();
  story.given('some precondition');
  story.when('some action');
  story.then('some expected result');
});

// =============================================================================
// Pattern 29: All keywords in sequence
// =============================================================================
it('Complete keyword demonstration', () => {
  story.init();
  story.given('a given step');
  story.given('another given step');
  story.and('an explicit and step');
  story.when('a when step');
  story.when('another when step');
  story.then('a then step');
  story.then('another then step');
  story.but('a but step');
  story.and('a final and step');
});

// =============================================================================
// Pattern 30: Complex parameterized scenarios with DataTable
// =============================================================================
const priceScenarios = [
  {
    name: 'Standard order',
    items: [
      { product: 'A', qty: 2, price: 10 },
      { product: 'B', qty: 1, price: 20 },
    ],
    discount: 0,
    expectedTotal: 40,
  },
  {
    name: 'Order with discount',
    items: [
      { product: 'A', qty: 2, price: 10 },
      { product: 'B', qty: 1, price: 20 },
    ],
    discount: 10,
    expectedTotal: 36,
  },
];

for (const scenario of priceScenarios) {
  it(scenario.name, () => {
    story.init();
    story.given('the following items in cart');
    story.table({
      label: 'Cart Items',
      columns: ['product', 'quantity', 'price'],
      rows: scenario.items.map((i) => [
        i.product,
        String(i.qty),
        `$${i.price}`,
      ]),
    });
    if (scenario.discount > 0) {
      story.given(`a ${scenario.discount}% discount is applied`);
    }
    story.when('the total is calculated');
    story.then(`the total should be $${scenario.expectedTotal}`);
  });
}

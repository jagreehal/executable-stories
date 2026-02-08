/**
 * Replicates the 30 scenarios using executable-stories-jest.
 * test.describe/test + story.init(testInfo) + story.given/when/then (markers only); doc.* → story.* with options.
 */
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

// 1) Multiple Given, single When, single Then
test('User logs in successfully', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the user account exists');
  story.given('the user is on the login page');
  story.given('the account is active');
  story.when('the user submits valid credentials');
  story.then('the user should see the dashboard');
});

// 2) Single Given, multiple When, single Then
test('User updates profile details', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the user is logged in');
  story.when('the user changes their display name');
  story.when('the user changes their time zone');
  story.when('the user saves the profile');
  story.then('the profile should show the updated details');
});

// 3) Single Given, single When, multiple Then
test('Checkout calculates totals', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the cart has 2 items');
  story.when('the user proceeds to checkout');
  story.then('the subtotal should be $40.00');
  story.then('the tax should be $4.00');
  story.then('the total should be $44.00');
});

// 4) Multiple Given, multiple When, multiple Then
test('Password reset flow', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the user account exists');
  story.given('the user has a verified email');
  story.when('the user requests a password reset');
  story.when('the user opens the reset email link');
  story.when('the user sets a new password');
  story.then('the user should be able to log in with the new password');
  story.then('the old password should no longer work');
});

// 5) Use of But
test('Login blocked for suspended user', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the user account exists');
  story.given('the account is suspended');
  story.when('the user submits valid credentials');
  story.then('the user should see an error message');
  story.but('the user should not be logged in');
});

// 6) DataTable for Given setup
test('Bulk user creation', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the following users exist');
  story.table({
    label: 'Users',
    columns: ['email', 'role', 'status'],
    rows: [
      ['alice@example.com', 'admin', 'active'],
      ['bob@example.com', 'user', 'active'],
      ['eve@example.com', 'user', 'locked'],
    ],
  });
  story.when('the admin opens the user list');
  story.then('the user list should include');
  story.table({
    label: 'Expected',
    columns: ['email', 'role', 'status'],
    rows: [
      ['alice@example.com', 'admin', 'active'],
      ['bob@example.com', 'user', 'active'],
      ['eve@example.com', 'user', 'locked'],
    ],
  });
});

// 7) DataTable for input, multiple Then
test('Calculate shipping options', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the user has entered the shipping address');
  story.table({
    label: 'Address',
    columns: ['country', 'state', 'zip'],
    rows: [['US', 'CA', '94107']],
  });
  story.when('shipping options are calculated');
  story.then('the available options should include "Standard"');
  story.then('the available options should include "Express"');
  story.then('the estimated delivery date should be shown');
});

// 8) DocString (JSON)
test('API accepts a JSON payload', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the client has the following JSON payload');
  story.json({
    label: 'Payload',
    value: { email: 'user@example.com', password: 'secret', rememberMe: true },
  });
  story.when('the client sends the request');
  story.then('the response status should be 200');
  story.then('the response body should include "token"');
});

// 9) DocString (XML)
test('Import XML invoice', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the invoice XML is');
  story.code({
    label: 'Invoice',
    content: `<invoice>
  <id>INV-100</id>
  <amount>42.50</amount>
  <currency>USD</currency>
</invoice>`,
    lang: 'xml',
  });
  story.when('the user imports the invoice');
  story.then('the invoice should be saved');
  story.then('the invoice total should be 42.50 USD');
});

// 10) Background for shared preconditions
const accountBackground = async () => {
  story.given('the user account exists');
  story.given('the user is logged in');
};

test.describe('Feature: Account settings', () => {
  test('Change email address', async ({}, testInfo) => {
    story.init(testInfo);
    await accountBackground();
    story.when('the user updates their email to "new@example.com"');
    story.then('a verification email should be sent');
    story.then('the email status should be "pending verification"');
  });

  test('Change password', async ({}, testInfo) => {
    story.init(testInfo);
    await accountBackground();
    story.when('the user changes their password');
    story.then('the user should be able to log in with the new password');
  });
});

// 11) Rule blocks
test.describe('Feature: Discounts', () => {
  test.describe('Rule: Discounts apply only to eligible customers', () => {
    test('Eligible customer gets discount', async ({}, testInfo) => {
      story.init(testInfo);
      story.given('the customer is eligible for discounts');
      story.when('the customer checks out');
      story.then('a discount should be applied');
    });

    test('Ineligible customer does not get discount', async ({}, testInfo) => {
      story.init(testInfo);
      story.given('the customer is not eligible for discounts');
      story.when('the customer checks out');
      story.then('no discount should be applied');
    });
  });
});

// 12) Scenario Outline: Login errors
const loginErrorExamples = [
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
    email: 'unknown@example.com',
    password: 'secret',
    message: 'Invalid credentials',
  },
];
for (const row of loginErrorExamples) {
  test(`Login errors: ${row.message} (${row.email})`, async ({}, testInfo) => {
    story.init(testInfo);
    story.given('the user is on the login page');
    story.when(`the user logs in with "${row.email}" and "${row.password}"`);
    story.then(`the error message should be "${row.message}"`);
  });
}

// 13) Scenario Outline: Tax calculation by region
const taxExamples = [
  { subtotal: '100.00', region: 'CA', tax: '8.25', total: '108.25' },
  { subtotal: '100.00', region: 'NY', tax: '8.00', total: '108.00' },
];
for (const row of taxExamples) {
  test(`Tax calculation by region: ${row.region}`, async ({}, testInfo) => {
    story.init(testInfo);
    story.given(`the cart subtotal is ${row.subtotal}`);
    story.given(`the shipping region is "${row.region}"`);
    story.when('taxes are calculated');
    story.then(`the tax should be ${row.tax}`);
    story.then(`the total should be ${row.total}`);
  });
}

// 14) Scenario Outline: Create users from table input
const createUserExamples = [
  { email: 'a@example.com', role: 'user' },
  { email: 'admin@example.com', role: 'admin' },
];
for (const row of createUserExamples) {
  test(`Create users from table input: ${row.email}`, async ({}, testInfo) => {
    story.init(testInfo);
    story.given('the admin is on the create user page');
    story.when('the admin submits the following user details');
    story.table({
      label: 'Details',
      columns: ['email', 'role'],
      rows: [[row.email, row.role]],
    });
    story.then(`the user "${row.email}" should exist with role "${row.role}"`);
  });
}

// 15) Multiple When groups (phases)
test('Two step checkout', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the user has items in the cart');
  story.when('the user enters shipping information');
  story.when('the user selects a delivery option');
  story.when('the user enters payment information');
  story.when('the user confirms the order');
  story.then('the order should be created');
  story.then('a confirmation email should be sent');
});

// 16) Negative path with Then and But
test('Payment declined', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the user is on the checkout page');
  story.when('the user submits a declined card');
  story.then('the payment should be declined');
  story.then('the user should see "Payment failed"');
  story.but('the order should not be created');
});

// 17) Use of tags
test('Login works', async ({}, testInfo) => {
  story.init(testInfo, { tags: ['smoke', 'auth'] });
  story.given('the user is on the login page');
  story.when('the user logs in with valid credentials');
  story.then('the user should be logged in');
});

// 18) DataTable as key-value pairs
test('Update preferences', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the user has the following preferences');
  story.table({
    label: 'Preferences',
    columns: ['key', 'value'],
    rows: [
      ['email_opt_in', 'true'],
      ['theme', 'dark'],
      ['timezone', 'UTC'],
    ],
  });
  story.when('the user saves preferences');
  story.then('the preferences should be persisted');
});

// 19) Complex DataTable
test('Configure feature flags', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the following feature flags are set');
  story.table({
    label: 'Feature flags',
    columns: ['service', 'flag', 'enabled'],
    rows: [
      ['web', 'new_checkout_ui', 'true'],
      ['api', 'strict_rate_limiting', 'false'],
    ],
  });
  story.when('the system starts');
  story.then('the flag "new_checkout_ui" should be enabled for "web"');
  story.then('the flag "strict_rate_limiting" should be disabled for "api"');
});

// 20) But in Given (replicate as given + story.note for "But guest checkout is enabled")
test('Guest checkout allowed', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the user is on the checkout page');
  story.given('the user is not logged in');
  story.note('But guest checkout is enabled');
  story.when('the user submits an order as a guest');
  story.then('the order should be created');
});

// 21) Repeated Then steps
test('Logout clears session', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the user is logged in');
  story.when('the user logs out');
  story.then('the session cookie should be cleared');
  story.then('the auth token should be revoked');
  story.then('the user should be redirected to the login page');
});

// 22) Explicit state transition
test('Document status changes', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('a document exists with status "draft"');
  story.when('the user submits the document');
  story.then('the document status should change to "submitted"');
  story.then('an audit log entry should be created');
});

// 23) Scenario Outline: Shipping eligibility
const shippingEligibilityExamples = [
  { total: '10', country: 'US', eligible: 'yes' },
  { total: '10', country: 'CA', eligible: 'yes' },
  { total: '10', country: 'CU', eligible: 'no' },
];
for (const row of shippingEligibilityExamples) {
  test(`Shipping eligibility: ${row.country} -> ${row.eligible}`, async ({}, testInfo) => {
    story.init(testInfo);
    story.given(`the cart total is ${row.total}`);
    story.given(`the destination country is "${row.country}"`);
    story.when('shipping eligibility is checked');
    story.then(`shipping should be "${row.eligible}"`);
  });
}

// 24) DocString for Markdown
test('Render markdown', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the markdown input is');
  story.code({
    label: 'Markdown',
    content: `# Title
- Item 1
- Item 2`,
    lang: 'markdown',
  });
  story.when('the user previews the markdown');
  story.then('the preview should show a heading "Title"');
  story.then('the preview should show a list with 2 items');
});

// 25) And after Then
test('Search results show highlights', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the search index contains "hello world"');
  story.when('the user searches for "hello"');
  story.then('results should include "hello world"');
  story.and('the matching text should be highlighted');
});

// 26) Scenario Outline: Post JSON payload
const postPayloadExamples = [
  { id: '123', status: 'active', code: '200' },
  { id: '456', status: 'invalid', code: '400' },
];
for (const row of postPayloadExamples) {
  test(`Post JSON payload: ${row.id} -> ${row.code}`, async ({}, testInfo) => {
    story.init(testInfo);
    story.given('the payload is');
    story.json({ label: 'Payload', value: { id: row.id, status: row.status } });
    story.when('the client posts the payload');
    story.then(`the response status should be ${row.code}`);
  });
}

// 27) Background + tags
test.describe('Feature: Orders', () => {
  test('Create order', async ({}, testInfo) => {
    story.init(testInfo, { tags: ['db', 'smoke'] });
    story.given('the database is seeded');
    story.given('the API is running');
    story.when('the client creates an order');
    story.then('the response status should be 201');
    story.then('the order should exist in the database');
  });
});

// 28) Scenario Outline: Many login attempts
const manyLoginExamples = [
  { email: 'u1@example.com', password: 'secret', result: 'success' },
  { email: 'u2@example.com', password: 'wrong', result: 'fail' },
  { email: 'u3@example.com', password: 'secret', result: 'success' },
  { email: 'u4@example.com', password: 'wrong', result: 'fail' },
];
for (const row of manyLoginExamples) {
  test(`Many login attempts: ${row.email} -> ${row.result}`, async ({}, testInfo) => {
    story.init(testInfo);
    story.given('the user is on the login page');
    story.when(`the user logs in with "${row.email}" and "${row.password}"`);
    story.then(`the login result should be "${row.result}"`);
  });
}

// 29) And in middle of Then
test('Report shows fields in order', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('a report exists for account "A1"');
  story.when('the user downloads the report');
  story.then('the report header should be "Account Report"');
  story.and('the first column should be "Date"');
  story.and('the second column should be "Amount"');
});

// 30) DataTable + DocString
test('Import users and send welcome email', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the following users are to be imported');
  story.table({
    label: 'Users',
    columns: ['email', 'name'],
    rows: [
      ['a@example.com', 'Alice'],
      ['b@example.com', 'Bob'],
    ],
  });
  story.and('the email template is');
  story.code({
    label: 'Template',
    content: `Welcome {{name}}!
Thanks for joining.`,
  });
  story.when('the import job runs');
  story.then('the users should exist');
  story.then('welcome emails should be sent');
});

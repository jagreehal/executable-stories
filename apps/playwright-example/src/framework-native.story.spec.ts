/**
 * Comprehensive demonstration of framework-native test patterns in Playwright.
 * Use test() + story.init(testInfo); scenario title = test name.
 */
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';
import { add, multiply, subtract } from './calculator.js';

test('Framework-native test with doc.story()', async ({}, testInfo) => {
  story.init(testInfo);
  const result = add(5, 3);
  expect(result).toBe(8);
});

test('Another framework-native test', async ({}, testInfo) => {
  story.init(testInfo);
  const result = subtract(10, 4);
  expect(result).toBe(6);
});

test('Framework-native test with multiple operations', async ({}, testInfo) => {
  story.init(testInfo);
  expect(add(2, 3)).toBe(5);
  expect(subtract(10, 5)).toBe(5);
  expect(multiply(4, 3)).toBe(12);
});

test('doc.story() used as story() replacement', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('numbers are ready');
  story.when('addition is performed');
  story.then('result is correct');
  expect(add(1, 1)).toBe(2);
});

test.describe('Calculator operations - mixed patterns', () => {
  test('simple addition check', async ({}, testInfo) => {
    story.init(testInfo);
    expect(add(1, 1)).toBe(2);
  });

  test('Addition with story pattern', async ({}, testInfo) => {
    story.init(testInfo);
    story.given('two positive numbers');
    const a = 5;
    const b = 3;
    story.when('they are added');
    const result = add(a, b);
    story.then('the sum is returned');
    expect(result).toBe(8);
  });

  test('multiplication check', async ({}, testInfo) => {
    story.init(testInfo);
    expect(multiply(2, 3)).toBe(6);
  });
});

test.skip('Using steps parameter object (no callback param; use story.given/when/then)', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('initial value');
  story.when('value is doubled');
  story.then('value equals 20');
  expect(20).toBe(20);
});

test.skip('Using step prefix (no step.*; use story.given/when/then)', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('message is set');
  story.when('message is appended');
  story.then('message is complete');
  expect('Hello, World!').toBe('Hello, World!');
});

test('Using story object from module', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('Module-level story object for global access');
  let count: number;
  story.given('count starts at zero');
  count = 0;
  story.when('count is incremented');
  count++;
  story.then('count equals one');
  expect(count).toBe(1);
});

test.describe('Stories with Playwright hooks', () => {
  test('Story demonstrating hook behavior', async ({}, testInfo) => {
    story.init(testInfo);
    let localState = 0;
    story.given('state starts at zero');
    expect(localState).toBe(0);
    story.when('state is modified');
    localState = 42;
    story.then('state reflects changes');
    expect(localState).toBe(42);
  });

  test('Another story with independent state', async ({}, testInfo) => {
    story.init(testInfo);
    const localState = 0;
    story.given('state starts fresh for each story');
    expect(localState).toBe(0);
    story.then('each story has its own state');
    expect(localState).toBe(0);
  });
});

test('Optional step callbacks for documentation-only steps', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('Steps without callbacks are valid for documentation purposes');
  story.given('user is logged in');
  story.given('user has admin role');
  story.when('admin panel is accessed');
  story.then('admin features are visible');
  expect(true).toBe(true);
  story.then('audit log is updated');
});

test('Using Playwright expect in story steps', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('All Playwright expect work normally in story steps');

  interface User {
    id: number;
    name: string;
    email: string;
    roles: string[];
  }

  story.given('a user object');
  const user: User = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    roles: ['user', 'admin'],
  };
  story.then('toBe works');
  expect(user.id).toBe(1);
  story.then('toEqual works for objects');
  expect(user.roles).toEqual(['user', 'admin']);
  story.then('toContain works for arrays');
  expect(user.roles).toContain('admin');
  story.then('toMatch works for strings');
  expect(user.email).toMatch(/@example\.com$/);
  story.then('toHaveLength works');
  expect(user.roles).toHaveLength(2);
  story.then('toHaveProperty works');
  expect(user).toHaveProperty('email');
  expect(user).toHaveProperty('name', 'John Doe');
  story.then('toBeDefined and toBeTruthy work');
  expect(user.name).toBeDefined();
  expect(user.name).toBeTruthy();
});

test('Framework-native test with full doc API', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('This test uses doc API methods in a framework-native test');
  story.tag(['framework-native', 'comprehensive']);
  story.kv({ label: 'Test Type', value: 'Native' });
  story.json({
    label: 'Test Configuration',
    value: { framework: 'playwright', pattern: 'native', hasStory: true },
  });
  story.table({
    label: 'Supported Patterns',
    columns: ['Pattern', 'Supported'],
    rows: [
      ['doc.story()', 'Yes'],
      ['doc.note()', 'Yes'],
      ['doc.kv()', 'Yes'],
      ['doc.json()', 'Yes'],
      ['doc.table()', 'Yes'],
    ],
  });
  const result = add(100, 200);
  expect(result).toBe(300);
});

test('Framework-native test without doc.story()', async () => {
  expect(add(1, 1)).toBe(2);
});

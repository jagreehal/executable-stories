/**
 * Comprehensive demonstration of framework-native test patterns.
 * Use it() + story.init(); scenario title = test name.
 */
import { describe, expect, it, test } from '@jest/globals';
import { story } from 'executable-stories-jest';
import { add, multiply, subtract } from './calculator.js';

// ============================================================================
// Framework-Native Tests (story.init() at start; test name = scenario title)
// ============================================================================

test('Framework-native test with doc.story()', () => {
  story.init();
  const result = add(5, 3);
  expect(result).toBe(8);
});

test('Another framework-native test', () => {
  story.init();
  const result = subtract(10, 4);
  expect(result).toBe(6);
});

test('Framework-native test with multiple operations', () => {
  story.init();
  expect(add(2, 3)).toBe(5);
  expect(subtract(10, 5)).toBe(5);
  expect(multiply(4, 3)).toBe(12);
});

// ============================================================================
// doc.story() used as story() replacement — use it() + story.init() + steps
// ============================================================================

it('doc.story() used as story() replacement', () => {
  story.init();
  story.given('numbers are ready');
  story.when('addition is performed');
  story.then('result is correct');
  expect(add(1, 1)).toBe(2);
});

// ============================================================================
// Mixing Native Tests with story pattern
// ============================================================================

describe('Calculator operations - mixed patterns', () => {
  test('verify currentTestName format for docs', () => {
    const currentTestName = expect.getState().currentTestName;
    expect(typeof currentTestName).toBe('string');
    expect(currentTestName).toContain('Calculator operations - mixed patterns');
    expect(currentTestName).toContain('verify currentTestName format for docs');
  });

  test('simple addition check', () => {
    story.init();
    expect(add(1, 1)).toBe(2);
  });

  it('Addition with story pattern', () => {
    story.init();
    story.given('two positive numbers');
    const a = 5;
    const b = 3;
    story.when('they are added');
    const result = add(a, b);
    story.then('the sum is returned');
    expect(result).toBe(8);
  });

  test('multiplication check', () => {
    story.init();
    expect(multiply(2, 3)).toBe(6);
  });
});

// ============================================================================
// steps/step object — no steps callback param
// ============================================================================

it.skip('Using steps parameter object (no callback param; use story.given/when/then)', () => {
  story.init();
  story.given('initial value');
  story.when('value is doubled');
  story.then('value equals 20');
  expect(20).toBe(20);
});

it.skip('Using step prefix (no step.*; use story.given/when/then)', () => {
  story.init();
  story.given('message is set');
  story.when('message is appended');
  story.then('message is complete');
  expect('Hello, World!').toBe('Hello, World!');
});

it('Using story object from module', () => {
  story.init();
  story.note('Module-level story object for global access');
  let count: number;
  story.given('count starts at zero');
  count = 0;
  story.when('count is incremented');
  count++;
  story.then('count equals one');
  expect(count).toBe(1);
});

// ============================================================================
// Jest Hooks with Stories
// ============================================================================

describe('Stories with Jest hooks', () => {
  let _setupCount = 0;

  beforeEach(() => {
    _setupCount++;
  });

  it('Story demonstrating hook behavior', () => {
    story.init();
    let localState = 0;
    story.given('state starts at zero');
    expect(localState).toBe(0);
    story.when('state is modified');
    localState = 42;
    story.then('state reflects changes');
    expect(localState).toBe(42);
  });

  it('Another story with independent state', () => {
    story.init();
    const localState = 0;
    story.given('state starts fresh for each story');
    expect(localState).toBe(0);
    story.then('each story has its own state');
    expect(localState).toBe(0);
  });
});

// ============================================================================
// Optional Step Callbacks — steps are markers only (no callbacks)
// ============================================================================

it('Optional step callbacks for documentation-only steps', () => {
  story.init();
  story.note('Steps without callbacks are valid for documentation purposes');
  story.given('user is logged in');
  story.given('user has admin role');
  story.when('admin panel is accessed');
  story.then('admin features are visible');
  expect(true).toBe(true);
  story.then('audit log is updated');
});

// ============================================================================
// Jest Matchers with Stories
// ============================================================================

it('Using Jest matchers in story steps', () => {
  story.init();
  story.note('All Jest matchers work normally in story steps');

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

// ============================================================================
// describe.each / test.each Patterns
// ============================================================================

describe('Parameterized tests with describe.each', () => {
  describe.each([
    { a: 1, b: 2, expected: 3 },
    { a: 5, b: 5, expected: 10 },
    { a: -1, b: 1, expected: 0 },
  ])('add($a, $b)', ({ a, b, expected }) => {
    test(`should return ${expected}`, () => {
      story.init();
      expect(add(a, b)).toBe(expected);
    });
  });
});

// ============================================================================
// Combining Framework-Native with doc API
// ============================================================================

test('Framework-native test with full doc API', () => {
  story.init();
  story.note('This test uses doc API methods in a framework-native test');
  story.tag(['framework-native', 'comprehensive']);
  story.kv({ label: 'Test Type', value: 'Native' });
  story.json({
    label: 'Test Configuration',
    value: { framework: 'jest', pattern: 'native', hasStory: true },
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

// ============================================================================
// Edge Cases
// ============================================================================

it.skip('Story with no steps (story.init() requires at least test name; doc-only scenario not replicated)', () => {
  story.init();
  story.note('A story can exist with only documentation');
  story.tag('edge-case');
  story.kv({ label: 'Has Steps', value: false });
});

test('Framework-native test without doc.story()', () => {
  expect(add(1, 1)).toBe(2);
});

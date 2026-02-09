/**
 * Comprehensive demonstration of framework-native test patterns in Vitest.
 *
 * Patterns covered:
 * - it() with story.init(task)
 * - Using Vitest's test/it/describe
 * - Mixing native tests with story markers
 * - Vitest-specific features with stories
 *
 * Note: story() wrapper is not available; use it() + story.init(task).
 * Use it() + story.init(task) instead.
 */
import { story } from 'executable-stories-vitest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { add, multiply, subtract } from './calculator.js';

// ============================================================================
// Framework-Native Tests with story.init(task)
// ============================================================================

it('Framework-native test with story.init()', ({ task }) => {
  story.init(task);

  const result = add(5, 3);
  expect(result).toBe(8);
});

it('Another framework-native test', ({ task }) => {
  story.init(task);

  const result = subtract(10, 4);
  expect(result).toBe(6);
});

it('Framework-native test with multiple operations', ({ task }) => {
  story.init(task);

  expect(add(2, 3)).toBe(5);
  expect(subtract(10, 5)).toBe(5);
  expect(multiply(4, 3)).toBe(12);
});

// ============================================================================
// Pattern: Using story markers
// ============================================================================

it('Using story markers for documentation', ({ task }) => {
  story.init(task);
  story.note('The story callback receives steps from story.init(task)');

  let value: number;

  story.given('initial value');
  value = 10;

  story.when('value is doubled');
  value = value * 2;

  story.then('value equals 20');
  expect(value).toBe(20);

  story.kv({ label: 'Final Value', value: 20 });
});

it('Using step aliases', ({ task }) => {
  story.init(task);
  story.note('step.* aliases work with story.*');

  let message: string;

  story.given('message is set');
  message = 'Hello';

  story.when('message is appended');
  message += ', World!';

  story.then('message is complete');
  expect(message).toBe('Hello, World!');
});

it('Using steps object style', ({ task }) => {
  story.init(task);
  story.note('Module-level steps via story.* methods');

  let count: number;

  story.given('count starts at zero');
  count = 0;

  story.when('count is incremented');
  count++;

  story.then('count equals one');
  expect(count).toBe(1);
});

// ============================================================================
// Mixing Native Tests with Story Markers
// ============================================================================

describe('Calculator operations - mixed patterns', () => {
  it('simple addition check', ({ task }) => {
    story.init(task);
    expect(add(1, 1)).toBe(2);
  });

  it('Addition with story pattern', ({ task }) => {
    story.init(task);

    story.given('two positive numbers');
    const a = 5;
    const b = 3;

    story.when('they are added');
    const result = add(a, b);

    story.then('the sum is returned');
    expect(result).toBe(8);
  });

  it('multiplication check', ({ task }) => {
    story.init(task);
    expect(multiply(2, 3)).toBe(6);
  });
});

// ============================================================================
// Vitest Hooks with Stories
// ============================================================================

describe('Stories with Vitest hooks', () => {
  let _setupCount = 0;

  beforeEach(() => {
    _setupCount++;
  });

  afterEach(() => {
    // Cleanup if needed
  });

  it('Story demonstrating hook behavior', ({ task }) => {
    story.init(task);

    let localState = 0;

    story.given('state starts at zero');
    expect(localState).toBe(0);

    story.when('state is modified');
    localState = 42;

    story.then('state reflects changes');
    expect(localState).toBe(42);
  });

  it('Another story with independent state', ({ task }) => {
    story.init(task);

    const localState = 0;

    story.given('state starts fresh for each story');
    expect(localState).toBe(0);

    story.then('each story has its own state');
    expect(localState).toBe(0);
  });
});

// ============================================================================
// Optional Step Documentation
// ============================================================================

it('Optional step callbacks for documentation-only steps', ({ task }) => {
  story.init(task);
  story.note('Steps without callbacks are valid for documentation purposes');

  story.given('user is logged in'); // Documentation only
  story.given('user has admin role'); // Documentation only

  story.when('admin panel is accessed');
  // Only this step has implementation

  story.then('admin features are visible');
  expect(true).toBe(true);

  story.then('audit log is updated'); // Documentation-only assertion
});

// ============================================================================
// Vitest Matchers with Stories
// ============================================================================

it('Using Vitest matchers in story steps', ({ task }) => {
  story.init(task);
  story.note('All Vitest matchers work normally in story steps');

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
// Vitest it.each Patterns
// ============================================================================

describe('Parameterized tests with it.each', () => {
  const testCases = [
    { a: 1, b: 2, expected: 3 },
    { a: 5, b: 5, expected: 10 },
    { a: -1, b: 1, expected: 0 },
  ];

  testCases.forEach(({ a, b, expected }) => {
    it(`add(${a}, ${b}) should return ${expected}`, ({ task }) => {
      story.init(task);
      story.given(`inputs ${a} and ${b}`);
      story.when('addition is performed');
      story.then(`result is ${expected}`);
      expect(add(a, b)).toBe(expected);
    });
  });
});

// ============================================================================
// Full Doc API Demonstration
// ============================================================================

it('Full doc API demonstration', ({ task }) => {
  story.init(task);
  story.note('This story uses all doc API methods');
  story.tag(['framework-native', 'comprehensive']);
  story.kv({ label: 'Test Type', value: 'Story' });

  story.json({
    label: 'Test Configuration',
    value: {
      framework: 'vitest',
      pattern: 'story-init',
      hasStory: true,
    },
  });

  story.table({
    label: 'Supported Patterns',
    columns: ['Pattern', 'Supported'],
    rows: [
      ['story.init(task)', 'Yes'],
      ['story.note()', 'Yes'],
      ['story.kv()', 'Yes'],
      ['story.json()', 'Yes'],
      ['story.table()', 'Yes'],
    ],
  });

  story.given('configuration is documented');

  story.then('test passes with rich documentation');
  const result = add(100, 200);
  expect(result).toBe(300);
});

// ============================================================================
// Edge Cases
// ============================================================================

it('Story with documentation only', ({ task }) => {
  story.init(task);
  story.note('A story can exist with minimal implementation');
  story.tag('edge-case');
  story.kv({ label: 'Has Steps', value: true });
  story.then('documentation is generated');
  expect(true).toBe(true);
});

it('Framework-native test without story.init()', () => {
  expect(add(1, 1)).toBe(2);
});

// ============================================================================
// Story with options
// ============================================================================

it('Story with options', ({ task }) => {
  story.init(task, { tags: ['vitest', 'options'], ticket: 'VIT-001' });
  story.note('Combining options with story.init pattern');

  story.given('setup via options');
  story.when('action');
  story.then('assertion');
  expect(true).toBe(true);
});

// ============================================================================
// Nested describe with framework-native it + story.init
// ============================================================================

describe('Edge cases', () => {
  describe('positive numbers', () => {
    it('adds two positives', ({ task }) => {
      story.init(task);
      expect(add(1, 2)).toBe(3);
    });
  });

  describe('zero', () => {
    it('add with zero', ({ task }) => {
      story.init(task);
      story.note('NOTE!!!!!');
      expect(add(0, 5)).toBe(5);
    });

    it('add with one', ({ task }) => {
      story.init(task);
      story.note('NOTE 2!!!!!');
      expect(add(1, 5)).toBe(6);
    });
  });
});

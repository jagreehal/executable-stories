/**
 * Comprehensive demonstration of ALL step function aliases.
 *
 * Step aliases provide semantic alternatives to given/when/then:
 * - AAA Pattern: story.arrange, story.act, story.assert
 * - Alternative: story.setup, story.execute, story.verify
 * - Context/Action: story.context, story.action
 *
 * Note: Step modifiers (.skip, .todo, .fails) are not available; use test.skip/test.todo for whole test.
 * Use test.skip() or it.todo() for the whole test instead.
 */
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

// ============================================================================
// AAA Pattern: Arrange-Act-Assert
// ============================================================================

test.describe('Step Aliases', () => {
  test('AAA Pattern: Arrange-Act-Assert', async ({}, testInfo) => {
    story.init(testInfo);
    story.note('Classic testing pattern using arrange/act/assert aliases');
    story.tag('aaa-pattern');

    story.arrange('calculator is initialized');
    const calculator = {
      add: (a: number, b: number) => a + b,
    };

    story.arrange('input values are prepared');
    const a = 5;
    const b = 3;

    story.act('addition is performed');
    const result = calculator.add(a, b);

    story.assert('result equals expected value');
    expect(result).toBe(8);

    story.assert('result is a number');
    expect(typeof result).toBe('number');
  });

  // ============================================================================
  // Setup-Execute-Verify Pattern
  // ============================================================================

  test('Setup-Execute-Verify Pattern', async ({}, testInfo) => {
    story.init(testInfo);
    story.note('Alternative naming using setup/execute/verify');
    story.tag('sev-pattern');

    story.setup('service is configured');
    const service = {
      process: (data: string) => data.toUpperCase(),
    };

    story.setup('dependencies are mocked');
    // Additional setup

    story.execute('service processes input');
    const output = service.process('hello');

    story.verify('output is transformed correctly');
    expect(output).toBe('HELLO');

    story.verify('output is not empty');
    expect(output.length).toBeGreaterThan(0);
  });

  // ============================================================================
  // Context-Action Pattern
  // ============================================================================

  test('Context-Action Pattern', async ({}, testInfo) => {
    story.init(testInfo);
    story.note('Using context to establish state and action for operations');
    story.tag('context-action');

    story.context('user context is established');
    const state = {
      user: { name: 'Alice', role: 'admin' },
    };

    story.context('permissions are set');
    // Additional context

    story.action('user performs privileged operation');
    const actionResult = state.user.role === 'admin';

    story.then('operation succeeds');
    expect(actionResult).toBe(true);
  });

  // ============================================================================
  // Mixed Patterns - Combining Aliases
  // ============================================================================

  test('Mixed pattern usage', async ({}, testInfo) => {
    story.init(testInfo);
    story.note('Different aliases can be combined in the same story');
    story.tag('mixed');

    // Using BDD style for setup
    story.given('initial data exists');
    const data = [1, 2, 3, 4, 5];

    // Using AAA style for additional arrangement
    story.arrange('data is validated');
    expect(data.length).toBeGreaterThan(0);

    // Using context for state establishment
    story.context('sum accumulator is initialized');

    // Using execute for operation
    story.execute('sum is calculated');
    const sum = data.reduce((a, b) => a + b, 0);

    // Using verify for assertion
    story.verify('sum is correct');
    expect(sum).toBe(15);

    // Using assert for additional check
    story.assert('sum is positive');
    expect(sum).toBeGreaterThan(0);
  });

  // ============================================================================
  // Aliases with Modifiers - step-level modifiers not supported
  // ============================================================================

  test.skip('Aliases support all modifiers (no step.skip/todo/fails - use test.skip/test.todo)', async ({}, testInfo) => {
    story.init(testInfo);
    story.note(
      'Step-level modifiers (.skip, .todo, .fails) are not supported; use test.skip/test.todo for whole test.',
    );
    story.note('Use test.skip() or it.todo() for the whole test instead');

    story.arrange('normal arrangement');
    story.act('normal action');
    story.assert('normal assertion');
    expect(true).toBe(true);
  });

  // ============================================================================
  // Real-World Example Using Aliases
  // ============================================================================

  test('User registration flow using aliases', async ({}, testInfo) => {
    story.init(testInfo);
    story.note('Realistic example using arrange/act/assert pattern');
    story.tag(['user-flow', 'registration']);

    interface User {
      email: string;
      password: string;
      name: string;
    }

    interface RegistrationResult {
      success: boolean;
      userId?: string;
      error?: string;
    }

    // Arrange phase
    story.arrange('valid user data is prepared');
    const _userData: User = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
    };

    story.arrange('email is unique in the system');
    // Mock database check

    // Act phase
    story.act('registration is submitted');
    // Simulate registration
    const result: RegistrationResult = {
      success: true,
      userId: 'user-123',
    };

    // Assert phase
    story.assert('registration succeeds');
    expect(result.success).toBe(true);

    story.assert('user ID is generated');
    expect(result.userId).toBeDefined();
    expect(result.userId).toMatch(/^user-/);

    story.assert('no error is returned');
    expect(result.error).toBeUndefined();
  });

  // ============================================================================
  // Comparing All Alias Styles Side by Side
  // ============================================================================

  test('All alias styles comparison', async ({}, testInfo) => {
    story.init(testInfo);
    story.note('Comparison of all available step function aliases');

    story.table({
      label: 'Step Function Aliases',
      columns: [
        'Purpose',
        'BDD Style',
        'AAA Pattern',
        'Alternative 1',
        'Alternative 2',
      ],
      rows: [
        ['Setup/Context', 'given', 'arrange', 'setup', 'context'],
        ['Action/Execute', 'when', 'act', 'execute', 'action'],
        ['Verify/Assert', 'then', 'assert', 'verify', '-'],
        ['Continue', 'and', '-', '-', '-'],
        ['Negative', 'but', '-', '-', '-'],
      ],
    });

    // BDD Style
    story.given('BDD given step');
    story.when('BDD when step');
    story.then('BDD then step');
    expect(true).toBe(true);

    // AAA Pattern
    story.arrange('AAA arrange step');
    story.act('AAA act step');
    story.assert('AAA assert step');
    expect(true).toBe(true);

    // Alternative 1
    story.setup('alternative setup step');
    story.execute('alternative execute step');
    story.verify('alternative verify step');
    expect(true).toBe(true);

    // Alternative 2
    story.context('alternative context step');
    story.action('alternative action step');

    // And/But
    story.and('continuation step');
    story.but('negative case step');
    expect(true).toBe(true);
  });
});

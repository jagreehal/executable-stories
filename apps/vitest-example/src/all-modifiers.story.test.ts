/**
 * Comprehensive demonstration of test modifiers available in Vitest.
 *
 * Note: Step-level modifiers (.skip, .todo, .fails, .concurrent) are not available.
 * Use it.skip() or it.todo() for the whole test instead.
 */
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';

describe('All Modifiers', () => {
  // ============================================================================
  // Skip Modifier - use it.skip instead of step.skip
  // ============================================================================

  it('Skip modifier demonstration - normal steps only', ({ task }) => {
    story.init(task);
    story.note(
      'Step-level .skip is not supported; use it.skip() for whole test.',
    );
    story.note('Use it.skip() for the whole test instead');

    story.given('a normal precondition');
    story.when('a normal action');
    story.then('a normal assertion');
    expect(true).toBe(true);
  });

  it.skip('Skipped step example (entire test skipped with it.skip)', ({
    task,
  }) => {
    story.init(task);
    story.note('This entire test is skipped');

    story.given('a skipped precondition');
    story.when('a skipped action');
    story.then('a skipped assertion');
    expect(true).toBe(false); // Would fail but test is skipped
  });

  // ============================================================================
  // Todo Modifier - use it.todo instead of step.todo
  // ============================================================================

  it('Todo modifier demonstration - implemented test', ({ task }) => {
    story.init(task);
    story.note(
      'Step-level .todo is not supported; use it.todo() for whole test.',
    );
    story.note('Use it.todo() for the whole test instead');
    story.tag(['todo', 'planning']);

    story.given('setup is complete');
    story.when('user performs an action');
    story.then('expected outcome is verified');
    expect(true).toBe(true);
  });

  it.todo('Todo step example (entire test marked as todo with it.todo)');

  // ============================================================================
  // Fails Modifier - use try/catch or expect().toThrow() instead
  // ============================================================================

  it('Fails modifier demonstration - using try/catch pattern', ({ task }) => {
    story.init(task);
    story.note(
      'Step-level .fails is not supported; use try/catch or expect().toThrow().',
    );
    story.note('Use try/catch or expect().toThrow() patterns instead');
    story.tag('error-handling');

    story.given('a precondition that should throw');

    story.when('an action that throws an error');
    const throwingAction = () => {
      throw new Error('Expected error in when step');
    };

    let error: Error | null = null;
    try {
      throwingAction();
    } catch (e) {
      error = e as Error;
    }

    story.then('error is caught');
    expect(error).not.toBeNull();
    expect(error?.message).toBe('Expected error in when step');

    story.then('normal step continues after expected failure');
    expect(true).toBe(true);
  });

  it('Fails modifier using expect().toThrow()', ({ task }) => {
    story.init(task);
    story.note('Alternative pattern using Vitest toThrow matcher');

    story.given('functions that throw errors');
    const throwingFunction = () => {
      throw new Error('Expected error');
    };

    story.then('toThrow catches the error');
    expect(throwingFunction).toThrow('Expected error');
  });

  // ============================================================================
  // Concurrent Modifier - step-level .concurrent not supported
  // ============================================================================

  it.skip('Concurrent modifier demonstration (no step.concurrent - use Promise.all)', ({
    task,
  }) => {
    story.init(task);
    story.note('Step-level .concurrent is not supported.');
    story.note('Use Promise.all for parallel operations instead');
    story.tag(['concurrent', 'vitest']);

    story.given('setup for concurrent steps');
    story.when('concurrent actions would run');
    story.then('all concurrent actions complete');
    expect(true).toBe(true);
  });

  // ============================================================================
  // Combined Modifiers in Different Scenarios
  // ============================================================================

  it('Mixed modifiers in a realistic scenario', ({ task }) => {
    story.init(task);
    story.note('Demonstrates combining patterns in a real-world scenario');
    story.tag(['mixed']);

    story.given('user is logged in');
    story.and('user has admin privileges');

    story.when('user accesses admin panel');

    story.then('admin dashboard is displayed');
    expect(true).toBe(true);

    story.but('no sensitive data is exposed');
    expect(true).toBe(true);
  });

  // ============================================================================
  // Story-level modifiers - use it.skip/it.todo
  // ============================================================================

  it.skip('Entirely skipped story (use it.skip)', ({ task }) => {
    story.init(task);
    story.note('This entire story is skipped');

    story.given('this will not run');
    story.when('this will not run either');
    story.then('and this definitely will not run');
    expect(false).toBe(true); // Would fail but story is skipped
  });

  // ============================================================================
  // Pattern: Using standard test without step modifiers
  // ============================================================================

  it('Standard test with story markers', ({ task }) => {
    story.init(task);
    story.note('Use standard it() tests with story markers');

    story.given('normal step via story.given()');
    story.when('action via story.when()');
    story.then('assertion via story.then()');
    expect(true).toBe(true);
  });
});

// Uncomment to test it.only
// it.only("Only this test runs", ({ task }) => {
//   story.init(task);
//   story.given("only test setup");
//   story.then("only this test executes");
//   expect(true).toBe(true);
// });

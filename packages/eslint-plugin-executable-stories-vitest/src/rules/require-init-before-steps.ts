import type { Rule } from 'eslint';
import type { CallExpression, MemberExpression, Node } from 'estree';

/**
 * Rule: require-init-before-steps
 *
 * Ensures story.init(task) is called before any step markers (story.given/when/then/etc).
 * This is a best-effort static check - it flags step markers that appear before any story.init()
 * call in the same function scope.
 *
 * BAD:
 *   story.given('something'); // No story.init() before this
 *
 * GOOD:
 *   story.init(task);
 *   story.given('something');
 */

const STEP_NAMES = new Set([
  'given',
  'when',
  'then',
  'and',
  'but',
  'arrange',
  'act',
  'assert',
  'setup',
  'context',
  'execute',
  'action',
  'verify',
]);

function isFunction(node: Node): boolean {
  return (
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionDeclaration'
  );
}

function isStoryInitCall(node: CallExpression): boolean {
  const { callee } = node;
  if (callee.type !== 'MemberExpression') return false;
  const member = callee as MemberExpression;
  const { object, property } = member;
  return (
    object.type === 'Identifier' &&
    object.name === 'story' &&
    property.type === 'Identifier' &&
    property.name === 'init'
  );
}

function isStoryStepCall(node: CallExpression): boolean {
  const { callee } = node;
  if (callee.type !== 'MemberExpression') return false;
  const member = callee as MemberExpression;
  const { object, property } = member;
  return (
    object.type === 'Identifier' &&
    object.name === 'story' &&
    property.type === 'Identifier' &&
    STEP_NAMES.has(property.name)
  );
}

function getContainingFunction(
  node: Node,
  context: Rule.RuleContext,
): Node | null {
  const ancestors = context.sourceCode.getAncestors(node);
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (isFunction(ancestors[i])) {
      return ancestors[i];
    }
  }
  return null;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require story.init(task) to be called before any step markers (story.given/when/then/etc) in Vitest.',
      recommended: true,
    },
    schema: [],
    messages: {
      requireInit:
        'story.init(task) must be called before using step markers like story.given(), story.when(), story.then().',
    },
  },
  create(context) {
    let hasRelevantImport = false;
    // Track functions that have story.init() calls
    const functionsWithInit = new WeakSet<Node>();
    // Track step calls and their containing functions for later verification
    const pendingStepCalls: Array<{
      node: CallExpression;
      containingFunction: Node | null;
    }> = [];

    return {
      ImportDeclaration(node) {
        if (node.source.value === 'executable-stories-vitest') {
          hasRelevantImport = true;
        }
      },
      CallExpression(node: CallExpression) {
        if (!hasRelevantImport) return;

        if (isStoryInitCall(node)) {
          const containingFunction = getContainingFunction(node, context);
          if (containingFunction) {
            functionsWithInit.add(containingFunction);
          }
          return;
        }

        if (isStoryStepCall(node)) {
          const containingFunction = getContainingFunction(node, context);
          pendingStepCalls.push({ node, containingFunction });
        }
      },
      'Program:exit'() {
        for (const { node, containingFunction } of pendingStepCalls) {
          // If no containing function, or the function doesn't have story.init(), report
          if (
            !containingFunction ||
            !functionsWithInit.has(containingFunction)
          ) {
            context.report({ node, messageId: 'requireInit' });
          }
        }
      },
    };
  },
};

export default rule;

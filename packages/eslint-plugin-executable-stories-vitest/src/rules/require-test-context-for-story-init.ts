import type { Rule } from 'eslint';
import type {
  ArrowFunctionExpression,
  CallExpression,
  FunctionDeclaration,
  FunctionExpression,
  MemberExpression,
  Node,
  Property,
  VariableDeclarator,
} from 'estree';

/**
 * Rule: require-test-context-for-story-init
 *
 * Ensures story.init(task) is called inside a test/it callback.
 *
 * BAD:  story.init(task); // at top level
 * GOOD: it('test', ({ task }) => { story.init(task); ... });
 */

const TEST_MODIFIERS = new Set(['only', 'skip', 'todo', 'concurrent', 'fails']);

function isFunction(node: Node): boolean {
  return (
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

function isFunctionNode(
  node: Node,
): node is FunctionDeclaration | ArrowFunctionExpression | FunctionExpression {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
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

function isTestCallExpression(node: CallExpression): boolean {
  const { callee } = node;
  if (callee.type === 'Identifier') {
    return callee.name === 'test' || callee.name === 'it';
  }
  if (callee.type === 'MemberExpression') {
    if (callee.object.type !== 'Identifier') return false;
    if (callee.object.name !== 'test' && callee.object.name !== 'it')
      return false;
    if (callee.property.type !== 'Identifier') return false;
    return TEST_MODIFIERS.has(callee.property.name);
  }
  if (callee.type === 'CallExpression') {
    const inner = callee.callee;
    if (inner.type !== 'MemberExpression') return false;
    if (inner.object.type !== 'Identifier') return false;
    if (inner.object.name !== 'test' && inner.object.name !== 'it')
      return false;
    return (
      inner.property.type === 'Identifier' && inner.property.name === 'each'
    );
  }
  return false;
}

function insideTestCallback(
  node: CallExpression,
  context: Rule.RuleContext,
): boolean {
  const ancestors = context.sourceCode.getAncestors(node);
  const functionAncestors = new Set(ancestors.filter(isFunction));

  for (const ancestor of ancestors) {
    if (ancestor.type !== 'CallExpression') continue;
    if (!isTestCallExpression(ancestor)) continue;
    for (const arg of ancestor.arguments) {
      if (arg && typeof arg === 'object' && functionAncestors.has(arg)) {
        return true;
      }
    }
  }
  return false;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require story.init(task) to be called inside a test/it callback in Vitest.',
      recommended: true,
    },
    schema: [],
    messages: {
      requireTest:
        "story.init(task) must be called inside a test/it callback (e.g. it('...', ({ task }) => { story.init(task); ... })).",
    },
  },
  create(context) {
    let hasRelevantImport = false;
    const namedFunctions = new Map<string, Node>();
    const testCallbackNames = new Set<string>();
    const pendingStoryInitCalls: Array<{
      node: CallExpression;
      containingFunctionName: string | null;
    }> = [];

    function getContainingFunctionName(node: CallExpression): string | null {
      const ancestors = context.sourceCode.getAncestors(node);
      for (let i = ancestors.length - 1; i >= 0; i--) {
        const ancestor = ancestors[i];
        if (ancestor.type === 'FunctionDeclaration' && ancestor.id) {
          return ancestor.id.name;
        }
        if (ancestor.type === 'VariableDeclarator') {
          const declarator = ancestor as VariableDeclarator;
          if (
            declarator.id.type === 'Identifier' &&
            declarator.init &&
            isFunctionNode(declarator.init)
          ) {
            return declarator.id.name;
          }
        }
        if (ancestor.type === 'Property') {
          const prop = ancestor as Property;
          if (
            prop.key.type === 'Identifier' &&
            prop.value &&
            isFunctionNode(prop.value)
          ) {
            return prop.key.name;
          }
          if (prop.key.type === 'Identifier' && prop.method) {
            return prop.key.name;
          }
        }
      }
      return null;
    }

    return {
      ImportDeclaration(node) {
        if (node.source.value === 'executable-stories-vitest') {
          hasRelevantImport = true;
        }
      },
      FunctionDeclaration(node: FunctionDeclaration) {
        if (node.id) {
          namedFunctions.set(node.id.name, node);
        }
      },
      VariableDeclarator(node: VariableDeclarator) {
        if (
          node.id.type === 'Identifier' &&
          node.init &&
          isFunctionNode(node.init)
        ) {
          namedFunctions.set(node.id.name, node.init);
        }
      },
      CallExpression(node: CallExpression) {
        if (!hasRelevantImport) return;

        if (isTestCallExpression(node)) {
          for (const arg of node.arguments) {
            if (arg.type === 'Identifier') {
              testCallbackNames.add(arg.name);
            }
            if (
              arg.type === 'MemberExpression' &&
              arg.property.type === 'Identifier'
            ) {
              testCallbackNames.add(arg.property.name);
            }
          }
          return;
        }

        if (!isStoryInitCall(node)) return;
        if (insideTestCallback(node, context)) return;

        const containingFunctionName = getContainingFunctionName(node);
        pendingStoryInitCalls.push({ node, containingFunctionName });
      },
      'Program:exit'() {
        for (const { node, containingFunctionName } of pendingStoryInitCalls) {
          if (
            containingFunctionName &&
            testCallbackNames.has(containingFunctionName)
          ) {
            continue;
          }
          context.report({ node, messageId: 'requireTest' });
        }
      },
    };
  },
};

export default rule;

import type { Rule } from 'eslint';
import type {
  ArrowFunctionExpression,
  CallExpression,
  FunctionDeclaration,
  FunctionExpression,
  Node,
  Property,
  VariableDeclarator,
} from 'estree';

/** Current API uses story.given() etc. inside test(); no top-level given/when/then. */
const V1_PACKAGE = 'executable-stories-playwright';

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

const STORY_MODIFIERS = new Set(['skip', 'only']);

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

function isStoryCall(node: CallExpression): boolean {
  const { callee } = node;
  if (callee.type === 'Identifier') return callee.name === 'story';
  if (callee.type !== 'MemberExpression') return false;
  if (callee.object.type !== 'Identifier' || callee.object.name !== 'story')
    return false;
  return (
    callee.property.type === 'Identifier' &&
    STORY_MODIFIERS.has(callee.property.name)
  );
}

function isStoryInitCall(node: CallExpression): boolean {
  const { callee } = node;
  if (callee.type !== 'MemberExpression') return false;
  return (
    callee.object.type === 'Identifier' &&
    callee.object.name === 'story' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'init'
  );
}

function isDocStoryCall(node: CallExpression): boolean {
  const { callee } = node;
  if (callee.type !== 'MemberExpression') return false;
  return (
    callee.object.type === 'Identifier' &&
    callee.object.name === 'doc' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'story'
  );
}

function isStepCall(node: CallExpression): boolean {
  const { callee } = node;
  if (callee.type === 'Identifier') return STEP_NAMES.has(callee.name);
  if (callee.type !== 'MemberExpression') return false;
  if (callee.object.type !== 'Identifier') return false;
  if (callee.object.name !== 'steps' && callee.object.name !== 'step')
    return false;
  return (
    callee.property.type === 'Identifier' &&
    STEP_NAMES.has(callee.property.name)
  );
}

function insideStoryCallback(
  node: CallExpression,
  context: Rule.RuleContext,
): boolean {
  const ancestors = context.sourceCode.getAncestors(node);
  const functionAncestors = new Set(ancestors.filter(isFunction));

  for (const ancestor of ancestors) {
    if (ancestor.type !== 'CallExpression') continue;
    if (!isStoryCall(ancestor) && !isDocStoryCall(ancestor)) continue;
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
        'Require step functions (given/when/then/and/but and aliases) to be called inside story() or doc.story(..., callback).',
      recommended: true,
    },
    schema: [],
    messages: {
      requireStory:
        'Step functions must be called inside story(...) (or doc.story(..., callback)).',
    },
  },
  create(context) {
    let hasV1Import = false;
    const namedFunctions = new Map<string, Node>();
    const storyCallbackNames = new Set<string>();
    // Track functions that contain story.init() calls
    const functionsWithInit = new WeakSet<Node>();
    const pendingStepCalls: Array<{
      node: CallExpression;
      containingFunction: Node | null;
      containingFunctionName: string | null;
    }> = [];

    function getContainingFunction(node: CallExpression): Node | null {
      const ancestors = context.sourceCode.getAncestors(node);
      for (let i = ancestors.length - 1; i >= 0; i--) {
        if (isFunctionNode(ancestors[i]) || isFunction(ancestors[i])) {
          return ancestors[i];
        }
      }
      return null;
    }

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
        // Check for object method definitions
        if (ancestor.type === 'Property') {
          const prop = ancestor as Property;
          if (
            prop.key.type === 'Identifier' &&
            prop.value &&
            isFunctionNode(prop.value)
          ) {
            return prop.key.name;
          }
          // Shorthand method syntax: { define() {} }
          if (prop.key.type === 'Identifier' && prop.method) {
            return prop.key.name;
          }
        }
      }
      return null;
    }

    return {
      ImportDeclaration(node) {
        if (node.source.value === V1_PACKAGE) {
          hasV1Import = true;
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
        if (!hasV1Import) return;

        // Track story.init() calls and their containing functions
        if (isStoryInitCall(node)) {
          const containingFunction = getContainingFunction(node);
          if (containingFunction) {
            functionsWithInit.add(containingFunction);
          }
          return;
        }

        if (isStoryCall(node) || isDocStoryCall(node)) {
          for (const arg of node.arguments) {
            if (arg.type === 'Identifier') {
              storyCallbackNames.add(arg.name);
            }
            // Handle member expression callbacks like handlers.define
            if (
              arg.type === 'MemberExpression' &&
              arg.property.type === 'Identifier'
            ) {
              storyCallbackNames.add(arg.property.name);
            }
          }
          return;
        }

        if (!isStepCall(node)) return;
        if (insideStoryCallback(node, context)) return;

        const containingFunction = getContainingFunction(node);
        const containingFunctionName = getContainingFunctionName(node);
        pendingStepCalls.push({ node, containingFunction, containingFunctionName });
      },
      'Program:exit'() {
        for (const { node, containingFunction, containingFunctionName } of pendingStepCalls) {
          // Allow if inside a named function passed to story()/doc.story()
          if (
            containingFunctionName &&
            storyCallbackNames.has(containingFunctionName)
          ) {
            continue;
          }
          // Allow if inside a function that has story.init()
          if (containingFunction && functionsWithInit.has(containingFunction)) {
            continue;
          }
          context.report({ node, messageId: 'requireStory' });
        }
      },
    };
  },
};

export default rule;

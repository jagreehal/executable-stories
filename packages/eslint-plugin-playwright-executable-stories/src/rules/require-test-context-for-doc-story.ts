import type { Rule } from "eslint";
import type {
  CallExpression,
  Node,
  FunctionDeclaration,
  VariableDeclarator,
  ArrowFunctionExpression,
  FunctionExpression,
  Property,
} from "estree";

const TEST_MODIFIERS = new Set(["only", "skip", "fixme", "fail", "slow"]);

function isFunction(node: Node): boolean {
  return node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression";
}

function isFunctionNode(
  node: Node,
): node is FunctionDeclaration | ArrowFunctionExpression | FunctionExpression {
  return (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  );
}

function isDocStoryCall(node: CallExpression): boolean {
  const { callee } = node;
  if (callee.type !== "MemberExpression") return false;
  return (
    callee.object.type === "Identifier" &&
    callee.object.name === "doc" &&
    callee.property.type === "Identifier" &&
    callee.property.name === "story"
  );
}

function isTestCallExpression(node: CallExpression): boolean {
  const { callee } = node;
  if (callee.type === "Identifier") {
    return callee.name === "test" || callee.name === "it";
  }
  if (callee.type !== "MemberExpression") return false;
  if (callee.object.type !== "Identifier") return false;
  if (callee.object.name !== "test" && callee.object.name !== "it") return false;
  if (callee.property.type !== "Identifier") return false;
  return TEST_MODIFIERS.has(callee.property.name);
}

function insideTestCallback(node: CallExpression, context: Rule.RuleContext): boolean {
  const ancestors = context.getSourceCode().getAncestors(node);
  const functionAncestors = new Set(ancestors.filter(isFunction));

  for (const ancestor of ancestors) {
    if (ancestor.type !== "CallExpression") continue;
    if (!isTestCallExpression(ancestor)) continue;
    for (const arg of ancestor.arguments) {
      if (arg && typeof arg === "object" && functionAncestors.has(arg)) {
        return true;
      }
    }
  }
  return false;
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require doc.story(title) to be called inside a test() or it() callback (framework-native pattern).",
      recommended: true,
    },
    schema: [],
    messages: {
      requireTest:
        "doc.story(title) must be called inside a test() callback (e.g. test('...', () => { doc.story('Title'); ... })).",
      requireTitle: "doc.story(title) requires a title argument.",
    },
  },
  create(context) {
    let hasRelevantImport = false;
    const namedFunctions = new Map<string, Node>();
    const testCallbackNames = new Set<string>();
    const pendingDocStoryCalls: Array<{
      node: CallExpression;
      containingFunctionName: string | null;
    }> = [];

    function getContainingFunctionName(node: CallExpression): string | null {
      const ancestors = context.getSourceCode().getAncestors(node);
      for (let i = ancestors.length - 1; i >= 0; i--) {
        const ancestor = ancestors[i];
        if (ancestor.type === "FunctionDeclaration" && ancestor.id) {
          return ancestor.id.name;
        }
        if (ancestor.type === "VariableDeclarator") {
          const declarator = ancestor as VariableDeclarator;
          if (
            declarator.id.type === "Identifier" &&
            declarator.init &&
            isFunctionNode(declarator.init)
          ) {
            return declarator.id.name;
          }
        }
        // Check for object method definitions
        if (ancestor.type === "Property") {
          const prop = ancestor as Property;
          if (prop.key.type === "Identifier" && prop.value && isFunctionNode(prop.value)) {
            return prop.key.name;
          }
          // Shorthand method syntax: { run() {} }
          if (prop.key.type === "Identifier" && prop.method) {
            return prop.key.name;
          }
        }
      }
      return null;
    }

    return {
      ImportDeclaration(node) {
        if (node.source.value === "playwright-executable-stories") {
          hasRelevantImport = true;
        }
      },
      FunctionDeclaration(node: FunctionDeclaration) {
        if (node.id) {
          namedFunctions.set(node.id.name, node);
        }
      },
      VariableDeclarator(node: VariableDeclarator) {
        if (node.id.type === "Identifier" && node.init && isFunctionNode(node.init)) {
          namedFunctions.set(node.id.name, node.init);
        }
      },
      CallExpression(node: CallExpression) {
        if (!hasRelevantImport) return;

        if (isTestCallExpression(node)) {
          for (const arg of node.arguments) {
            if (arg.type === "Identifier") {
              testCallbackNames.add(arg.name);
            }
            // Handle member expression callbacks like handlers.run
            if (arg.type === "MemberExpression" && arg.property.type === "Identifier") {
              testCallbackNames.add(arg.property.name);
            }
          }
          return;
        }

        if (!isDocStoryCall(node)) return;

        if (node.arguments.length === 0) {
          context.report({ node, messageId: "requireTitle" });
          return;
        }
        if (node.arguments.length >= 2) return;

        if (insideTestCallback(node, context)) return;

        const containingFunctionName = getContainingFunctionName(node);
        pendingDocStoryCalls.push({ node, containingFunctionName });
      },
      "Program:exit"() {
        for (const { node, containingFunctionName } of pendingDocStoryCalls) {
          if (containingFunctionName && testCallbackNames.has(containingFunctionName)) {
            continue;
          }
          context.report({ node, messageId: "requireTest" });
        }
      },
    };
  },
};

export default rule;

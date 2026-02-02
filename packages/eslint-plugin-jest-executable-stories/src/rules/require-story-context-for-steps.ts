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

const STEP_NAMES = new Set([
  "given",
  "when",
  "then",
  "and",
  "but",
  "arrange",
  "act",
  "assert",
  "setup",
  "context",
  "execute",
  "action",
  "verify",
]);

const STORY_MODIFIERS = new Set(["skip", "only"]);

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

function isStoryCall(node: CallExpression): boolean {
  const { callee } = node;
  if (callee.type === "Identifier") return callee.name === "story";
  if (callee.type !== "MemberExpression") return false;
  if (callee.object.type !== "Identifier" || callee.object.name !== "story") return false;
  return callee.property.type === "Identifier" && STORY_MODIFIERS.has(callee.property.name);
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

function isStepCall(node: CallExpression): boolean {
  const { callee } = node;
  if (callee.type === "Identifier") return STEP_NAMES.has(callee.name);
  if (callee.type !== "MemberExpression") return false;
  if (callee.object.type !== "Identifier") return false;
  if (callee.object.name !== "steps" && callee.object.name !== "step") return false;
  return callee.property.type === "Identifier" && STEP_NAMES.has(callee.property.name);
}

function insideStoryCallback(node: CallExpression, context: Rule.RuleContext): boolean {
  const ancestors = context.getSourceCode().getAncestors(node);
  const functionAncestors = new Set(ancestors.filter(isFunction));

  for (const ancestor of ancestors) {
    if (ancestor.type !== "CallExpression") continue;
    if (!isStoryCall(ancestor) && !isDocStoryCall(ancestor)) continue;
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
        "Require step functions (given/when/then/and/but and aliases) to be called inside story() or doc.story(..., callback).",
      recommended: true,
    },
    schema: [],
    messages: {
      requireStory:
        "Step functions must be called inside story(...) (or doc.story(..., callback)).",
    },
  },
  create(context) {
    let hasRelevantImport = false;
    const namedFunctions = new Map<string, Node>();
    const storyCallbackNames = new Set<string>();
    const pendingStepCalls: Array<{ node: CallExpression; containingFunctionName: string | null }> =
      [];

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
          // Shorthand method syntax: { define() {} }
          if (prop.key.type === "Identifier" && prop.method) {
            return prop.key.name;
          }
        }
      }
      return null;
    }

    return {
      ImportDeclaration(node) {
        if (node.source.value === "jest-executable-stories") {
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

        if (isStoryCall(node) || isDocStoryCall(node)) {
          for (const arg of node.arguments) {
            if (arg.type === "Identifier") {
              storyCallbackNames.add(arg.name);
            }
            // Handle member expression callbacks like handlers.define
            if (arg.type === "MemberExpression" && arg.property.type === "Identifier") {
              storyCallbackNames.add(arg.property.name);
            }
          }
          return;
        }

        if (!isStepCall(node)) return;
        if (insideStoryCallback(node, context)) return;

        const containingFunctionName = getContainingFunctionName(node);
        pendingStepCalls.push({ node, containingFunctionName });
      },
      "Program:exit"() {
        for (const { node, containingFunctionName } of pendingStepCalls) {
          if (containingFunctionName && storyCallbackNames.has(containingFunctionName)) {
            continue;
          }
          context.report({ node, messageId: "requireStory" });
        }
      },
    };
  },
};

export default rule;

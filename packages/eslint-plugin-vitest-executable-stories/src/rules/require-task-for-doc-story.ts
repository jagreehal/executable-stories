import type { Rule } from "eslint";
import type { CallExpression, MemberExpression } from "estree";

/**
 * Rule: require-task-for-doc-story
 *
 * In Vitest, doc.story("Title") with one argument does not attach the story to the test.
 * The second argument (task) is required: doc.story("Title", task) with it('...', ({ task }) => { ... }).
 *
 * BAD:  doc.story("My story");
 * GOOD: doc.story("My story", task);
 */

function isDocStoryCall(node: CallExpression): boolean {
  const { callee } = node;
  if (callee.type !== "MemberExpression") return false;
  const member = callee as MemberExpression;
  const { object, property } = member;
  return (
    object.type === "Identifier" &&
    object.name === "doc" &&
    property.type === "Identifier" &&
    property.name === "story"
  );
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require the task argument for doc.story() in Vitest. Use it('...', ({ task }) => { doc.story('Title', task); ... }).",
      recommended: true,
    },
    schema: [],
    messages: {
      requireTask:
        "In Vitest, doc.story(title, task) requires the task argument. Use it('...', ({ task }) => { doc.story('Title', task); ... }).",
    },
  },

  create(context) {
    let hasRelevantImport = false;

    return {
      ImportDeclaration(node) {
        if (node.source.value === "vitest-executable-stories") {
          hasRelevantImport = true;
        }
      },
      CallExpression(node: CallExpression) {
        if (!hasRelevantImport) return;
        if (!isDocStoryCall(node)) return;
        if (node.arguments.length >= 2) return;
        context.report({
          node,
          messageId: "requireTask",
        });
      },
    };
  },
};

export default rule;

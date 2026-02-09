import type { Rule } from 'eslint';
import type { CallExpression, MemberExpression } from 'estree';

/**
 * Rule: require-task-for-story-init
 *
 * In Vitest, story.init() requires the task argument.
 * Use: it('...', ({ task }) => { story.init(task); ... })
 *
 * BAD:  story.init();
 * GOOD: story.init(task);
 */

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

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Require the task argument for story.init() in Vitest. Use it('...', ({ task }) => { story.init(task); ... }).",
      recommended: true,
    },
    schema: [],
    messages: {
      requireTask:
        "story.init(task) requires the task argument. Use it('...', ({ task }) => { story.init(task); ... }).",
    },
  },

  create(context) {
    let hasRelevantImport = false;

    return {
      ImportDeclaration(node) {
        if (node.source.value === 'executable-stories-vitest') {
          hasRelevantImport = true;
        }
      },
      CallExpression(node: CallExpression) {
        if (!hasRelevantImport) return;
        if (!isStoryInitCall(node)) return;
        if (node.arguments.length >= 1) return;
        context.report({
          node,
          messageId: 'requireTask',
        });
      },
    };
  },
};

export default rule;

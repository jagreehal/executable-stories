import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../src/index.js';

const linter = new Linter({ configType: 'flat' });

const config = [
  {
    plugins: {
      'executable-stories-vitest': plugin,
    },
    rules: {
      'executable-stories-vitest/require-task-for-story-init': 'error' as const,
    },
  },
];

describe('require-task-for-story-init', () => {
  describe('valid cases', () => {
    it('allows story.init with task argument', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        story.init(task);
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('allows story.init with task and options', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        story.init(task, { tags: ["admin"] });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('allows code without story.init', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        story.given("something");
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('ignores story.init without relevant import', () => {
      const code = `story.init();`;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });
  });

  describe('invalid cases', () => {
    it('reports story.init with no arguments', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        story.init();
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
      expect(messages[0].ruleId).toBe(
        'executable-stories-vitest/require-task-for-story-init',
      );
      expect(messages[0].message).toContain('task');
    });

    it('reports multiple story.init with no arguments', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        story.init();
        story.init();
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(2);
    });
  });
});

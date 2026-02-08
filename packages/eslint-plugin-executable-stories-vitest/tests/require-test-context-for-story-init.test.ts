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
      'executable-stories-vitest/require-test-context-for-story-init':
        'error' as const,
    },
  },
];

describe('require-test-context-for-story-init', () => {
  describe('valid cases', () => {
    it('allows story.init inside it() callback', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        it("test", ({ task }) => {
          story.init(task);
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('allows story.init inside test() callback', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        test("test", ({ task }) => {
          story.init(task);
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('allows story.init inside it.skip() callback', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        it.skip("test", ({ task }) => {
          story.init(task);
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('allows story.init inside it.only() callback', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        it.only("test", ({ task }) => {
          story.init(task);
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('allows code without relevant import', () => {
      const code = `story.init(task);`;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('allows story.init in named function passed to it()', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        function testFn({ task }) {
          story.init(task);
        }
        it("test", testFn);
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });
  });

  describe('invalid cases', () => {
    it('reports story.init at top level', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        story.init(task);
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
      expect(messages[0].ruleId).toBe(
        'executable-stories-vitest/require-test-context-for-story-init',
      );
    });

    it('reports story.init inside describe() but not it()', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        describe("suite", () => {
          story.init(task);
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
    });

    it('reports story.init in unrelated function', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        function helper({ task }) {
          story.init(task);
        }
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
    });
  });
});

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
      'executable-stories-vitest/require-init-before-steps': 'error' as const,
    },
  },
];

describe('require-init-before-steps', () => {
  describe('valid cases', () => {
    it('allows step markers after story.init in same function', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        it("test", ({ task }) => {
          story.init(task);
          story.given("something");
          story.when("action");
          story.then("result");
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('allows all step aliases after story.init', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        it("test", ({ task }) => {
          story.init(task);
          story.given("a");
          story.when("b");
          story.then("c");
          story.and("d");
          story.but("e");
          story.arrange("f");
          story.act("g");
          story.assert("h");
          story.setup("i");
          story.context("j");
          story.execute("k");
          story.action("l");
          story.verify("m");
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('allows code without relevant import', () => {
      const code = `
        story.given("something");
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('allows code without step markers', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        it("test", ({ task }) => {
          story.init(task);
          expect(1).toBe(1);
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('allows step markers in arrow function with story.init', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        const myTest = ({ task }) => {
          story.init(task);
          story.given("something");
        };
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });
  });

  describe('invalid cases', () => {
    it('reports step marker at top level without story.init', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        story.given("something");
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
      expect(messages[0].ruleId).toBe(
        'executable-stories-vitest/require-init-before-steps',
      );
    });

    it('reports step marker in function without story.init', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        it("test", ({ task }) => {
          story.given("something");
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
    });

    it('reports multiple step markers without story.init', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        it("test", ({ task }) => {
          story.given("a");
          story.when("b");
          story.then("c");
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(3);
    });

    it('reports step markers in describe callback without story.init', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        describe("suite", () => {
          story.given("something");
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
    });

    it('reports step marker in one function when story.init is in another', () => {
      const code = `
        import { story } from "executable-stories-vitest";
        it("test1", ({ task }) => {
          story.init(task);
          story.given("valid");
        });
        it("test2", ({ task }) => {
          story.given("invalid - no init here");
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
    });
  });
});

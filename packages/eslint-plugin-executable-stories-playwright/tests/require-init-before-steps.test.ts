import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../src/index.js';

const linter = new Linter({ configType: 'flat' });

const config = [
  {
    plugins: {
      'executable-stories-playwright': plugin,
    },
    rules: {
      'executable-stories-playwright/require-init-before-steps':
        'error' as const,
    },
  },
];

describe('require-init-before-steps', () => {
  describe('valid cases', () => {
    it('allows step markers after story.init in same function', () => {
      const code = `
        import { story } from "executable-stories-playwright";
        test("test", async ({}, testInfo) => {
          story.init(testInfo);
          story.given("something", async () => {});
          story.when("action", async () => {});
          story.then("result", async () => {});
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('allows all step aliases after story.init', () => {
      const code = `
        import { story } from "executable-stories-playwright";
        test("test", async ({}, testInfo) => {
          story.init(testInfo);
          story.given("a", async () => {});
          story.when("b", async () => {});
          story.then("c", async () => {});
          story.and("d", async () => {});
          story.but("e", async () => {});
          story.arrange("f", async () => {});
          story.act("g", async () => {});
          story.assert("h", async () => {});
          story.setup("i", async () => {});
          story.context("j", async () => {});
          story.execute("k", async () => {});
          story.action("l", async () => {});
          story.verify("m", async () => {});
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('allows story.fn and story.expect after story.init', () => {
      const code = `
        import { story } from "executable-stories-playwright";
        test("test", async ({}, testInfo) => {
          story.init(testInfo);
          story.fn("Given", "something", async () => {});
          story.expect("result is correct", async () => {});
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('allows code without relevant import', () => {
      const code = `
        story.given("something", async () => {});
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it('allows code without step markers', () => {
      const code = `
        import { story } from "executable-stories-playwright";
        test("test", async ({}, testInfo) => {
          story.init(testInfo);
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });
  });

  describe('invalid cases', () => {
    it('reports step marker at top level without story.init', () => {
      const code = `
        import { story } from "executable-stories-playwright";
        story.given("something", async () => {});
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
      expect(messages[0].ruleId).toBe(
        'executable-stories-playwright/require-init-before-steps',
      );
    });

    it('reports step marker in function without story.init', () => {
      const code = `
        import { story } from "executable-stories-playwright";
        test("test", async ({}, testInfo) => {
          story.given("something", async () => {});
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
    });

    it('reports multiple step markers without story.init', () => {
      const code = `
        import { story } from "executable-stories-playwright";
        test("test", async ({}, testInfo) => {
          story.given("a", async () => {});
          story.when("b", async () => {});
          story.then("c", async () => {});
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(3);
    });

    it('reports story.fn without story.init', () => {
      const code = `
        import { story } from "executable-stories-playwright";
        test("test", async ({}, testInfo) => {
          story.fn("Given", "something", async () => {});
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
    });

    it('reports story.expect without story.init', () => {
      const code = `
        import { story } from "executable-stories-playwright";
        test("test", async ({}, testInfo) => {
          story.expect("result", async () => {});
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
    });

    it('reports step marker in one function when story.init is in another', () => {
      const code = `
        import { story } from "executable-stories-playwright";
        test("test1", async ({}, testInfo) => {
          story.init(testInfo);
          story.given("valid", async () => {});
        });
        test("test2", async ({}, testInfo) => {
          story.given("invalid - no init here", async () => {});
        });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
    });
  });
});

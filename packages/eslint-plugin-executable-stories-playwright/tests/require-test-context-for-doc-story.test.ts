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
      'executable-stories-playwright/require-test-context-for-doc-story':
        'error' as const,
    },
  },
];

describe('require-test-context-for-doc-story', () => {
  it('allows doc.story(title) inside test callback', () => {
    const code = `
      import { doc } from "executable-stories-playwright";
      import { test } from "@playwright/test";
      test("native", () => {
        doc.story("Title");
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it('allows doc.story(title, callback) outside tests', () => {
    const code = `
      import { doc } from "executable-stories-playwright";
      doc.story("Title", (steps) => {
        steps.given("a user", async () => {});
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it('allows doc.story(title) in a named test callback', () => {
    const code = `
      import { doc } from "executable-stories-playwright";
      const run = () => {
        doc.story("Title");
      };
      test("native", run);
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it('allows doc.story(title) in a member expression test callback', () => {
    const code = `
      import { doc } from "executable-stories-playwright";
      const handlers = {
        run() {
          doc.story("Title");
        }
      };
      test("native", handlers.run);
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it('reports doc.story(title) outside test', () => {
    const code = `
      import { doc } from "executable-stories-playwright";
      doc.story("Title");
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(1);
    expect(messages[0].ruleId).toBe(
      'executable-stories-playwright/require-test-context-for-doc-story',
    );
  });

  it('reports doc.story() with no arguments', () => {
    const code = `
      import { doc } from "executable-stories-playwright";
      doc.story();
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain('requires a title');
  });
});

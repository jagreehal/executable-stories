import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../src/index.js';

const linter = new Linter({ configType: 'flat' });

describe('eslint-plugin-executable-stories-jest', () => {
  it('plugin loads and config applies', () => {
    const config = [
      {
        plugins: {
          'executable-stories-jest': plugin,
        },
        rules: {},
      },
    ];
    const messages = linter.verify('const x = 1;', config);
    expect(messages).toHaveLength(0);
  });
});

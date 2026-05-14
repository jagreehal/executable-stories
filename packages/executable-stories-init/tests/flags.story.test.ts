import { describe, expect, it } from 'vitest';
import { story } from 'executable-stories-vitest';
import { resolveFrameworks } from '../src/flags';

describe('resolveFrameworks', () => {
  it('returns empty when no flags are provided', ({ task }) => {
    story.init(task);
    expect(resolveFrameworks({})).toEqual([]);
  });

  it('resolves --both to vitest + playwright', ({ task }) => {
    story.init(task);
    expect(resolveFrameworks({ both: true })).toEqual(['vitest', 'playwright']);
  });

  it('combines --both with explicit framework flags', ({ task }) => {
    story.init(task);
    expect(resolveFrameworks({ both: true, jest: true })).toEqual(['vitest', 'playwright', 'jest']);
  });

  it('returns all frameworks for --all and de-duplicates extras', ({ task }) => {
    story.init(task);
    expect(resolveFrameworks({ all: true, vitest: true, cypress: true })).toEqual([
      'vitest',
      'playwright',
      'jest',
      'cypress',
    ]);
  });
});

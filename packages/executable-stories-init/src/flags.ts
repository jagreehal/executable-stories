import type { Framework } from './types';

type FrameworkFlagOpts = {
  all?: boolean;
  both?: boolean;
  vitest?: boolean;
  playwright?: boolean;
  jest?: boolean;
  cypress?: boolean;
};

export function resolveFrameworks(opts: FrameworkFlagOpts): Framework[] {
  const frameworks = new Set<Framework>();

  if (opts.all) {
    frameworks.add('vitest');
    frameworks.add('playwright');
    frameworks.add('jest');
    frameworks.add('cypress');
  }

  if (opts.both) {
    frameworks.add('vitest');
    frameworks.add('playwright');
  }

  if (opts.vitest) frameworks.add('vitest');
  if (opts.playwright) frameworks.add('playwright');
  if (opts.jest) frameworks.add('jest');
  if (opts.cypress) frameworks.add('cypress');

  return [...frameworks];
}

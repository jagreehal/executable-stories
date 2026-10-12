import type { setupWorker as SetupWorker } from 'msw/browser';

// What `#msw-browser` resolves to on the server: msw/browser has no Node build, and SSR
// bundlers (Next.js) compile client components for the server too. The worker only starts in a browser.
export const setupWorker: typeof SetupWorker = () => {
  throw new Error('executable-stories-showcase: the MSW worker only runs in a browser');
};

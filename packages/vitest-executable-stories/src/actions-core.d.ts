/**
 * Optional: only present in GitHub Actions. Used by StoryReporter for job summary.
 * No dependency; dynamic import at runtime.
 */
declare module "@actions/core" {
  export const summary: {
    addRaw(markdown: string): void;
    write(): Promise<void>;
  };
}

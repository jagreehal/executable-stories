/**
 * Minimal type declarations for @actions/core summary.
 * The package is optional - only available in GitHub Actions CI.
 */
declare module "@actions/core" {
  interface Summary {
    addRaw(text: string): Summary;
    write(): Promise<Summary>;
  }
  export const summary: Summary;
}

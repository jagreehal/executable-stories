declare module "@actions/core" {
  export const summary: {
    addRaw(markdown: string): void;
    write(): Promise<void>;
  };
}

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "src/__tests__",
    include: ["**/*.test.ts"],
  },
});

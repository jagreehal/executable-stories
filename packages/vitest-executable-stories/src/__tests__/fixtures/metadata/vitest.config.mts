import { defineConfig } from "vitest/config";
// Fixtures use reporter entry so config does not load main package (dist or source)
import { StoryReporter } from "../../../reporter.js";

export default defineConfig({
  test: {
    include: ["src/__tests__/fixtures/metadata/**/*.story.test.ts"],
    reporters: [
      new StoryReporter({
        output: "src/__tests__/fixtures/metadata/dist/metadata.md",
        title: "Metadata Report",
        description: "Generated for metadata validation.",
        includeMetadata: true,
        includeFrontMatter: true,
        includeJson: true,
        metadata: {
          date: "iso",
          packageVersion: true,
          gitSha: false,
        },
        json: {
          includeDocs: "all",
        },
      }),
    ],
  },
});

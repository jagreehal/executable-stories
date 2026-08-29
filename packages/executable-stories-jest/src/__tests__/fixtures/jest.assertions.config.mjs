/** Jest config for the half-broken fixture: writes the raw run for assertions. */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

export default {
  rootDir,
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/__tests__/fixtures/assertions/**/*.story.test.ts"],
  setupFilesAfterEnv: ["executable-stories-jest/setup"],
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      { useESM: true, tsconfig: "<rootDir>/tsconfig.json" },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  reporters: [
    "default",
    [
      "executable-stories-jest/reporter",
      {
        formats: [],
        outputDir: "src/__tests__/fixtures/assertions/dist",
        rawRunPath: "src/__tests__/fixtures/assertions/dist/raw-run.json",
      },
    ],
  ],
};

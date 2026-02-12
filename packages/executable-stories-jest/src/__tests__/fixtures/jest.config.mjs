/** Jest config for reporter tests: runs fixture story tests and writes markdown via reporter. */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

export default {
  rootDir,
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/__tests__/fixtures/**/*.story.test.ts"],
  setupFilesAfterEnv: ["executable-stories-jest/setup"],
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "<rootDir>/tsconfig.json",
      },
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
        formats: ["markdown"],
        outputDir: "src/__tests__/fixtures/dist",
        outputName: "user-stories",
        output: {
          mode: "aggregated",
        },
      },
    ],
  ],
};

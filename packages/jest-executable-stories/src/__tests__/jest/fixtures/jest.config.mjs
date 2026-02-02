import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../../..");

export default {
  rootDir,
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/__tests__/jest/fixtures/**/*.story.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/fixtures/failure/"],
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
      "<rootDir>/dist/reporter.cjs",
      {
        output: "src/__tests__/jest/fixtures/dist/user-stories.md",
      },
    ],
  ],
};

/** Jest config with jest-executable-stories reporter (colocated .story.docs.md next to test files). */
export default {
  rootDir: process.cwd(),
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.story.test.ts"],
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
      "jest-executable-stories/reporter",
      {
        output: [{ include: "**/*", mode: "colocated" }],
        enableGithubActionsSummary: false,
      },
    ],
  ],
};

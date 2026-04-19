export default {
  formatters: {
    "test-format": {
      name: "test-format",
      fileExtension: "txt",
      format: (run) => `test-format: ${run.testCases.length} tests`,
    },
  },
};

/**
 * CJS smoke: require the reporter subpath. Run with cwd = repo root after build.
 */
const m = require("vitest-executable-stories/reporter");
const Reporter = m.default ?? m.StoryReporter;
if (typeof Reporter !== "function") throw new Error("no callable export");
process.exit(0);

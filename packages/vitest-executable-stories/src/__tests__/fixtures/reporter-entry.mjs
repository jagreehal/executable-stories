/**
 * Regression: import the reporter subpath in a plain Node process.
 * Must run after build with cwd = repo root so resolution uses package exports -> dist.
 * Tolerant: accept default or named StoryReporter.
 */
import("vitest-executable-stories/reporter")
  .then((m) => {
    const Reporter = m.default ?? m.StoryReporter;
    if (typeof Reporter !== "function") throw new Error("no callable export");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

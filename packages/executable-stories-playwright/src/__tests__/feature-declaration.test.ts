/**
 * `story.feature(...)` is declared at module scope, where no test is running
 * and Playwright cannot tell us which spec file we are in. The declaration is
 * therefore keyed on the file the stack says called it, and claimed at init by
 * matching `testInfo.file`.
 *
 * Two things can go wrong, and both are silent:
 *  - the file cannot be resolved, and every declaration is lost;
 *  - the file is ignored, and a worker reused across specs hands this file's
 *    feature to the next one, which the reporter then records against a file
 *    that never declared anything.
 */
import { test, expect } from "@playwright/test";
import { story } from "../story-api";

story.feature({
  kind: "ability",
  title: "Anyone can read what a spec file is for",
  narrative: "A list of scenarios does not say why the feature exists.",
});

function declaredFeatureOf(testInfo: {
  annotations: Array<{ type: string; description?: string }>;
}): { title?: string } | undefined {
  const annotation = testInfo.annotations.find((a) => a.type === "story-feature");
  return annotation?.description ? JSON.parse(annotation.description) : undefined;
}

test("a scenario claims the declaration made in its own file", async ({}, testInfo) => {
  story.init(testInfo);
  story.given("a file that declared a feature at module scope");
  story.then("its scenarios carry the declaration");

  expect(declaredFeatureOf(testInfo)?.title).toBe(
    "Anyone can read what a spec file is for",
  );
});

test("the declaration is keyed on this file, not on whoever ran last", async ({}, testInfo) => {
  story.init(testInfo);
  story.given("a worker that may have loaded another spec before this one");
  story.then("the claimed declaration is the one this file wrote");

  // The reporter keys features by test.location.file. A declaration reaching a
  // test in a different file is recorded against that file, inventing a
  // feature nobody wrote there.
  expect(testInfo.file).toContain("feature-declaration.test.ts");
  expect(declaredFeatureOf(testInfo)?.title).toBe(
    "Anyone can read what a spec file is for",
  );
});

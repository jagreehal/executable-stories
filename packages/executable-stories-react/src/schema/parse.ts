/**
 * parseStoryReport — boundary validator. Accepts unknown input (file contents,
 * fetch body, prop) and returns a Result-typed StoryReport.
 */

import type { StoryReport } from "executable-stories-core";
import type { Result } from "../result";
import { ok, err } from "../result";
import { storyReportSchema, STORY_REPORT_SCHEMA_MAJOR } from "./story-report.schema";

export function parseStoryReport(input: unknown): Result<StoryReport> {
  if (input === null || typeof input !== "object") {
    return err({
      message: "Expected a StoryReport object.",
      code: "INVALID_INPUT",
    });
  }

  const versionRaw = (input as { schemaVersion?: unknown }).schemaVersion;
  if (typeof versionRaw === "string") {
    const major = versionRaw.split(".")[0];
    if (major !== String(STORY_REPORT_SCHEMA_MAJOR)) {
      return err({
        message: `Schema major ${major} is not supported by this version of executable-stories-react (expected ${STORY_REPORT_SCHEMA_MAJOR}.x). Upgrade the package.`,
        code: "SCHEMA_VERSION_MISMATCH",
      });
    }
  }

  const parsed = storyReportSchema.safeParse(input);
  if (parsed.success) {
    return ok(parsed.data as StoryReport);
  }

  const issues = parsed.error.issues.map((i) => ({
    path: i.path.join(".") || "/",
    message: i.message,
  }));

  return err({
    message: `StoryReport failed validation (${issues.length} issue${issues.length === 1 ? "" : "s"}).`,
    code: "VALIDATION_FAILED",
    issues,
  });
}

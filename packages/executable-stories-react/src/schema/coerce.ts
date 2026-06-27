/**
 * coerceStoryReport — the client-island counterpart to parseStoryReport.
 *
 * The standalone HTML report embeds a StoryReport that the CLI/SSR pipeline has
 * ALREADY validated with the full Zod schema before serialising it. Re-running
 * that validation in the browser is pure waste: it re-checks data we produced
 * milliseconds earlier and drags ~315kb of zod + every locale error map into
 * the inlined island (≈ half the bundle).
 *
 * So the island does the two cheap checks that actually protect the render —
 * "is it an object?" and "is the schema major one we understand?" — and trusts
 * the server for the rest. The full Zod validator stays at the Node/SSR
 * boundary via parseStoryReport for untrusted input (files, fetch bodies).
 */

import type { StoryReport } from "executable-stories-core";
import type { Result } from "../result";
import { ok, err } from "../result";
import { STORY_REPORT_SCHEMA_MAJOR } from "./version";

export function coerceStoryReport(input: unknown): Result<StoryReport> {
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

  return ok(input as StoryReport);
}

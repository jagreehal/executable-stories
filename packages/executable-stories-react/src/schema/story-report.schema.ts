/**
 * StoryReport runtime Zod schema, derived from the canonical JSON Schema
 * at executable-stories-core/schemas/story-report-v1.json.
 *
 * Uses z.fromJSONSchema (experimental in Zod 4.x). If the API changes upstream,
 * only this file needs updating — the rest of the package consumes
 * `storyReportSchema` and `StoryReportSchemaShape` via parse.ts.
 *
 * The JSON Schema is bundled at build time by tsup (resolveJsonModule).
 */

import { z } from "zod";
import schemaJson from "executable-stories-core/schemas/story-report-v1.json" with { type: "json" };

export { STORY_REPORT_SCHEMA_MAJOR } from "./version";

// z.fromJSONSchema (experimental in Zod 4.x) can't translate DocHtml's nested
// `oneOf` (the exactly-one-of path/url/content constraint) and rejects every
// html doc entry. The on-disk schema keeps that constraint for Ajv + the
// machine contract; here we drop it from the in-memory copy the runtime
// validator is built from. The React DocHtml component already resolves
// precedence (content → url → path), so the looser runtime check is safe.
const schemaForZod = structuredClone(schemaJson) as {
  $defs?: { DocHtml?: { oneOf?: unknown } };
};
if (schemaForZod.$defs?.DocHtml) {
  delete schemaForZod.$defs.DocHtml.oneOf;
}

const compiled = z.fromJSONSchema(schemaForZod as Parameters<typeof z.fromJSONSchema>[0]);

export const storyReportSchema = compiled;
export type StoryReportSchemaShape = z.infer<typeof compiled>;

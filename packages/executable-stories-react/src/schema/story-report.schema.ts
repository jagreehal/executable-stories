/**
 * StoryReport runtime Zod schema, derived from the canonical JSON Schema
 * at executable-stories-formatters/schemas/story-report-v1.json.
 *
 * Uses z.fromJSONSchema (experimental in Zod 4.x). If the API changes upstream,
 * only this file needs updating — the rest of the package consumes
 * `storyReportSchema` and `StoryReportSchemaShape` via parse.ts.
 *
 * The JSON Schema is bundled at build time by tsup (resolveJsonModule).
 */

import { z } from "zod";
import schemaJson from "../../../executable-stories-formatters/schemas/story-report-v1.json" with { type: "json" };

const compiled = z.fromJSONSchema(schemaJson as Parameters<typeof z.fromJSONSchema>[0]);

export const storyReportSchema = compiled;
export type StoryReportSchemaShape = z.infer<typeof compiled>;

export const STORY_REPORT_SCHEMA_MAJOR = 1 as const;

/**
 * The supported StoryReport schema major version, factored out of
 * story-report.schema.ts so the client island can do a cheap version check
 * WITHOUT importing the Zod schema module (which evaluates z.fromJSONSchema at
 * module load and pulls ~315kb of zod + locales into the bundle).
 */
export const STORY_REPORT_SCHEMA_MAJOR = 1 as const;

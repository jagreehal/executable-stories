/**
 * Anti-Corruption Layer (ACL) - Layer 2: barrel.
 *
 * The implementation lives in the modules below; this file only re-exports it,
 * because `converters/acl/index` is a published subpath consumers already
 * import. New code should import the concrete module instead.
 */

export { canonicalizeRun } from "./canonicalize.js";
export { normalizeStatus } from "./status.js";
export { generateTestCaseId, generateRunId, slugify } from "./ids.js";
export { deriveStepResults, mergeStepResults } from "./steps.js";
export { resolveAttachment, resolveAttachments } from "./attachments.js";

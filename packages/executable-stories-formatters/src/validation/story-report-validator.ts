/**
 * JSON Schema validation for StoryReport using Ajv.
 *
 * Source of truth is executable-stories-core/schemas/story-report-v1.json (the
 * canonical cross-package StoryReport contract). This validator is used
 * both at CLI emission time (sanity-check what we produce) and as the
 * reference Ajv compile target for downstream consumers.
 */

import Ajv from "ajv/dist/2020.js";
import schema from "executable-stories-core/schemas/story-report-v1.json" with { type: "json" };

export interface StoryReportValidationResult {
  valid: boolean;
  errors: string[];
}

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

export function validateStoryReport(data: unknown): StoryReportValidationResult {
  const valid = validate(data);
  if (valid) return { valid: true, errors: [] };

  const errors = (validate.errors ?? []).map((err: { instancePath?: string; message?: string; keyword?: string; params?: Record<string, unknown> }) => {
    const path = err.instancePath || "/";
    const message = err.message ?? "unknown error";
    if (err.keyword === "additionalProperties") {
      const extra = (err.params as { additionalProperty?: string }).additionalProperty;
      return `${path}: ${message} — '${extra}'`;
    }
    if (err.keyword === "enum") {
      const allowed = (err.params as { allowedValues?: unknown[] }).allowedValues;
      return `${path}: ${message} — allowed: ${JSON.stringify(allowed)}`;
    }
    return `${path}: ${message}`;
  });

  return { valid: false, errors };
}

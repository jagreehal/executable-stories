/**
 * JSON Schema validation for RawRun using Ajv.
 *
 * Validates raw JSON input against the raw-run.schema.json schema
 * before it enters the ACL pipeline.
 */

import Ajv from "ajv/dist/2020.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const schema = require("../../schemas/raw-run.schema.json");

/** Validation result with JSON-path-based error messages */
export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

// Compile once, reuse across calls
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

/**
 * Validate raw JSON data against the RawRun schema.
 *
 * Returns JSON-path-based error messages for easy debugging
 * from any language.
 */
export function validateRawRun(data: unknown): SchemaValidationResult {
  const valid = validate(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validate.errors ?? []).map((err: { instancePath?: string; message?: string; keyword?: string; params?: Record<string, unknown> }) => {
    const path = err.instancePath || "/";
    const message = err.message ?? "unknown error";

    if (err.keyword === "additionalProperties") {
      const extra = (err.params as { additionalProperty?: string })
        .additionalProperty;
      return `${path}: ${message} — '${extra}'`;
    }

    if (err.keyword === "enum") {
      const allowed = (err.params as { allowedValues?: unknown[] })
        .allowedValues;
      return `${path}: ${message} — allowed: ${JSON.stringify(allowed)}`;
    }

    return `${path}: ${message}`;
  });

  return { valid: false, errors };
}

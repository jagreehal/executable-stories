/**
 * JSON Schema validation for RawRun using Ajv.
 *
 * Validates raw JSON input against the raw-run.schema.json schema
 * before it enters the ACL pipeline.
 */

import Ajv from "ajv/dist/2020.js";
import schema from "../../schemas/raw-run.schema.json" with { type: "json" };

/** Validation result with JSON-path-based error messages */
export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  /** With `tolerateUnknown`: the strict contract failed, but only on fields or doc kinds it does not know. */
  ignoredUnknown?: boolean;
}

// Compile once, reuse across calls
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

/**
 * The same contract with unknown properties and unknown doc kinds allowed (the
 * ACL drops those kinds). Adapters release on their own schedule, so the CLI
 * reads a newer adapter's run. Enums and required fields stay strict.
 */
const knownDocKinds = (schema.$defs.DocEntry.oneOf as Array<{ properties: { kind: { const: string } } }>)
  .map((branch) => branch.properties.kind.const);
const tolerantSchema = JSON.parse(JSON.stringify(schema), (key, value) =>
  key === "additionalProperties" && value === false ? undefined : value,
);
tolerantSchema.$defs.DocEntry.oneOf.push({
  type: "object",
  required: ["kind"],
  properties: { kind: { type: "string", not: { enum: knownDocKinds } } },
});
const validateTolerant = new Ajv({ allErrors: true }).compile(tolerantSchema);

/**
 * Validate raw JSON data against the RawRun schema.
 *
 * Returns JSON-path-based error messages for easy debugging
 * from any language.
 */
export function validateRawRun(
  data: unknown,
  options: { tolerateUnknown?: boolean } = {},
): SchemaValidationResult {
  const valid = validate(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  // `format` reads what a newer adapter added; `validate` stays strict and
  // lists every unknown field.
  if (options.tolerateUnknown && validateTolerant(data)) {
    return { valid: true, errors: [], ignoredUnknown: true };
  }

  return { valid: false, errors: formatErrors(validate.errors) };
}

function formatErrors(errors: typeof validate.errors): string[] {
  return (errors ?? []).map((err: { instancePath?: string; message?: string; keyword?: string; params?: Record<string, unknown> }) => {
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
}

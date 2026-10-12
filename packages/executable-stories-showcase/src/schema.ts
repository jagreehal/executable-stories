import { z } from 'zod';

/** Scenarios live in JSON files and URLs, so everything they carry is JSON. */
export const JsonSchema = z.json();

export type Json = z.output<typeof JsonSchema>;

export type JsonObject = { [key: string]: Json; };

/** Anything an app can hand over to be stored as JSON. */
export type Serializable = object | string | number | boolean | null;

/**
 * Decode JSON text. Pair with `JSON.stringify` to copy app state into the format scenarios
 * are stored in: functions and undefined drop out, and the result is checked to be JSON.
 */
export const parseJson = (text: string): Json => JsonSchema.parse(JSON.parse(text));

export const MethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

const ResponseSchema = z
  .object({
    status: z.number().int().default(200),
    /** Sent as JSON. */
    body: JsonSchema.optional(),
    /** Sent as text, e.g. an HTML error page. */
    text: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    /** Milliseconds, or "infinite" to hold the request open (loading states). */
    delay: z.union([z.number().nonnegative(), z.literal('infinite')]).optional(),
  })
  .refine((r) => r.body === undefined || r.text === undefined, {
    message: 'Provide "body" (JSON) or "text", not both',
  });

const NetworkEntrySchema = z
  .object({
    method: MethodSchema.default('GET'),
    /** MSW path syntax: "/api/users/:id", absolute URLs and wildcards work. */
    path: z.string().min(1),
    /** Only match requests whose query string contains these values. */
    query: z.record(z.string(), z.string()).optional(),
    response: ResponseSchema.optional(),
    /** Successive responses for successive calls; the last one repeats. */
    sequence: z.array(ResponseSchema).min(1).optional(),
    /** Drop the inherited entry with the same method, path and query. */
    remove: z.literal(true).optional(),
  })
  .refine((e) => [e.response, e.sequence, e.remove].filter(Boolean).length === 1, {
    message: 'Provide exactly one of "response", "sequence" or "remove"',
  });

export const ScenarioSchema = z.object({
  $schema: z.string().optional(),
  // Kebab-case; a combined scenario is named by its parts, e.g. "signed-in,server-error".
  name: z.string().regex(/^[a-z0-9][a-z0-9-]*(,[a-z0-9][a-z0-9-]*)*$/, 'Use kebab-case, e.g. "empty-search"'),
  /** Not inherited. */
  description: z.string().optional(),
  /** Not inherited. */
  tags: z.array(z.string()).optional(),
  /** Scenario name(s) to build on. Later parents override earlier ones. */
  extends: z.union([z.string(), z.array(z.string())]).optional(),
  /** App route the scenario opens at, e.g. "/orders/42". Used by links, the panel, `shoot` and `openInlineScenario`. */
  path: z.string().startsWith('/').optional(),
  /** Query params the app should start with. null removes an inherited param. */
  url: z.record(z.string(), z.string().nullable()).optional(),
  /**
   * A child entry replaces the inherited entry with the same method, path and query.
   * Otherwise earlier entries win, and a scenario's own entries come before its parents'.
   */
  network: z.array(NetworkEntrySchema).optional(),
  /**
   * Names of MSW handlers passed to `startScenarios({ handlers })`, e.g. ones your unit tests
   * already use. They answer after this scenario's `network` entries. Inherited and combined.
   */
  handlers: z.array(z.string().min(1)).optional(),
  /** Per-adapter state, keyed by adapter key. Objects deep-merge; null removes a key. */
  state: z.record(z.string(), JsonSchema).optional(),
  /**
   * Playwright selector that is visible once the UI shows this state,
   * e.g. "text=Loading countries…". Not inherited: each state looks different.
   */
  ready: z.string().optional(),
  /** Browser size `shoot` and `record` use for this scenario, e.g. a phone layout. Inherited. */
  viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).optional(),
});

export type Scenario = z.output<typeof ScenarioSchema>;

export type ScenarioInput = z.input<typeof ScenarioSchema>;

export type NetworkEntry = z.output<typeof NetworkEntrySchema>;

export type ScenarioResponse = z.output<typeof ResponseSchema>;

/**
 * JSON Schema for editors, validators and AI generators.
 * Pass adapter state schemas so `state` is described too.
 */
export function scenarioJsonSchema({ state = {} }: { state?: Record<string, z.ZodType>; } = {}) {
  return z.toJSONSchema(
    ScenarioSchema.extend({ state: z.object(state).partial().catchall(JsonSchema).optional() }),
    {
      io: 'input',
      // Refinements aren't representable in JSON Schema; spell the exclusivity rules out.
      override: ({ zodSchema, jsonSchema }) => {
        if (zodSchema === NetworkEntrySchema) {
          jsonSchema.oneOf = ['response', 'sequence', 'remove'].map((key) => ({ required: [key] }));
        }

        if (zodSchema === ResponseSchema) {
          jsonSchema.not = { required: ['body', 'text'] };
        }
      },
    },
  );
}

/** Validate scenario input (from a file, URL or editor) into a Scenario, with readable errors. */
export function parseScenario(data: ScenarioInput, source = 'scenario'): Scenario {
  const result = ScenarioSchema.safeParse(data);

  if (result.success) return result.data;
  throw new Error(`Invalid scenario "${data.name || source}":\n${z.prettifyError(result.error)}`);
}

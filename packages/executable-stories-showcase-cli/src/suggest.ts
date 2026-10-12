import { BadRequestError } from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/beta/messages';
import Ajv2020 from 'ajv/dist/2020.js';
import { type Catalog, parseScenario, type Scenario, type ScenarioInput } from 'executable-stories-showcase';
import { z } from 'zod';

export const DEFAULT_MODEL = 'claude-opus-5-5';

export const SuggestionSchema = z.object({
  states: z.array(
    z.object({
      area: z.string().describe('Screen or component, e.g. "country list"'),
      state: z.string().describe('The observable state, e.g. "empty after filtering"'),
      evidence: z.string().describe('file:line, or the code that produces this state'),
      covered_by: z.string().nullable().describe('Name of an existing scenario that shows it, or null'),
      priority: z.enum(['high', 'medium', 'low']),
    }),
  ),
  proposals: z.array(
    z.object({
      scenario_json: z.string().describe('One complete scenario, as a JSON string'),
      covers: z.string().describe('Which detected state this shows, as "area / state"'),
      rationale: z.string(),
    }),
  ),
});

export type Suggestion = z.output<typeof SuggestionSchema>;

export interface SourceFile {
  path: string;
  content: string;
}

/** The one SDK call suggest makes. The Anthropic client satisfies it; tests can fake it. */
export interface SuggestClient {
  beta: { messages: { parse(params: MessageCreateParamsNonStreaming): PromiseLike<SuggestReply>; }; };
}

interface SuggestReply {
  stop_reason: string | null;
  stop_details?: { explanation?: string | null; } | null;
  /** Decoded with SuggestionSchema either way; structured output only makes it likelier to pass. */
  parsed_output?: unknown;
  content: ReadonlyArray<{ type: string; text?: string; }>;
}

export interface SuggestResult {
  states: Suggestion['states'];
  accepted: { scenario: Scenario; covers: string; rationale: string; }[];
  rejected: { json: string; covers: string; error: string; }[];
}

const SYSTEM =
  `You find user-visible UI states in a web app's source code and map them to scenarios. A scenario is a JSON file that puts the running app into a state by mocking API responses, setting URL params, and seeding client state.

Report candidate observable states: loading, empty, error, recovery, partial or boundary data (pagination edges, long text, missing optional fields), permission or flag variants, and combinations of these. You will not find every state, and the report should not imply you did; prioritise states a real user could plausibly hit. For each state, cite evidence from the code, and name the existing scenario that already shows it, or null.

Then propose scenarios for the most valuable uncovered states. Each proposal must validate against the provided JSON Schema. It should "extends" an existing scenario rather than repeat that scenario's fixtures, mock only endpoints the code calls, and set "ready" to a Playwright selector for text the UI renders in that state, taken from the source. Use new kebab-case names.`;

/**
 * Ask Claude which UI states the code can produce and which scenarios are missing,
 * then keep only proposals that validate, resolve and pass the catalog's rules.
 */
export async function suggestScenarios(
  {
    sources,
    catalog,
    jsonSchema,
    max = 8,
    model = DEFAULT_MODEL,
  }: { sources: SourceFile[]; catalog: Catalog; jsonSchema: object; max?: number; model?: string; },
  { client }: { client: SuggestClient; },
): Promise<SuggestResult> {
  const prompt = [
    `<scenario_json_schema>\n${JSON.stringify(jsonSchema, null, 2)}\n</scenario_json_schema>`,
    `<existing_scenarios>\n${JSON.stringify(catalog.list.map(summarize), null, 2)}\n</existing_scenarios>`,
    ...sources.map((f) => `<source path="${f.path}">\n${f.content}\n</source>`),
    `List the candidate UI states, then propose at most ${max} new scenarios for the most valuable uncovered ones.`,
    `Reply with only a JSON object matching this schema:\n${
      JSON.stringify(z.toJSONSchema(SuggestionSchema))
    }`,
  ].join('\n\n');

  const isClaude = model.startsWith('claude-');

  const params = {
    model,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: 'user' as const, content: prompt }],
    // Claude only. Server-side fallback: if a safety classifier declines, the API retries on another model.
    ...(isClaude && {
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default' as const,
      output_config: { effort: 'high' as const },
    }),
  };

  let response;

  try {
    response = await client.beta.messages.parse({
      ...params,
      output_config: { ...params.output_config, format: betaZodOutputFormat(SuggestionSchema) },
    });
  } catch (err) {
    // Anthropic-compatible proxies serving other models don't all support structured
    // outputs; the prompt asks for JSON anyway, so retry and parse the text.
    if (!(err instanceof BadRequestError)) throw err;
    response = await client.beta.messages.parse(params);
  }

  if (response.stop_reason === 'refusal') {
    throw new Error(`${model} declined: ${response.stop_details?.explanation ?? 'no explanation given'}`);
  }

  if (response.stop_reason === 'max_tokens') {
    throw new Error('Response hit max_tokens; narrow --src or lower --max');
  }

  const output = parseSuggestion(response);

  // The supplied schema can be stricter than the built-in one (e.g. adapter state shapes).
  const matchesSchema = new Ajv2020({ strict: false }).compile<ScenarioInput>(jsonSchema);
  const result: SuggestResult = { states: output.states, accepted: [], rejected: [] };
  const taken = new Set(catalog.list.map((s) => s.name));

  for (const { scenario_json: json, covers, rationale } of output.proposals) {
    try {
      const data = JSON.parse(json);

      if (!matchesSchema(data)) {
        throw new Error(`Does not match the JSON Schema: ${new Ajv2020().errorsText(matchesSchema.errors)}`);
      }

      const scenario = parseScenario(data, 'proposal');

      if (taken.has(scenario.name)) throw new Error(`Name "${scenario.name}" is already taken`);
      catalog.resolve(scenario); // parents exist, rules pass
      taken.add(scenario.name);
      result.accepted.push({ scenario, covers, rationale });
    } catch (err) {
      result.rejected.push({ json, covers, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return result;
}

/** Decode the reply: structured output when the API gave it, else JSON pulled out of the text. */
function parseSuggestion(reply: SuggestReply): Suggestion {
  const text = reply.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const result = SuggestionSchema.safeParse(reply.parsed_output ?? (json ? JSON.parse(json) : null));

  if (!result.success) {
    throw new Error(`Reply does not match the suggestion schema:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
}

/** What the model needs to know about a scenario, without full fixture bodies. */
export function summarize(s: Scenario) {
  return {
    name: s.name,
    description: s.description,
    tags: s.tags,
    extends: s.extends,
    url: s.url,
    ready: s.ready,
    state: s.state && Object.keys(s.state),
    network: s.network?.map((e) => ({
      method: e.method,
      path: e.path,
      query: e.query,
      remove: e.remove,
      responses: (e.sequence ?? (e.response ? [e.response] : [])).map((r) => ({
        status: r.status,
        delay: r.delay,
        body: Array.isArray(r.body) ? { items: r.body.length, first: r.body[0] } : r.body,
      })),
    })),
  };
}

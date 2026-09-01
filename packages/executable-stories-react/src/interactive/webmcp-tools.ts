'use client';

/**
 * WebMCP tools the HTML report registers in the reader's own browser.
 *
 * The report already has an agent channel for coding agents: the MCP server and
 * the StoryReport JSON, both of which need a filesystem. This is the channel for
 * the reader who has neither — someone with a browser agent open, pointed at a
 * shared report URL or a self-contained `report.html`, asking it questions.
 *
 * Four reads and one view-driving tool. The reads answer from the report the
 * page already holds. `filter_scenarios` drives the same URL-fragment state the
 * search box and filter pills write, so an agent asked to "show the failing
 * checkout scenarios" changes what the reader is looking at.
 *
 * Deliberately NOT here, and staying MCP-only:
 * - `get_scenario_index` / `get_behavior_manifest` — both route through
 *   `scenarioContentHash`, which is node-only (`node:crypto`) and must never
 *   enter a browser bundle.
 * - `run_scenario` — a static page has no backend to run tests on.
 *
 * The four reads mirror the MCP server's names and payload shapes; the shared
 * projections live in `executable-stories-core/report-queries` so the two
 * transports cannot answer the same question differently.
 */

import {
  getFeatureSummary,
  getScenario,
  listScenarioSummaries,
  runProvenance,
  toScenarioSummary,
  type ScenarioFilters,
} from 'executable-stories-core/report-queries';
import type {
  StoryReport,
  TestStatus,
} from 'executable-stories-core/types/story-report';
import type { ToolDef } from 'webmcpable';
import type { ReportUrlState, UrlStatusFilter } from '../lib/hash-state';
import { filterReport, type StatusFilter } from './filter';

const STATUSES: readonly TestStatus[] = [
  'passed',
  'failed',
  'skipped',
  'pending',
];
const VIEW_STATUSES: readonly UrlStatusFilter[] = ['all', ...STATUSES];

/**
 * Every payload carries this.
 *
 * A report is a snapshot, and a reader asking questions of a three-week-old
 * `report.html` has no way to tell it from this morning's. Without the run's
 * age in the answer, an agent relays a long-dead failure as current fact.
 */
export interface WithRun {
  run: ReturnType<typeof runProvenance>;
}

export interface ReportToolsDeps {
  /** The whole report, unfiltered — reads always answer from all of it. */
  report: StoryReport;
  /** Current view state, so `filter_scenarios` can patch rather than replace. */
  view: ReportUrlState;
  setView: (patch: Partial<ReportUrlState>) => void;
  /**
   * Called when an agent changes the view, so the UI can say so. The reader
   * sees the list change; this is what tells them why.
   */
  onAgentFilter?: (applied: AppliedFilter) => void;
  /** Injected for tests. Defaults to `Date.now`. */
  now?: () => number;
}

export interface AppliedFilter {
  search: string;
  status: UrlStatusFilter;
  tags: string[];
  matched: number;
  total: number;
}

/**
 * A raw JSON Schema is a description, not a validator: webmcpable enforces the
 * top-level `required` list and nothing else. Anything an agent can get wrong
 * inside an optional field has to be checked here, and reported by RETURNING a
 * message — Chrome replaces a thrown error with a generic `UnknownError`, so a
 * throw teaches the agent nothing.
 */
class ToolArgumentError extends Error {}

/**
 * The handler signature erases the input type (the registry holds a union of
 * tool definitions), and a raw JSON Schema is not a parser, so the argument
 * really is unknown here. Narrow once, at the boundary.
 */
function asRecord(input: unknown): Record<string, unknown> {
  return typeof input === 'object' && input !== null
    ? (input as Record<string, unknown>)
    : {};
}

function readString(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new ToolArgumentError(`"${key}" must be a string, received ${typeof value}.`);
  }
  return value;
}

function readStringArray(
  input: Record<string, unknown>,
  key: string,
): string[] | undefined {
  const value = input[key];
  if (value === undefined || value === null) return undefined;
  // A single tag as a bare string is the mistake an agent actually makes, and
  // the intent is unambiguous. Accept it rather than refusing the call.
  if (typeof value === 'string') return [value];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new ToolArgumentError(`"${key}" must be an array of strings.`);
  }
  return value as string[];
}

function readEnum<T extends string>(
  input: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = readString(input, key);
  if (value === undefined) return undefined;
  if (!allowed.includes(value as T)) {
    throw new ToolArgumentError(
      `"${key}" must be one of: ${allowed.join(', ')}. Received "${value}".`,
    );
  }
  return value as T;
}

function readStatuses(input: Record<string, unknown>): TestStatus[] | undefined {
  const values = readStringArray(input, 'statuses');
  if (values === undefined) return undefined;
  const invalid = values.filter((v) => !STATUSES.includes(v as TestStatus));
  if (invalid.length > 0) {
    throw new ToolArgumentError(
      `"statuses" must contain only: ${STATUSES.join(', ')}. Received "${invalid.join('", "')}".`,
    );
  }
  return values as TestStatus[];
}

/** Turns an argument mistake into text the agent can act on, not a dead call. */
function guarded<T>(run: () => T): T | string {
  try {
    return run();
  } catch (error) {
    if (error instanceof ToolArgumentError) return `Invalid input — ${error.message}`;
    throw error;
  }
}

const scenarioListSchema = {
  type: 'object',
  properties: {
    statuses: {
      type: 'array',
      items: { type: 'string', enum: [...STATUSES] },
      description: 'Keep only scenarios with any of these statuses.',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Keep only scenarios carrying any of these tags.',
    },
    sourceFiles: {
      type: 'array',
      items: { type: 'string' },
      description: 'Keep only scenarios whose source file path contains any of these.',
    },
  },
} as const;

/**
 * `readOnlyHint` keeps the reads out of any confirmation flow.
 * `untrustedContentHint` is the one that matters: scenario titles, step text and
 * assertion messages are written in someone's test suite, and a report can carry
 * whatever a fixture put there. It is data for the model to read about, never
 * instructions for it to follow.
 */
const READ_ONLY = { readOnlyHint: true, untrustedContentHint: true } as const;

export function reportTools(deps: ReportToolsDeps): Record<string, ToolDef> {
  const { report, setView, onAgentFilter } = deps;
  const now = deps.now ?? Date.now;
  const provenance = (): WithRun => ({ run: runProvenance(report, now()) });

  const list = (filters: ScenarioFilters) => {
    const scenarios = listScenarioSummaries(report, filters);
    return { ...provenance(), total: scenarios.length, scenarios };
  };

  return {
    list_scenarios: {
      title: 'List scenarios',
      description:
        'List the behaviour scenarios in this report, optionally filtered by status, tag, or source file. Returns each scenario with its steps, tags, timing and failure message.',
      annotations: READ_ONLY,
      input: scenarioListSchema,
      execute: (input) =>
        guarded(() => {
          const args = asRecord(input);
          const filters: ScenarioFilters = {};
          const statuses = readStatuses(args);
          const tags = readStringArray(args, 'tags');
          const sourceFiles = readStringArray(args, 'sourceFiles');
          if (statuses) filters.statuses = statuses;
          if (tags) filters.tags = tags;
          if (sourceFiles) filters.sourceFiles = sourceFiles;
          return list(filters);
        }),
    },

    get_failing_scenarios: {
      title: 'Get failing scenarios',
      description:
        'List only the scenarios that failed in this run, each with the step that failed and its error message. Use this first when asked what is broken.',
      annotations: READ_ONLY,
      execute: () => list({ statuses: ['failed'] }),
    },

    get_feature_summary: {
      title: 'Get feature summary',
      description:
        'Summarise each feature in the report with its scenario counts by status. Use this for "how are we doing" questions rather than listing every scenario.',
      annotations: READ_ONLY,
      execute: () => ({
        ...provenance(),
        summary: report.summary,
        features: getFeatureSummary(report),
      }),
    },

    get_scenario: {
      title: 'Get scenario',
      description:
        'Get one scenario by its id or its exact title, with every step and any failure detail. Attachment and document bodies are omitted — `docKinds` names what the page shows.',
      annotations: READ_ONLY,
      input: {
        type: 'object',
        properties: {
          idOrTitle: {
            type: 'string',
            description: 'The scenario id, or its exact title as shown in the report.',
          },
        },
        required: ['idOrTitle'],
      },
      execute: (input) =>
        guarded(() => {
          const idOrTitle = readString(asRecord(input), 'idOrTitle') ?? '';
          const found = getScenario(report, idOrTitle);
          if (!found) {
            return {
              ...provenance(),
              error: `No scenario found with id or title "${idOrTitle}". Call list_scenarios to see what this report contains.`,
            };
          }
          return {
            ...provenance(),
            feature: {
              id: found.feature.id,
              title: found.feature.title,
              sourceFile: found.feature.sourceFile,
            },
            // The summary projection, not the raw scenario: doc entry bodies and
            // base64 attachments are unbounded, and this payload goes straight
            // into a model's context window.
            scenario: toScenarioSummary(found.feature, found.scenario),
          };
        }),
    },

    filter_scenarios: {
      title: 'Filter the report',
      description:
        'Change what the reader is looking at: set the report\'s search text, status filter and tag filter. Omitted fields are left as they are; pass an empty string, "all", or an empty array to clear one.',
      input: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description:
              'Free text matched against scenario titles, tags and step text. Empty string clears it.',
          },
          status: {
            type: 'string',
            enum: [...VIEW_STATUSES],
            description: 'Show only scenarios with this status. "all" clears the filter.',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Show only scenarios carrying any of these tags. Empty array clears the filter.',
          },
        },
      },
      execute: (input) =>
        guarded(() => {
          const args = asRecord(input);
          const search = readString(args, 'search');
          const status = readEnum(args, 'status', VIEW_STATUSES);
          const tags = readStringArray(args, 'tags');

          const applied = {
            search: search ?? deps.view.query,
            status: status ?? deps.view.status,
            tags: tags ?? deps.view.tags,
          };

          const patch: Partial<ReportUrlState> = {};
          if (search !== undefined) patch.query = search;
          if (status !== undefined) patch.status = status;
          if (tags !== undefined) patch.tags = tags;
          setView(patch);

          // Counted with the same function the list itself renders through, so
          // the number the agent reports back cannot disagree with the screen.
          const matched = filterReport(report, {
            query: applied.search,
            status: applied.status as StatusFilter,
            tags: applied.tags,
          }).summary.total;

          const result: AppliedFilter = {
            ...applied,
            matched,
            total: report.summary.total,
          };
          onAgentFilter?.(result);
          return { ...provenance(), applied: result };
        }),
    },
  };
}

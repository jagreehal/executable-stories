import type { TestCaseResult, TestRunResult } from "executable-stories-core/types/test-result";

import type { CaseBody, RemoteCase, SyncProvider } from "../../src/sync/port";

export function makeCase(overrides: Partial<TestCaseResult> = {}): TestCaseResult {
  return {
    id: "tc-1",
    story: {
      scenario: "User signs in",
      steps: [
        { keyword: "Given", text: "a registered user" },
        { keyword: "When", text: "they submit valid credentials" },
        { keyword: "Then", text: "they reach the dashboard" },
      ],
      tags: [],
      suitePath: [],
      sourceOrder: 1,
      ...(overrides.story ?? {}),
    },
    sourceFile: "src/auth.story.test.ts",
    sourceLine: 1,
    status: "passed",
    durationMs: 1200,
    attachments: [],
    stepResults: [],
    titlePath: [],
    retry: 0,
    retries: 0,
    tags: [],
    ...overrides,
  };
}

export function makeRun(testCases: TestCaseResult[]): TestRunResult {
  return {
    testCases,
    startedAtMs: 1000,
    finishedAtMs: 2000,
    durationMs: 1000,
    projectRoot: "/project",
    runId: "run-1",
  };
}

export function makeBody(overrides: Partial<CaseBody> = {}): CaseBody {
  return {
    title: "User signs in",
    steps: [{ keyword: "Given", text: "a registered user" }],
    description: "",
    links: [],
    ...overrides,
  };
}

export interface FakeProviderOptions {
  cases?: RemoteCase[];
  /** Omit capabilities to simulate a read-only provider. */
  readOnly?: boolean;
  maxAttachmentBytes?: number;
}

export interface FakeProvider extends SyncProvider {
  created: CaseBody[];
  updated: Array<{ id: string; body: CaseBody }>;
  recorded: unknown[];
}

export function fakeProvider(options: FakeProviderOptions = {}): FakeProvider {
  const cases = options.cases ?? [];
  let nextId = 900;

  const provider: FakeProvider = {
    name: "fake",
    created: [],
    updated: [],
    recorded: [],
    maxAttachmentBytes: options.maxAttachmentBytes,
    describeTarget: () => "Fake project",
    listCases: async () => cases,
  };

  if (!options.readOnly) {
    provider.createCase = async (body) => {
      provider.created.push(body);
      nextId += 1;
      return { id: String(nextId), url: `https://fake/${nextId}`, title: body.title, body };
    };
    provider.updateCase = async (id, body) => {
      provider.updated.push({ id, body });
      return { id, url: `https://fake/${id}`, title: body.title, body };
    };
    provider.recordResults = async (results) => {
      provider.recorded.push(...results);
      return {
        recorded: results.length,
        skipped: [],
        attachmentsUploaded: results.reduce((sum, r) => sum + (r.attachments?.length ?? 0), 0),
      };
    };
  }

  return provider;
}

/** Route fetch calls by URL substring, so adapter tests never touch a network. */
export function routedFetch(
  routes: Array<{ match: string; status?: number; body: unknown; headers?: Record<string, string> }>,
): { fetch: typeof globalThis.fetch; calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });

    const route = routes.find((candidate) => url.includes(candidate.match));
    if (!route) {
      return new Response(JSON.stringify({ error: `no route for ${url}` }), { status: 404 });
    }

    const body = typeof route.body === "string" ? route.body : JSON.stringify(route.body);
    return new Response(body, {
      status: route.status ?? 200,
      headers: route.headers,
    });
  }) as typeof globalThis.fetch;

  return { fetch: fetchFn, calls };
}

export const silentLogger = { warn: () => {} };
